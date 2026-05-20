import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../data/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshPromise        = useRef(null)  // deduplicate concurrent refreshes

  // Attempt a silent token refresh using the httpOnly cookie
  const silentRefresh = useCallback(async () => {
    // Deduplicate — if a refresh is already in flight, reuse it
    if (refreshPromise.current) return refreshPromise.current

    refreshPromise.current = api.refresh()
      .then(data => {
        localStorage.setItem('lumen_token', data.token)
        setUser(data.user)
        return data.token
      })
      .catch(() => {
        localStorage.removeItem('lumen_token')
        setUser(null)
        return null
      })
      .finally(() => { refreshPromise.current = null })

    return refreshPromise.current
  }, [])

  // Expose silentRefresh so api.js can call it on 401
  useEffect(() => {
    window.__lumenRefresh = silentRefresh
  }, [silentRefresh])

  // On mount — verify existing token or try refresh
  useEffect(() => {
    const token = localStorage.getItem('lumen_token')
    if (!token) {
      // No token in localStorage — try refresh cookie silently.
      // A 401 here is expected for first-time visitors — not an error.
      api.refresh()
        .then(data => {
          localStorage.setItem('lumen_token', data.token)
          setUser(data.user)
        })
        .catch(() => { setUser(null) })
        .finally(() => setLoading(false))
      return
    }
    api.me()
      .then(u => { setUser(u); setLoading(false) })
      .catch(async err => {
        // 401 with expired flag — try silent refresh
        if (err?.expired) {
          await silentRefresh()
        } else {
          localStorage.removeItem('lumen_token')
          setUser(null)
        }
        setLoading(false)
      })
  }, [])

  async function login(email, password) {
    const data = await api.login({ email, password })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    return data.user
  }

  async function register(email, password, name, terms_agreed = false) {
    const data = await api.register({ email, password, name, terms_agreed })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    return data.user
  }

  async function logout() {
    try { await api.logout() } catch {}
    localStorage.removeItem('lumen_token')
    setUser(null)
  }

  async function logoutAll() {
    try { await api.logoutAll() } catch {}
    localStorage.removeItem('lumen_token')
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
