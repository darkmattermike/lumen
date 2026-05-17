import { Routes, Route, Navigate } from 'react-router-dom'
import Rail from './components/Rail/Rail'
import Dashboard from './pages/Dashboard/Dashboard'
import Transactions from './pages/Transactions/Transactions'
import Budgets from './pages/Budgets/Budgets'
import Accounts from './pages/Accounts/Accounts'
import Analytics from './pages/Analytics/Analytics'
import Calendar from './pages/Calendar/Calendar'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <Rail />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets"      element={<Budgets />} />
            <Route path="/accounts"     element={<Accounts />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/calendar"     element={<Calendar />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
