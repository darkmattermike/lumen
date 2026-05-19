import { useState } from 'react'
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

const MOBILE_ALL = [
  { path: '/dashboard',    icon: '⬡', label: 'Home'    },
  { path: '/transactions', icon: '↕', label: 'Txns'    },
  { path: '/budgets',      icon: '◎', label: 'Budgets' },
  { path: '/accounts',     icon: '⬦', label: 'Accounts'},
  { path: '/analytics',    icon: '⌁', label: 'Stats'   },
  { path: '/calendar',     icon: '◷', label: 'Calendar'},
  { path: '/rules',        icon: '⊙', label: 'Rules'   },
  { path: '/gmail',        icon: '✉', label: 'Gmail'   },
  { path: '/settings',     icon: '⚙', label: 'Settings'},
]

export default function Rail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

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
        <button className={styles.rb} style={{ color: 'rgba(167,139,255,0.6)' }} aria-label="WHAT IF">
          ✦<span className={styles.tip}>WHAT IF</span>
        </button>
        <button
          className={`${styles.rb} ${styles.bottom} ${pathname === '/settings' ? styles.on : ''}`}
          onClick={() => navigate('/settings')}
          aria-label="SETTINGS"
        >
          ⚙<span className={styles.tip}>SETTINGS</span>
        </button>
      </nav>

      {/* ── Mobile bottom tab bar — scrollable ── */}
      <nav className="mobileNav" style={{overflowX:'auto',justifyContent:'flex-start',gap:0}}>
        {MOBILE_ALL.map(({ path, icon, label }) => (
          <button
            key={path}
            className={`mobileNavBtn ${pathname === path ? 'mobileNavOn' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            style={{minWidth:56,flexShrink:0}}
          >
            <span className="mobileNavIcon">{icon}</span>
            <span className="mobileNavLabel">{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
