import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../data/api'

const AuthContext = createContext(null)

// Access token lives 15 minutes. Refresh it proactively at 13 minutes
// so there's no gap where a request fires with an expired token.
const ACCESS_TTL_MS   = 15 * 60 * 1000
const PROACTIVE_MS    = 13 * 60 * 1000   // refresh 2 min before expiry

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshPromise        = useRef(null)
  const refreshTimerRef       = useRef(null)
  const tokenExpiryRef        = useRef(null) // timestamp when current token expires

  // ── Decode JWT expiry without a library ──────────────────────
  function getTokenExpiry(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp ? payload.exp * 1000 : null // convert to ms
    } catch { return null }
  }

  // ── Silent refresh ────────────────────────────────────────────
  const silentRefresh = useCallback(async () => {
    // Deduplicate concurrent refresh calls — return the same in-flight promise
    if (refreshPromise.current) return refreshPromise.current

    refreshPromise.current = api.refresh()
      .then(data => {
        localStorage.setItem('lumen_token', data.token)
        tokenExpiryRef.current = getTokenExpiry(data.token)
        setUser(data.user)
        scheduleProactiveRefresh(data.token)
        return data.token
      })
      .catch(err => {
        // Only clear the session on definitive auth failures (401/403).
        // 429 (rate limited), network errors, 5xx = transient — do NOT log out.
        const isAuthFailure = err?.status === 401 || err?.status === 403
        const isRateLimited = err?.status === 429 || err?.rateLimited

        if (isAuthFailure) {
          localStorage.removeItem('lumen_token')
          tokenExpiryRef.current = null
          setUser(null)
          clearProactiveRefresh()
        } else {
          // Transient failure — retry after a backoff.
          // Rate limit: wait 60s. Network/server error: wait 30s.
          const retryDelay = isRateLimited ? 60 * 1000 : 30 * 1000
          const token = localStorage.getItem('lumen_token')
          if (token) {
            setTimeout(() => silentRefresh(), retryDelay)
          }
        }
        return null
      })
      .finally(() => { refreshPromise.current = null })

    return refreshPromise.current
  }, []) // eslint-disable-line

  // ── Proactive refresh timer ───────────────────────────────────
  // Schedules the next refresh 2 minutes before the token actually expires,
  // using the real expiry from the JWT instead of a fixed offset.
  function scheduleProactiveRefresh(token) {
    clearProactiveRefresh()
    const expiry = token ? getTokenExpiry(token) : tokenExpiryRef.current
    if (!expiry) return
    const msUntilRefresh = expiry - Date.now() - 2 * 60 * 1000 // 2 min buffer
    if (msUntilRefresh <= 0) {
      // Already expired or very close — refresh immediately
      silentRefresh()
      return
    }
    refreshTimerRef.current = setTimeout(() => { silentRefresh() }, msUntilRefresh)
  }

  function clearProactiveRefresh() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  // ── Visibility change handler ─────────────────────────────────
  // When user comes back to a backgrounded tab, check if the token
  // has expired while the tab was sleeping (timers get throttled).
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getTokenExpiry(token) : null
      if (!token || !expiry) {
        // No token or can't decode it — try refresh cookie
        silentRefresh()
        return
      }
      const msLeft = expiry - Date.now()
      if (msLeft < 2 * 60 * 1000) {
        // Token expires in under 2 minutes (or already expired) — refresh now
        silentRefresh()
      } else if (!refreshTimerRef.current) {
        // Timer got lost (e.g. the tab was asleep for a long time) — reschedule
        scheduleProactiveRefresh(token)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [silentRefresh])

  // Expose silentRefresh so api.js can call it on any 401
  useEffect(() => {
    window.__lumenRefresh = silentRefresh
  }, [silentRefresh])

  // Clean up timer on unmount
  useEffect(() => () => clearProactiveRefresh(), [])

  // ── On mount — verify token or refresh ───────────────────────
  useEffect(() => {
    // Handle Google OAuth redirect — token arrives as ?google_token= query param.
    // Must be handled FIRST, before any other auth check.
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('google_token')
    if (googleToken) {
      localStorage.setItem('lumen_token', googleToken)
      localStorage.setItem('lumen_remember', 'true')
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = localStorage.getItem('lumen_token')

    if (!token) {
      // No token at all — try the refresh cookie (handles page reload after expiry)
      silentRefresh().finally(() => setLoading(false))
      return
    }

    // Check if the stored token is already expired before even calling me()
    const expiry = getTokenExpiry(token)
    if (expiry && expiry - Date.now() < 30 * 1000) {
      // Expires in under 30 seconds — skip me(), go straight to refresh
      silentRefresh().finally(() => setLoading(false))
      return
    }

    // Token looks valid — verify with the server
    api.me()
      .then(u => {
        setUser(u)
        tokenExpiryRef.current = expiry
        setLoading(false)
        scheduleProactiveRefresh(token)
      })
      .catch(async () => {
        // me() failed (expired, revoked, server error) — always try refresh first
        const newToken = await silentRefresh()
        if (!newToken) {
          localStorage.removeItem('lumen_token')
          setUser(null)
        }
        setLoading(false)
      })
  }, []) // eslint-disable-line

  // ── Login ────────────────────────────────────────────────────
  async function login(email, password, rememberMe = true) {
    const data = await api.login({ email, password, rememberMe })
    localStorage.setItem('lumen_token', data.token)
    if (rememberMe) {
      localStorage.setItem('lumen_remember', 'true')
    } else {
      localStorage.removeItem('lumen_remember')
    }
    tokenExpiryRef.current = getTokenExpiry(data.token)
    setUser(data.user)
    scheduleProactiveRefresh(data.token)
    return data.user
  }

  // ── Google Login (called by AuthGate after redirect)
  async function googleLogin(credential) {
    const data = await api.googleLogin({ credential })
    localStorage.setItem('lumen_token', data.token)
    localStorage.setItem('lumen_remember', 'true')
    tokenExpiryRef.current = getTokenExpiry(data.token)
    setUser(data.user)
    scheduleProactiveRefresh(data.token)
    return data.user
  }

  // ── Register ─────────────────────────────────────────────────
  async function register(email, password, name, terms_agreed = false) {
    const data = await api.register({ email, password, name, terms_agreed })
    localStorage.setItem('lumen_token', data.token)
    tokenExpiryRef.current = getTokenExpiry(data.token)
    setUser(data.user)
    scheduleProactiveRefresh(data.token)
    return data.user
  }

  // ── Complete onboarding ───────────────────────────────────────
  function completeOnboarding() {
    setUser(prev => prev ? { ...prev, onboarding_complete: true } : prev)
  }
  async function logout() {
    clearProactiveRefresh()
    try { await api.logout() } catch {}
    localStorage.removeItem('lumen_token')
    localStorage.removeItem('lumen_remember')
    setUser(null)
  }

  async function logoutAll() {
    clearProactiveRefresh()
    try { await api.logoutAll() } catch {}
    localStorage.removeItem('lumen_token')
    localStorage.removeItem('lumen_remember')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, logout, logoutAll, silentRefresh, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
