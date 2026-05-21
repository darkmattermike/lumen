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

  // ── Silent refresh ────────────────────────────────────────────
  const silentRefresh = useCallback(async () => {
    // Deduplicate concurrent refresh calls
    if (refreshPromise.current) return refreshPromise.current

    refreshPromise.current = api.refresh()
      .then(data => {
        localStorage.setItem('lumen_token', data.token)
        setUser(data.user)
        scheduleProactiveRefresh()
        return data.token
      })
      .catch(() => {
        localStorage.removeItem('lumen_token')
        setUser(null)
        clearProactiveRefresh()
        return null
      })
      .finally(() => { refreshPromise.current = null })

    return refreshPromise.current
  }, []) // eslint-disable-line

  // ── Proactive refresh timer ───────────────────────────────────
  function scheduleProactiveRefresh() {
    clearProactiveRefresh()
    refreshTimerRef.current = setTimeout(() => {
      silentRefresh()
    }, PROACTIVE_MS)
  }

  function clearProactiveRefresh() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  // Expose silentRefresh so api.js can call it on any 401
  useEffect(() => {
    window.__lumenRefresh = silentRefresh
  }, [silentRefresh])

  // Clean up timer on unmount
  useEffect(() => () => clearProactiveRefresh(), [])

  // ── On mount — verify token or refresh ───────────────────────
  useEffect(() => {
    const token = localStorage.getItem('lumen_token')

    if (!token) {
      // No token — try the refresh cookie (handles page reload)
      silentRefresh().finally(() => setLoading(false))
      return
    }

    // Token exists — verify it's still good
    api.me()
      .then(u => {
        setUser(u)
        setLoading(false)
        scheduleProactiveRefresh()
      })
      .catch(async () => {
        // me() failed for any reason — always try refresh before giving up
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
    setUser(data.user)
    scheduleProactiveRefresh()
    return data.user
  }

  // ── Register ─────────────────────────────────────────────────
  async function register(email, password, name, terms_agreed = false) {
    const data = await api.register({ email, password, name, terms_agreed })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    scheduleProactiveRefresh()
    return data.user
  }

  // ── Logout ───────────────────────────────────────────────────
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, logoutAll, silentRefresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
