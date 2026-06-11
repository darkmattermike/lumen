import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import s from './SwShell.module.css'

const NAV = [
  { label: 'Home',     path: '/dashboard',    icon: HomeIcon    },
  { label: 'Activity', path: '/transactions', icon: ActivityIcon },
  { label: 'Budgets',  path: '/budgets',      icon: BudgetsIcon  },
  { label: 'Accounts', path: '/accounts',     icon: AccountsIcon },
  { label: 'Calendar', path: '/calendar',     icon: CalendarIcon },
]

export default function SwShell({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const btnRefs = useRef({})
  const [ind, setInd] = useState(null)

  const measure = useCallback(() => {
    const active = NAV.find((n) => pathname.startsWith(n.path))
    const el = active && btnRefs.current[active.path]
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth })
    else setInd(null)
  }, [pathname])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const todayBadge = new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()

  return (
    <div className={s.frame}>
      <div className={s.sw}>
        {/* ── top bar ── */}
        <div className={s.top}>
          <button className={s.brand} onClick={() => navigate('/dashboard')} aria-label="Lumen home">
            <span className={s.brandOrb} aria-hidden="true" />Lumen
          </button>
          <nav className={`${s.nav} ${ind ? s.navReady : ''}`} aria-label="Primary">
            {ind && (
              <span className={s.navInd} aria-hidden="true"
                style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
            )}
            {NAV.map((item) => {
              const active = pathname.startsWith(item.path)
              return (
                <button key={item.label}
                  ref={(el) => { btnRefs.current[item.path] = el }}
                  className={active ? s.navItemActive : s.navItem}
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}>
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className={s.date}>{todayBadge}</div>
        </div>

        {/* ── page content ── */}
        <div key={pathname} className={s.pageIn}>
          {children}
        </div>
      </div>

      {/* ── mobile bottom tab bar ── */}
      <nav className={s.tabBar} aria-label="Navigation">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <button key={item.path}
              className={active ? `${s.tabItem} ${s.tabItemActive}` : s.tabItem}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}>
              <span className={s.tabIcon}><Icon active={active} /></span>
              <span>{item.label}</span>
              <span className={s.tabDot} />
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/* ── tab bar SVG icons ── */
function HomeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}
function ActivityIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h4l3-8 4 16 3-8h6"/>
    </svg>
  )
}
function BudgetsIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}
function AccountsIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
      <path d="M6 15h4"/>
    </svg>
  )
}
function CalendarIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}
