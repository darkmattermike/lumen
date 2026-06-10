import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard/Dashboard'
import Transactions from './pages/Transactions/Transactions'
import Accounts from './pages/Accounts/Accounts'
import Budgets from './pages/Budgets/Budgets'
import styles from './App.module.css'

/* Stillwater · Dark — dashboard, activity, budgets, accounts.
   Remaining pages will be rebuilt one at a time in this design
   language; until then their routes land on the dashboard. */
export default function App() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
