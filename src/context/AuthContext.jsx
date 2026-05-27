import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../data/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef    = useRef(null)
  const inFlightRef = useRef(null)

  function getExpiry(token) {
    try { return JSON.parse(atob(token.split('.')[1])).exp * 1000 } catch { return null }
  }

  // ── Silent refresh — deduped ───────────────────────────────────
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
        if (err?.status === 401) {
          // Refresh cookie is gone/expired/revoked — definitive logout
          localStorage.removeItem('lumen_token')
          localStorage.removeItem('lumen_remember')
          setUser(null)
          clearTimer()
        }
        // Network/5xx — do nothing, preserve current session state
        return null
      })
      .finally(() => { inFlightRef.current = null })
    return inFlightRef.current
  }, []) // eslint-disable-line

  function scheduleNext(token) {
    clearTimer()
    const expiry = getExpiry(token)
    if (!expiry) return
    // Fire 5 min before expiry, minimum 30s
    const delay = Math.max(expiry - Date.now() - 5 * 60 * 1000, 30_000)
    timerRef.current = setTimeout(doRefresh, delay)
  }

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  useEffect(() => { window.__lumenRefresh = doRefresh }, [doRefresh])
  useEffect(() => () => clearTimer(), [])

  // ── Tab focus / network reconnect ────────────────────────────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getExpiry(token) : null
      // Refresh if token is missing, expired, or within 2 min of expiry
      if (!token || !expiry || expiry - Date.now() < 2 * 60 * 1000) {
        doRefresh()
      }
    }
    function onOnline() {
      // On reconnect, refresh only if token is already dead
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getExpiry(token) : null
      if (!token || !expiry || expiry - Date.now() < 0) doRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [doRefresh])

  // ── Mount ─────────────────────────────────────────────────────
  // Strategy: always attempt refresh on mount. The refresh endpoint checks
  // the httpOnly cookie — if it's valid, we get a fresh token and user back.
  // If there's no cookie (truly logged out), we get a 401 and show login.
  // This is the only reliable approach across Railway cold-starts, overnight
  // expiry, iOS localStorage clearing, and browser restarts.
  useEffect(() => {
    // Handle Google OAuth redirect token
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('google_token')
    if (googleToken) {
      localStorage.setItem('lumen_token', googleToken)
      localStorage.setItem('lumen_remember', 'true')
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token    = localStorage.getItem('lumen_token')
    const remember = localStorage.getItem('lumen_remember') === 'true'
    const expiry   = token ? getExpiry(token) : null
    const isAlive  = expiry && expiry - Date.now() > 0

    if (isAlive) {
      // Token is valid — verify with /me then schedule next refresh
      api.me()
        .then(u  => { setUser(u); scheduleNext(token); setLoading(false) })
        .catch(() => {
          // /me failed (network or 401) — try refresh as fallback
          doRefresh().finally(() => setLoading(false))
        })
    } else if (remember) {
      // Token expired/missing but user checked "remember me" — try refresh cookie
      doRefresh().finally(() => setLoading(false))
    } else {
      // No token, no remember flag — not logged in
      setLoading(false)
    }
  }, []) // eslint-disable-line

  // ── Auth actions ──────────────────────────────────────────────
  async function login(email, password, rememberMe = true) {
    const data = await api.login({ email, password, rememberMe })
    localStorage.setItem('lumen_token', data.token)
    localStorage.setItem('lumen_remember', rememberMe ? 'true' : 'false')
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
    localStorage.setItem('lumen_remember', 'true')
    setUser(data.user)
    scheduleNext(data.token)
    return data.user
  }

  async function register(email, password, name, terms_agreed = false) {
    const data = await api.register({ email, password, name, terms_agreed })
    localStorage.setItem('lumen_token', data.token)
    localStorage.setItem('lumen_remember', 'true')
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
    localStorage.removeItem('lumen_remember')
    setUser(null)
  }

  async function logoutAll() {
    clearTimer()
    try { await api.logoutAll() } catch {}
    localStorage.removeItem('lumen_token')
    localStorage.removeItem('lumen_remember')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register,
      logout, logoutAll, silentRefresh: doRefresh, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
