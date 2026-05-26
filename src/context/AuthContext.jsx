import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../data/api'

const AuthContext = createContext(null)

// Access token lives 1 hour. Refresh 5 min before expiry.
// Mobile browsers kill JS timers when backgrounded, so visibilitychange
// handles the case where we return after the timer should have fired.
const BUFFER_MS = 5 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef   = useRef(null)
  const inFlightRef = useRef(null)  // deduplicate concurrent refreshes

  function getExpiry(token) {
    try { return JSON.parse(atob(token.split('.')[1])).exp * 1000 } catch { return null }
  }

  // ── Core refresh — deduped, no rotation on server ────────────
  const doRefresh = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current
    inFlightRef.current = api.refresh()
      .then(data => {
        localStorage.setItem('lumen_token', data.token)
        setUser(data.user)
        scheduleNext(data.token)
        return data.token
      })
      .catch(err => {
        // Only log out on definitive 401. Ignore network errors, 5xx, 429.
        if (err?.status === 401) {
          localStorage.removeItem('lumen_token')
          setUser(null)
          clearTimer()
        }
        return null
      })
      .finally(() => { inFlightRef.current = null })
    return inFlightRef.current
  }, []) // eslint-disable-line

  function scheduleNext(token) {
    clearTimer()
    const expiry = getExpiry(token)
    if (!expiry) return
    const delay = Math.max(expiry - Date.now() - BUFFER_MS, 30 * 1000)
    timerRef.current = setTimeout(doRefresh, delay)
  }

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  // Expose for api.js auto-retry on 401
  useEffect(() => { window.__lumenRefresh = doRefresh }, [doRefresh])
  useEffect(() => () => clearTimer(), [])

  // ── Visibility + network — refresh aggressively on mobile ────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getExpiry(token) : null

      // Always refresh if:
      // - No token at all (localStorage was cleared by iOS)
      // - Token expired or within 5 minutes of expiry
      // Using 5 min buffer (vs 2 min) to account for mobile timer drift
      const MOBILE_BUFFER = 5 * 60 * 1000
      if (!expiry || expiry - Date.now() < MOBILE_BUFFER) {
        doRefresh()
      }
    }

    // Fire on reconnect too — mobile drops wifi/cell then reconnects
    function onOnline() {
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getExpiry(token) : null
      if (!expiry || expiry - Date.now() < 60 * 1000) {
        doRefresh()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [doRefresh])

  // ── Mount ─────────────────────────────────────────────────────
  useEffect(() => {
    // Handle Google OAuth redirect
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('google_token')
    if (googleToken) {
      localStorage.setItem('lumen_token', googleToken)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = localStorage.getItem('lumen_token')

    if (!token) {
      // No token — try refresh cookie (handles reload after expiry)
      doRefresh().finally(() => setLoading(false))
      return
    }

    const expiry = getExpiry(token)
    if (expiry && expiry - Date.now() < 30 * 1000) {
      // Expires in <30s — refresh immediately
      doRefresh().finally(() => setLoading(false))
      return
    }

    // Verify token with server
    api.me()
      .then(u => { setUser(u); setLoading(false); scheduleNext(token) })
      .catch(() => {
        doRefresh().finally(() => setLoading(false))
      })
  }, []) // eslint-disable-line

  // ── Auth actions ──────────────────────────────────────────────
  async function login(email, password, rememberMe = true) {
    const data = await api.login({ email, password, rememberMe })
    localStorage.setItem('lumen_token', data.token)
    // Fetch full user profile so role is included
    try {
      const fullUser = await api.me()
      setUser(fullUser)
    } catch {
      setUser(data.user)
    }
    scheduleNext(data.token)
    return data.user
  }

  async function googleLogin(credential) {
    const data = await api.googleLogin({ credential })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    scheduleNext(data.token)
    return data.user
  }

  async function register(email, password, name, terms_agreed = false) {
    const data = await api.register({ email, password, name, terms_agreed })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    scheduleNext(data.token)
    return data.user
  }

  function completeOnboarding() {
    setUser(prev => prev ? { ...prev, onboarding_complete: true } : prev)
  }

  async function logout() {
    clearTimer()
    try { await api.logout() } catch {}
    localStorage.removeItem('lumen_token')
    setUser(null)
  }

  async function logoutAll() {
    clearTimer()
    try { await api.logoutAll() } catch {}
    localStorage.removeItem('lumen_token')
    setUser(null)
  }

  const silentRefresh = doRefresh

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register,
      logout, logoutAll, silentRefresh, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
