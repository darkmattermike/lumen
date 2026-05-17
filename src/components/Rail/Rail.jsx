import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Rail.module.css'

const NAV_ITEMS = [
  { path: '/dashboard',    icon: '⬡', label: 'OVERVIEW' },
  { path: '/transactions', icon: '↕', label: 'TRANSACTIONS' },
  { path: '/budgets',      icon: '◎', label: 'BUDGETS' },
  { path: '/accounts',     icon: '⬦', label: 'ACCOUNTS' },
  { path: '/analytics',    icon: '⌁', label: 'ANALYTICS' },
  { path: '/calendar',     icon: '◷', label: 'CALENDAR' },
]

export default function Rail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.rail}>
      {NAV_ITEMS.map(({ path, icon, label }) => (
        <button
          key={path}
          className={`${styles.rb} ${pathname === path ? styles.on : ''}`}
          onClick={() => navigate(path)}
          aria-label={label}
        >
          {icon}
          <span className={styles.tip}>{label}</span>
        </button>
      ))}

      <div className={styles.sep} />

      <button className={styles.rb} style={{ color: 'rgba(167,139,255,0.6)' }} aria-label="WHAT IF">
        ✦
        <span className={styles.tip}>WHAT IF</span>
      </button>

      <button className={`${styles.rb} ${styles.bottom}`} aria-label="SETTINGS">
        ⚙
        <span className={styles.tip}>SETTINGS</span>
      </button>
    </nav>
  )
}
