import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Rail.module.css'
import NotificationBell from '../NotificationBell/NotificationBell'

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
  goals:    'M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 0v10l4 2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8.19-2A8.01 8.01 0 0 0 20 12a8 8 0 0 0-.81-3.19l2.22-1.28a1 1 0 0 0 .37-1.37l-2-3.46a1 1 0 0 0-1.37-.37l-2.23 1.29A7.95 7.95 0 0 0 13 3.05V.5a1 1 0 0 0-2 0v2.55a7.95 7.95 0 0 0-3.18 1.57L5.59 3.33a1 1 0 0 0-1.37.37l-2 3.46a1 1 0 0 0 .37 1.37l2.22 1.28A8.01 8.01 0 0 0 4 12c0 1.09.2 2.13.59 3.09L2.37 16.37a1 1 0 0 0-.37 1.37l2 3.46a1 1 0 0 0 1.37.37l2.23-1.29A7.95 7.95 0 0 0 11 20.95v2.55a1 1 0 0 0 2 0v-2.55a7.95 7.95 0 0 0 3.18-1.57l2.23 1.29a1 1 0 0 0 1.37-.37l2-3.46a1 1 0 0 0-.37-1.37l-2.22-1.28z',
  more:     'M5 12h.01M12 12h.01M19 12h.01',
  dani:     'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  chat:     'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  debt:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  insights: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
}

// Desktop sidebar items
const NAV_ITEMS = [
  { path: '/dashboard',    icon: 'home',     label: 'Overview'     },
  { path: '/transactions', icon: 'txns',     label: 'Transactions' },
  { path: '/budgets',      icon: 'budgets',  label: 'Budgets'      },
  { path: '/accounts',     icon: 'accounts', label: 'Accounts'     },
  { path: '/analytics',    icon: 'stats',    label: 'Analytics'    },
  { path: '/calendar',     icon: 'calendar', label: 'Calendar'     },
  { path: '/rules',        icon: 'rules',    label: 'Rules'        },
  { path: '/goals',        icon: 'goals',    label: 'Goals'        },
  { path: '/insights',     icon: 'insights', label: 'Insights'     },
  { path: '/debt',         icon: 'debt',     label: 'Debt'         },
  { path: '/chat',         icon: 'chat',     label: 'Ask Lumen'    },
  { path: '/gmail',        icon: 'gmail',    label: 'Gmail'        },
]

// Mobile primary tabs — always visible
const MOBILE_PRIMARY = [
  { path: '/dashboard',    icon: 'home',     label: 'Home'         },
  { path: '/transactions', icon: 'txns',     label: 'Txns'     },
  { path: '/budgets',      icon: 'budgets',  label: 'Budgets'  },
  { path: '/calendar',     icon: 'calendar', label: 'Calendar' },
  { path: '/analytics',    icon: 'stats',    label: 'Stats'    },
]

// Mobile "More" drawer items
const MOBILE_MORE = [
  { path: '/accounts',     icon: 'accounts', label: 'Accounts'  },
  { path: '/rules',        icon: 'rules',    label: 'Rules'     },
  { path: '/goals',        icon: 'goals',    label: 'Goals'     },
  { path: '/insights',     icon: 'insights', label: 'Insights'  },
  { path: '/debt',         icon: 'debt',     label: 'Debt'      },
  { path: '/chat',         icon: 'chat',     label: 'Ask Lumen' },
  { path: '/gmail',        icon: 'gmail',    label: 'Gmail'     },
  { path: '/settings',     icon: 'settings', label: 'Settings'  },
]

export default function Rail() {
  const navigate          = useNavigate()
  const { pathname }      = useLocation()
  const { user }          = useAuth()
  const isOwner           = user?.role === 'owner'
  const [moreOpen, setMoreOpen] = useState(false)
  const drawerRef         = useRef(null)

  // Close "More" drawer on outside tap
  useEffect(() => {
    if (!moreOpen) return
    function handler(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [moreOpen])

  // Close drawer when navigating
  function go(path) {
    navigate(path)
    setMoreOpen(false)
  }

  const moreActive = MOBILE_MORE.some(m => m.path === pathname)

  return (
    <>
      {/* ── Desktop side rail ── */}
      <nav className={styles.rail}>
        {NAV_ITEMS.map(({ path, icon, label }, i) => (
          <button
            key={path}
            className={`${styles.rb} ${pathname === path ? styles.on : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            style={{ '--rb-delay': `${i * 35 + 50}ms` }}
          >
            <Icon d={ICONS[icon]} size={17} />
            <span className={styles.tip}>{label.toUpperCase()}</span>
          </button>
        ))}
        <div className={styles.sep} />
        <div style={{ padding: '0 8px 4px' }}>
          <NotificationBell />
        </div>
        {isOwner && (
          <button
            className={`${styles.rb} ${pathname === '/dani' ? styles.on : ''}`}
            onClick={() => navigate('/dani')}
            aria-label="Dani"
            style={pathname === '/dani' ? { color: 'var(--warn)' } : {}}
          >
            <Icon d={ICONS.dani} size={17} />
            <span className={styles.tip}>DANI</span>
          </button>
        )}
        <button
          className={`${styles.rb} ${styles.bottom} ${pathname === '/settings' ? styles.on : ''}`}
          onClick={() => navigate('/settings')}
          aria-label="Settings"
        >
          <Icon d={ICONS.settings} size={17} />
          <span className={styles.tip}>SETTINGS</span>
        </button>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className={styles.mobileNav}>
        {/* 5 primary tabs */}
        {MOBILE_PRIMARY.map(({ path, icon, label }) => (
          <button
            key={path}
            className={`${styles.mobileBtn} ${pathname === path ? styles.mobileBtnOn : ''}`}
            onClick={() => go(path)}
            aria-label={label}
          >
            <span className={styles.mobileBtnIcon}>
              <Icon d={ICONS[icon]} size={20} />
            </span>
            <span className={styles.mobileBtnLabel}>{label}</span>
          </button>
        ))}

        {/* More button */}
        <button
          className={`${styles.mobileBtn} ${moreActive || moreOpen ? styles.mobileBtnOn : ''}`}
          onClick={() => setMoreOpen(v => !v)}
          aria-label="More"
        >
          <span className={styles.mobileBtnIcon}>
            <Icon d={ICONS.more} size={20} />
          </span>
          <span className={styles.mobileBtnLabel}>More</span>
        </button>
      </nav>

      {/* ── More drawer — slides up above tab bar ── */}
      {moreOpen && (
        <>
          <div className={styles.moreBackdrop} onClick={() => setMoreOpen(false)} />
          <div className={styles.moreDrawer} ref={drawerRef}>
            <div className={styles.moreHandle} />

            {/* Lumen notifications row */}
            <div className={styles.moreNotifRow}>
              <NotificationBell mobileDrawer />
            </div>

            <div className={styles.moreGrid}>
              {MOBILE_MORE.map(({ path, icon, label }) => (
                <button
                  key={path}
                  className={`${styles.moreItem} ${pathname === path ? styles.moreItemOn : ''}`}
                  onClick={() => go(path)}
                >
                  <span className={styles.moreItemIcon}>
                    <Icon d={ICONS[icon]} size={22} />
                  </span>
                  <span className={styles.moreItemLabel}>{label}</span>
                </button>
              ))}
              {isOwner && (
                <button
                  className={`${styles.moreItem} ${pathname === '/dani' ? styles.moreItemOn : ''}`}
                  onClick={() => go('/dani')}
                  style={pathname === '/dani' ? { background: 'rgba(240,176,76,.08)', borderColor: 'rgba(240,176,76,.25)', color: 'var(--warn)' } : {}}
                >
                  <span className={styles.moreItemIcon}><Icon d={ICONS.dani} size={22} /></span>
                  <span className={styles.moreItemLabel}>Dani</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
