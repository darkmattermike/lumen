import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Rail.module.css'
import LumenDot from '../LumenDot/LumenDot'

/* ──────────────────────────────────────────────────────────────
   Lumen — Nocturne navigation
   Desktop: slim vertical icon rail (left)
   Mobile : bottom tab bar + "More" drawer
   ────────────────────────────────────────────────────────────── */

const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const ICONS = {
  home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  txns:     'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4',
  budgets:  'M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 0v10l6 3',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  stats:    'M18 20V10M12 20V4M6 20v-6',
  accounts: 'M3 6h18M3 12h18M3 18h18',
  goals:    'M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 0v10l4 2',
  insights: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z',
  debt:     'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v6m0 4h.01',
  rules:    'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z',
  gmail:    'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8',
  chat:     'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  dani:     'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  more:     'M5 12h.01M12 12h.01M19 12h.01',
}

// Primary nav — shown as icons in the rail (in order)
const NAV_PRIMARY = [
  { path: '/dashboard',    icon: 'home',     label: 'Today'        },
  { path: '/transactions', icon: 'txns',     label: 'Transactions' },
  { path: '/budgets',      icon: 'budgets',  label: 'Budgets'      },
  { path: '/calendar',     icon: 'calendar', label: 'Calendar'     },
  { path: '/analytics',    icon: 'stats',    label: 'Analytics'    },
  { path: '/accounts',     icon: 'accounts', label: 'Accounts'     },
  { path: '/goals',        icon: 'goals',    label: 'Goals'        },
  { path: '/insights',     icon: 'insights', label: 'Insights'     },
  { path: '/debt',         icon: 'debt',     label: 'Debt'         },
  { path: '/rules',        icon: 'rules',    label: 'Rules'        },
  { path: '/gmail',        icon: 'gmail',    label: 'Gmail'        },
  { path: '/chat',         icon: 'chat',     label: 'Ask Lumen'    },
]

// Mobile bottom tabs (2 left · orb · 1 right · more)
const MOBILE_LEFT  = [
  { path: '/transactions', icon: 'txns',  label: 'Txns'  },
  { path: '/analytics',    icon: 'stats', label: 'Stats' },
]
const MOBILE_RIGHT = [{ path: '/chat', icon: 'chat', label: 'Ask' }]
const MOBILE_MORE  = [
  { path: '/budgets',  icon: 'budgets',  label: 'Budgets'  },
  { path: '/calendar', icon: 'calendar', label: 'Calendar' },
  { path: '/accounts', icon: 'accounts', label: 'Accounts' },
  { path: '/goals',    icon: 'goals',    label: 'Goals'    },
  { path: '/insights', icon: 'insights', label: 'Insights' },
  { path: '/debt',     icon: 'debt',     label: 'Debt'     },
  { path: '/rules',    icon: 'rules',    label: 'Rules'    },
  { path: '/gmail',    icon: 'gmail',    label: 'Gmail'    },
  { path: '/settings', icon: 'settings', label: 'Settings' },
]

function RailButton({ item, active, onClick }) {
  return (
    <button className={`${styles.ni} ${active ? styles.on : ''}`} onClick={onClick} aria-label={item.label}>
      <Icon d={ICONS[item.icon]} />
      <span className={styles.tip}>{item.label}</span>
    </button>
  )
}

export default function Rail() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [moreOpen, setMoreOpen] = useState(false)
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!moreOpen) return
    const handler = (e) => { if (drawerRef.current && !drawerRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [moreOpen])

  const go = (p) => { navigate(p); setMoreOpen(false) }
  const initial = (user?.name || user?.email || 'L').trim()[0]?.toUpperCase() || 'L'
  const moreActive = MOBILE_MORE.some(m => m.path === pathname) && pathname !== '/dashboard'

  return (
    <>
      {/* ── Desktop left rail ── */}
      <nav className={styles.rail}>
        <button className={styles.logo} onClick={() => navigate('/dashboard')} aria-label="Lumen home">
          <LumenDot size={18} />
        </button>

        <div className={styles.nav}>
          {NAV_PRIMARY.map(item => (
            <RailButton key={item.path} item={item}
              active={pathname === item.path}
              onClick={() => navigate(item.path)} />
          ))}
        </div>

        <div className={styles.bottom}>
          <RailButton item={{ icon: 'settings', label: 'Settings', path: '/settings' }}
            active={pathname === '/settings'} onClick={() => navigate('/settings')} />
          {isOwner && (
            <RailButton item={{ icon: 'dani', label: 'Dani', path: '/dani' }}
              active={pathname === '/dani'} onClick={() => navigate('/dani')} />
          )}
          <button className={styles.bellBtn} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </button>
          <button className={styles.avatar} onClick={() => navigate('/settings')} aria-label="Account">
            {initial}
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className={styles.mobileNav}>
        {MOBILE_LEFT.map(({ path, icon, label }) => (
          <button key={path} className={`${styles.mb} ${pathname === path ? styles.mbOn : ''}`}
            onClick={() => go(path)} aria-label={label}>
            <Icon d={ICONS[icon]} size={20} /><span>{label}</span>
          </button>
        ))}

        <div className={styles.orbWrap}>
          <button className={styles.orbBtn} onClick={() => navigate('/dashboard')} aria-label="Home">
            <LumenDot size={24} />
          </button>
          <span className={styles.orbLabel}>Home</span>
        </div>

        {MOBILE_RIGHT.map(({ path, icon, label }) => (
          <button key={path} className={`${styles.mb} ${pathname === path ? styles.mbOn : ''}`}
            onClick={() => go(path)} aria-label={label}>
            <Icon d={ICONS[icon]} size={20} /><span>{label}</span>
          </button>
        ))}

        <button className={`${styles.mb} ${moreActive || moreOpen ? styles.mbOn : ''}`}
          onClick={() => setMoreOpen(v => !v)} aria-label="More">
          <Icon d={ICONS.more} size={18} /><span>More</span>
        </button>
      </nav>

      {/* ── Mobile "More" drawer ── */}
      {moreOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setMoreOpen(false)} />
          <div className={styles.drawer} ref={drawerRef}>
            <div className={styles.handle} />
            <div className={styles.grid}>
              {MOBILE_MORE.map(({ path, icon, label }) => (
                <button key={path} className={`${styles.gi} ${pathname === path ? styles.giOn : ''}`} onClick={() => go(path)}>
                  <span className={styles.giIcon}><Icon d={ICONS[icon]} size={22} /></span>
                  <span>{label}</span>
                </button>
              ))}
              {isOwner && (
                <button className={`${styles.gi} ${pathname === '/dani' ? styles.giOn : ''}`} onClick={() => go('/dani')}>
                  <span className={styles.giIcon}><Icon d={ICONS.dani} size={22} /></span>
                  <span>Dani</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
