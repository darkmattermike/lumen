import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthGate from './components/AuthGate/AuthGate'
import Rail from './components/Rail/Rail'
import Dashboard from './pages/Dashboard/Dashboard'
import Transactions from './pages/Transactions/Transactions'
import Budgets from './pages/Budgets/Budgets'
import Accounts from './pages/Accounts/Accounts'
import Analytics from './pages/Analytics/Analytics'
import Calendar from './pages/Calendar/Calendar'
import Settings from './pages/Settings/Settings'
import styles from './App.module.css'

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg-0)' }}>
        <div className="dot d-44" style={{ animation:'dot-breathe 3s ease-in-out infinite' }} />
      </div>
    )
  }

  if (!user) return <AuthGate />

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <Rail />
        <main className={styles.main}>
          <Routes>
            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets"      element={<Budgets />} />
            <Route path="/accounts"     element={<Accounts />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/calendar"     element={<Calendar />} />
            <Route path="/settings"     element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
