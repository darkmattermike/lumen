import { Routes, Route, Navigate } from 'react-router-dom'
import Rail from './components/Rail/Rail'
import Dashboard from './pages/Dashboard/Dashboard'
import Transactions from './pages/Transactions/Transactions'
import Accounts from './pages/Accounts/Accounts'
import Budgets from './pages/Budgets/Budgets'
import Calendar from './pages/Calendar/Calendar'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.shell}>
      <Rail />
      <div className={styles.inner}>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/calendar" element={<Calendar />} />
            {/* Pages not yet built redirect home */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
