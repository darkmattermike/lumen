import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Rail.module.css'

const NAV_ITEMS = [
  { path: '/dashboard',    icon: '⬡', label: 'Overview' },
  { path: '/transactions', icon: '↕', label: 'Transactions' },
  { path: '/budgets',      icon: '◎', label: 'Budgets' },
  { path: '/accounts',     icon: '⬦', label: 'Accounts' },
  { path: '/analytics',    icon: '⌁', label: 'Analytics' },
  { path: '/calendar',     icon: '◷', label: 'Calendar' },
  { path: '/rules',        icon: '⊙', label: 'Rules' },
  { path: '/gmail',        icon: '✉', label: 'Gmail' },
]

// Primary tabs shown in the mobile bottom bar (5 max for comfort)
const MOBILE_PRIMARY = ['/dashboard', '/transactions', '/budgets', '/calendar', '/settings']

export default function Rail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <>
      {/* ── Desktop side rail ── */}
      <nav className={styles.rail}>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <button
            key={path}
            className={`${styles.rb} ${pathname === path ? styles.on : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            {icon}
            <span className={styles.tip}>{label.toUpperCase()}</span>
          </button>
        ))}

        <div className={styles.sep} />

        <button
          className={styles.rb}
          style={{ color: 'rgba(167,139,255,0.6)' }}
          aria-label="WHAT IF"
        >
          ✦
          <span className={styles.tip}>WHAT IF</span>
        </button>

        <button
          className={`${styles.rb} ${styles.bottom} ${pathname === '/settings' ? styles.on : ''}`}
          onClick={() => navigate('/settings')}
          aria-label="SETTINGS"
        >
          ⚙
          <span className={styles.tip}>SETTINGS</span>
        </button>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="mobileNav">
        {[
          { path: '/dashboard',    icon: '⬡', label: 'Home'     },
          { path: '/transactions', icon: '↕', label: 'Txns'     },
          { path: '/budgets',      icon: '◎', label: 'Budgets'  },
          { path: '/calendar',     icon: '◷', label: 'Calendar' },
          { path: '/settings',     icon: '⚙', label: 'More'     },
        ].map(({ path, icon, label }) => (
          <button
            key={path}
            className={`mobileNavBtn ${pathname === path || (path === '/settings' && !MOBILE_PRIMARY.includes(pathname)) ? 'mobileNavOn' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <span className="mobileNavIcon">{icon}</span>
            <span className="mobileNavLabel">{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
