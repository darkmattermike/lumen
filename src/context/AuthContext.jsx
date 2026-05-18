import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../data/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if there's a saved token
  useEffect(() => {
    const token = localStorage.getItem('lumen_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.me()
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('lumen_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.login({ email, password })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    return data.user
  }

  async function register(email, password, name) {
    const data = await api.register({ email, password, name })
    localStorage.setItem('lumen_token', data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    localStorage.removeItem('lumen_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
