import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../data/api'

const AuthContext = createContext(null)

const BUFFER_MS = 5 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef    = useRef(null)
  const inFlightRef = useRef(null)

  function getExpiry(token) {
    try { return JSON.parse(atob(token.split('.')[1])).exp * 1000 } catch { return null }
  }

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
          // Definitive session expiry — log out
          localStorage.removeItem('lumen_token')
          localStorage.removeItem('lumen_remember')
          setUser(null)
          clearTimer()
        }
        // Network errors, 5xx — stay logged in, reschedule
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

  useEffect(() => { window.__lumenRefresh = doRefresh }, [doRefresh])
  useEffect(() => () => clearTimer(), [])

  // ── Visibility + network ──────────────────────────────────────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getExpiry(token) : null

      if (!token) {
        doRefresh()
        return
      }
      // Only hit refresh if the token is expired or within 2 min of expiry
      const TWO_MIN = 2 * 60 * 1000
      if (!expiry || expiry - Date.now() < TWO_MIN) {
        doRefresh()
      }
    }

    function onOnline() {
      const token  = localStorage.getItem('lumen_token')
      const expiry = token ? getExpiry(token) : null
      if (!expiry || expiry - Date.now() < 0) {
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
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('google_token')
    if (googleToken) {
      localStorage.setItem('lumen_token', googleToken)
      localStorage.setItem('lumen_remember', 'true')  // Google logins always remembered
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token     = localStorage.getItem('lumen_token')
    const remember  = localStorage.getItem('lumen_remember') === 'true'

    if (!token) {
      // No access token — if remember-me was set, try the refresh cookie
      // (handles the overnight expiry case: cookie still valid, token gone)
      if (remember) {
        doRefresh().finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
      return
    }

    const expiry = getExpiry(token)

    if (!expiry || expiry - Date.now() < 0) {
      // Token is expired — if remember-me, silently refresh; otherwise log out
      if (remember) {
        doRefresh().finally(() => setLoading(false))
      } else {
        localStorage.removeItem('lumen_token')
        setLoading(false)
      }
      return
    }

    if (expiry - Date.now() < 30 * 1000) {
      // Expires in <30s — refresh immediately
      doRefresh().finally(() => setLoading(false))
      return
    }

    // Token is alive — verify with server
    api.me()
      .then(u => { setUser(u); setLoading(false); scheduleNext(token) })
      .catch(err => {
        if (err?.status === 401) {
          // Rejected by server — try refresh if remembered, else log out
          if (remember) {
            doRefresh().finally(() => setLoading(false))
          } else {
            localStorage.removeItem('lumen_token')
            setLoading(false)
          }
        } else {
          // Network / 5xx — trust the token, stay logged in
          setUser({ _partial: true })
          setLoading(false)
          scheduleNext(token)
        }
      })
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
