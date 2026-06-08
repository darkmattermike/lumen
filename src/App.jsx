import { Routes, Route, Navigate } from 'react-router-dom'
import Rail from './components/Rail/Rail'
import Dashboard from './pages/Dashboard/Dashboard'
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
            {/* Other pages land here as you build them out */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
