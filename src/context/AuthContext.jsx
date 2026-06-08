import { createContext, useContext } from 'react'

/* Lightweight shim so the dashboard/rail can read a user.
   Swap this for your real auth provider when you wire the rest
   of the app back in — the shape (user.name / user.role) matches. */
const AuthContext = createContext({ user: null })

export function AuthProvider({ children }) {
  const user = { name: 'Alex', email: 'alex@lumen.app', role: 'user' }
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
