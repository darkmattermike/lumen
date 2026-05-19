import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Rail.module.css'

// Flat SVG icon components — no emoji
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const ICONS = {
  home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  txns:     'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4',
  budgets:  'M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 0v10l6 3',
  accounts: 'M3 6h18M3 12h18M3 18h18',
  stats:    'M18 20V10M12 20V4M6 20v-6',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  rules:    'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z',
  gmail:    'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8.19-2A8.01 8.01 0 0 0 20 12a8 8 0 0 0-.81-3.19l2.22-1.28a1 1 0 0 0 .37-1.37l-2-3.46a1 1 0 0 0-1.37-.37l-2.23 1.29A7.95 7.95 0 0 0 13 3.05V.5a1 1 0 0 0-2 0v2.55a7.95 7.95 0 0 0-3.18 1.57L5.59 3.33a1 1 0 0 0-1.37.37l-2 3.46a1 1 0 0 0 .37 1.37l2.22 1.28A8.01 8.01 0 0 0 4 12c0 1.09.2 2.13.59 3.09L2.37 16.37a1 1 0 0 0-.37 1.37l2 3.46a1 1 0 0 0 1.37.37l2.23-1.29A7.95 7.95 0 0 0 11 20.95v2.55a1 1 0 0 0 2 0v-2.55a7.95 7.95 0 0 0 3.18-1.57l2.23 1.29a1 1 0 0 0 1.37-.37l2-3.46a1 1 0 0 0-.37-1.37l-2.22-1.28z',
}

const NAV_ITEMS = [
  { path: '/dashboard',    icon: 'home',     label: 'Overview'     },
  { path: '/transactions', icon: 'txns',     label: 'Transactions' },
  { path: '/budgets',      icon: 'budgets',  label: 'Budgets'      },
  { path: '/accounts',     icon: 'accounts', label: 'Accounts'     },
  { path: '/analytics',    icon: 'stats',    label: 'Analytics'    },
  { path: '/calendar',     icon: 'calendar', label: 'Calendar'     },
  { path: '/rules',        icon: 'rules',    label: 'Rules'        },
  { path: '/gmail',        icon: 'gmail',    label: 'Gmail'        },
]

const MOBILE_NAV = [
  { path: '/dashboard',    icon: 'home',     label: 'Home'     },
  { path: '/transactions', icon: 'txns',     label: 'Txns'     },
  { path: '/budgets',      icon: 'budgets',  label: 'Budgets'  },
  { path: '/accounts',     icon: 'accounts', label: 'Accounts' },
  { path: '/analytics',    icon: 'stats',    label: 'Stats'    },
  { path: '/calendar',     icon: 'calendar', label: 'Calendar' },
  { path: '/rules',        icon: 'rules',    label: 'Rules'    },
  { path: '/gmail',        icon: 'gmail',    label: 'Gmail'    },
  { path: '/settings',     icon: 'settings', label: 'Settings' },
]

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
            <Icon d={ICONS[icon]} size={17} />
            <span className={styles.tip}>{label.toUpperCase()}</span>
          </button>
        ))}
        <div className={styles.sep} />
        <button className={`${styles.rb} ${styles.bottom} ${pathname === '/settings' ? styles.on : ''}`}
          onClick={() => navigate('/settings')} aria-label="Settings">
          <Icon d={ICONS.settings} size={17} />
          <span className={styles.tip}>SETTINGS</span>
        </button>
      </nav>

      {/* ── Mobile bottom tab bar — scrollable ── */}
      <nav className="mobileNav" style={{overflowX:'auto',justifyContent:'flex-start',scrollbarWidth:'none'}}>
        {MOBILE_NAV.map(({ path, icon, label }) => (
          <button
            key={path}
            className={`mobileNavBtn ${pathname === path ? 'mobileNavOn' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            style={{minWidth:52,flexShrink:0}}
          >
            <span className="mobileNavIcon" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Icon d={ICONS[icon]} size={19} />
            </span>
            <span className="mobileNavLabel">{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
