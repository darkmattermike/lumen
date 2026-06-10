import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import s from './SwShell.module.css'

/* ──────────────────────────────────────────────────────────────
   Stillwater · Dark — shared page shell
   The dark glass card every page lives in: brand orb, pill nav
   with a sliding "droplet" indicator, date badge, and a
   surface-from-the-water transition on every route change.
   ────────────────────────────────────────────────────────────── */

const NAV = [
  { label: 'Home',     path: '/dashboard'    },
  { label: 'Activity', path: '/transactions' },
  { label: 'Budgets',  path: '/budgets'      },
  { label: 'Accounts', path: '/accounts'     },
  { label: 'Calendar', path: '/calendar'     },
]

export default function SwShell({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  /* sliding pill indicator — measured so it glides between items */
  const btnRefs = useRef({})
  const [ind, setInd] = useState(null) // { x, w }

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
        <div className={s.top}>
          <button className={s.brand} onClick={() => navigate('/dashboard')} aria-label="Lumen home">
            <span className={s.brandOrb} aria-hidden="true" />Lumen
          </button>
          <nav className={`${s.nav} ${ind ? s.navReady : ''}`} aria-label="Primary">
            {ind && (
              <span
                className={s.navInd}
                aria-hidden="true"
                style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
              />
            )}
            {NAV.map((item) => {
              const active = pathname.startsWith(item.path)
              return (
                <button
                  key={item.label}
                  ref={(el) => { btnRefs.current[item.path] = el }}
                  className={active ? s.navItemActive : s.navItem}
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className={s.date}>{todayBadge}</div>
        </div>

        {/* keyed by route so every page surfaces from the water */}
        <div key={pathname} className={s.pageIn}>
          {children}
        </div>
      </div>
    </div>
  )
}
