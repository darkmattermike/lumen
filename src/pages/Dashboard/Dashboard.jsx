import { useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useCountUp } from '../../hooks/useCountUp'
import SwShell from '../../components/SwShell/SwShell'
import { api } from '../../data/api'
import s from './Dashboard.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Stillwater · Dark dashboard
   Night water: the orb is the centerpiece, the tide is the cash
   flow, glass cards rest on the waterline. Wired to the live
   backend (or the in-memory mock when VITE_API_URL is unset).
   ────────────────────────────────────────────────────────────── */

/* ---- formatting helpers ---- */
const n2 = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dayStr = (d) => {
  const z = new Date(d)
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`
}
const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d }
const shortDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// split a money value into animated integer dollars + static cents
function centsPair(v) {
  let dollars = Math.floor(Math.abs(Number(v) || 0))
  let cents = Math.round((Math.abs(Number(v) || 0) - dollars) * 100)
  if (cents === 100) { dollars += 1; cents = 0 }
  return { dollars, cc: String(cents).padStart(2, '0') }
}

const WARN_BILL_MIN = 100   // expenses at/above this glow amber in "Coming up"
const BUDGET_WARN_PCT = 80  // budget bars at/above this % turn amber

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi(api.dashboard)
  const { data: txData }   = useApi(() => api.transactions('?limit=40'))
  const { data: budData }  = useApi(api.budgets)
  const { data: acctData } = useApi(api.accounts)

  /* ── hero figures (safe-to-spend = plug point) ── */
  const hero = useMemo(() => {
    const d = data || {}
    const windows = d.windows || []
    const w0 = windows[0] || null
    const nextPay = w0?.nextPay || d.nextPaycheck || null
    const daysToPay = nextPay?.daysUntil ?? null
    const heroBalance = (Array.isArray(d.activePlans) && d.activePlans.length)
      ? (d.balanceAfterPlans ?? d.freeToSpend ?? 0)
      : (d.freeToSpend ?? 0)
    const daysLeft = Math.max(1, daysToPay ?? 14)
    const dailyAllowance = Math.max(0, heroBalance / daysLeft)

    // spent today (today's expenses)
    const all = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
    const todayKey = dayStr(new Date())
    let spentToday = 0
    for (const t of all) {
      const amt = Number(t.amount) || 0
      const isExpense = (t.tx_type !== 'income') && amt < 0
      if (String(t.date).slice(0, 10) === todayKey && isExpense) spentToday += Math.abs(amt)
    }

    // ▶▶ FUTURE CUSTOM ALGORITHM PLUGS IN HERE ◀◀
    // For now: a day's slice of remaining free-to-spend, minus what's already spent today.
    const safeToday = Math.max(0, dailyAllowance - spentToday)

    const label = d.pressureLabel || 'SAFE'
    const tag = label === 'CRITICAL' ? 'pressure is high'
      : label === 'TIGHT' ? 'spending is tight'
      : label === 'WATCH' ? 'on track'
      : 'ahead of plan'

    const payDate = daysToPay != null ? addDays(new Date(), daysToPay) : null
    const payDateStr = payDate
      ? payDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : null

    return { safeToday, heroBalance, daysToPay, payDateStr, tag }
  }, [data, txData])

  /* ── animated hero amount ── */
  const { dollars: heroDollars, cc: heroCents } = centsPair(hero.safeToday)
  const { display: heroDisplay } = useCountUp(heroDollars, { duration: 1100 })

  /* ── coming up (already curated by the API) ── */
  const upcoming = useMemo(() => {
    return (data?.upcomingBills || []).slice(0, 4).map((b) => {
      const income = b.type === 'income'
      const amt = Number(b.amount) || 0
      return {
        id: b.id,
        name: b.name,
        when: b.daysUntil === 0 ? 'Today' : `${b.daysUntil} day${b.daysUntil === 1 ? '' : 's'}`,
        amt: `${income ? '+' : '−'}${n2(amt)}`,
        cls: income ? s.rowAmtIn : (amt >= WARN_BILL_MIN ? s.rowAmtWarn : s.rowAmt),
      }
    })
  }, [data])

  /* ── recent activity ── */
  const recent = useMemo(() => {
    const all = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
    const todayKey = dayStr(new Date())
    const yesterdayKey = dayStr(addDays(new Date(), -1))
    const seen = new Set()
    return all
      .filter((t) => { if (seen.has(t.id)) return false; seen.add(t.id); return true })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 4)
      .map((t) => {
        const amt = Number(t.amount) || 0
        const income = t.tx_type === 'income' || amt > 0
        const key = String(t.date).slice(0, 10)
        return {
          id: t.id,
          name: t.cleaned_name || t.name || 'Transaction',
          when: key === todayKey ? 'Today' : key === yesterdayKey ? 'Yesterday' : shortDate(t.date),
          amt: `${income ? '+' : '−'}${n2(Math.abs(amt))}`,
          cls: income ? s.rowAmtIn : s.rowAmt,
        }
      })
  }, [txData])

  /* ── budgets (top 3) ── */
  const budgets = useMemo(() => {
    return (budData?.budgets || []).slice(0, 3).map((b) => {
      const pct = Math.min(100, Math.round(b.pct ?? ((b.spent / Math.max(1, b.cap)) * 100)))
      return {
        id: b.id,
        name: b.name,
        fig: `$${Math.round(b.spent).toLocaleString('en-US')} / ${Math.round(b.cap).toLocaleString('en-US')}`,
        pct,
        warn: pct >= BUDGET_WARN_PCT,
      }
    })
  }, [budData])

  /* ── accounts strip + net before payday ── */
  const strip = useMemo(() => {
    const accts = acctData?.accounts || []
    const cash = accts.filter((a) => !a.is_debt)
    const checking = cash.find((a) => /check/i.test(a.name)) || cash[0] || null
    const savings = cash.find((a) => a !== checking && /sav/i.test(a.name)) || cash.find((a) => a !== checking) || null
    const debt = accts.find((a) => a.is_debt) || null

    // net before payday = income − bills among upcoming items inside the pay window
    const dtp = hero.daysToPay
    let net = null
    if (dtp != null) {
      net = (data?.upcomingBills || [])
        .filter((b) => (b.daysUntil ?? 99) <= dtp)
        .reduce((sum, b) => sum + (b.type === 'income' ? Number(b.amount) : -Number(b.amount)), 0)
      net = Math.round(net * 100) / 100
    }
    return { checking, savings, debt, net }
  }, [acctData, data, hero.daysToPay])

  /* ── tide drift + crest glow breathing (respects reduced motion) ── */
  const w1 = useRef(null), w2 = useRef(null), w3 = useRef(null), crest = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf, t = 0
    const tick = () => {
      t += 0.011
      w1.current?.setAttribute('transform', `translate(${Math.sin(t) * 14} ${Math.sin(t * 0.7) * 2})`)
      w2.current?.setAttribute('transform', `translate(${Math.cos(t * 0.8) * 18} ${Math.cos(t * 0.5) * 2.5})`)
      const t3 = `translate(${Math.sin(t * 0.6 + 1) * 12} ${Math.sin(t * 0.9) * 1.8})`
      w3.current?.setAttribute('transform', t3)
      crest.current?.setAttribute('transform', t3)
      crest.current?.setAttribute('opacity', (0.55 + 0.3 * Math.sin(t * 1.4)).toFixed(2))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <SwShell>
      {/* ── hero ── */}
      <div className={s.hero}>
        <div className={s.orbWrap}><div className={s.orb} aria-hidden="true" /></div>
        <div className={s.heroLabel}>Safe to spend today</div>
        <div className={`${s.amt} ${s.tabnum}`} aria-live="polite">
          ${loading ? '0' : heroDisplay}<span className={s.cents}>.{heroCents}</span>
        </div>
        <div className={s.sub}>
          <b className={s.tabnum}>${n2(hero.heroBalance)}</b> free until payday
          {hero.payDateStr && <> · <b>{hero.payDateStr}</b></>}
          {' '}· {hero.tag}
        </div>

        {/* ripple rings spreading beneath the orb */}
        <div className={s.ripples} aria-hidden="true">
          <span className={s.ripple} />
          <span className={s.ripple} style={{ '--d': '1.7s' }} />
          <span className={s.ripple} style={{ '--d': '3.4s' }} />
        </div>

        {/* ── tide ── */}
        <div className={s.tide}>
          <svg viewBox="0 0 1000 118" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {/* bioluminescent crest glow centered under the orb */}
              <linearGradient id="swCrest" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#1c4f40" />
                <stop offset=".42" stopColor="#62e0b5" />
                <stop offset=".58" stopColor="#62e0b5" />
                <stop offset="1" stopColor="#1c4f40" />
              </linearGradient>
            </defs>
            <path ref={w1} d="M0,58 C150,44 280,76 420,62 C560,48 700,74 840,60 C920,53 970,58 1000,56 L1000,118 L0,118 Z" fill="#0e2c2c" opacity=".85" />
            <path ref={w2} d="M0,74 C160,62 300,88 460,74 C620,60 760,86 1000,70 L1000,118 L0,118 Z" fill="#10393a" opacity=".9" />
            <path ref={w3} d="M0,88 C200,78 360,100 540,88 C720,76 860,98 1000,86 L1000,118 L0,118 Z" fill="#144a45" opacity=".95" />
            <path ref={crest} d="M0,88 C200,78 360,100 540,88 C720,76 860,98 1000,86" fill="none" stroke="url(#swCrest)" strokeWidth="1.6" opacity=".8" />
          </svg>
        </div>
      </div>

      {/* ── cards on the waterline ── */}
      <div className={s.cards}>
        <div className={s.card} style={{ '--d': '.32s' }}>
          <div className={s.cardHead}>Coming up
            <button className={s.cardLink} onClick={() => navigate('/calendar')}>Calendar</button>
          </div>
          {upcoming.map((b, i) => (
            <div className={s.row} key={b.id} style={{ '--d': `${0.45 + i * 0.06}s` }}>
              <span className={s.rowName}>{b.name}<span className={s.rowWhen}>{b.when}</span></span>
              <span className={`${b.cls} ${s.tabnum}`}>{b.amt}</span>
            </div>
          ))}
          {!loading && upcoming.length === 0 && (
            <div className={s.row}><span className={s.rowWhen}>Nothing due before payday</span></div>
          )}
        </div>

        <div className={s.card} style={{ '--d': '.42s' }}>
          <div className={s.cardHead}>Recent
            <button className={s.cardLink} onClick={() => navigate('/transactions')}>All</button>
          </div>
          {recent.map((t, i) => (
            <div className={s.row} key={t.id} style={{ '--d': `${0.55 + i * 0.06}s` }}>
              <span className={s.rowName}>{t.name}<span className={s.rowWhen}>{t.when}</span></span>
              <span className={`${t.cls} ${s.tabnum}`}>{t.amt}</span>
            </div>
          ))}
          {!loading && recent.length === 0 && (
            <div className={s.row}><span className={s.rowWhen}>No transactions yet</span></div>
          )}
        </div>

        <div className={s.card} style={{ '--d': '.52s' }}>
          <div className={s.cardHead}>
            Budgets · {new Date().toLocaleDateString('en-US', { month: 'long' })}
            <button className={s.cardLink} onClick={() => navigate('/budgets')}>Edit</button>
          </div>
          {budgets.map((b, i) => (
            <div className={s.bud} key={b.id}>
              <div className={s.budRow}>
                <span>{b.name}</span>
                <span className={`${s.budFig} ${s.tabnum}`}>{b.fig}</span>
              </div>
              <div className={s.budBar}>
                <i className={b.warn ? s.budFillWarn : s.budFill} style={{ width: `${b.pct}%`, '--d': `${0.65 + i * 0.12}s` }} />
              </div>
            </div>
          ))}
          {!loading && budgets.length === 0 && (
            <div className={s.row}><span className={s.rowWhen}>No budgets yet — add one to start tracking</span></div>
          )}
        </div>
      </div>

      {/* ── accounts strip ── */}
      <div className={s.strip}>
        {strip.checking && (
          <div style={{ '--d': '.6s' }}>
            <div className={s.statKey}>{strip.checking.name}</div>
            <div className={`${s.statVal} ${s.tabnum}`}>${n2(strip.checking.balance)}</div>
          </div>
        )}
        {strip.savings && (
          <div style={{ '--d': '.68s' }}>
            <div className={s.statKey}>{strip.savings.name}</div>
            <div className={`${s.statVal} ${s.tabnum}`}>${n2(strip.savings.balance)}</div>
          </div>
        )}
        {strip.debt && (
          <div style={{ '--d': '.76s' }}>
            <div className={s.statKey}>{strip.debt.name}</div>
            <div className={`${s.statValDebt} ${s.tabnum}`}>−${n2(strip.debt.balance)}</div>
          </div>
        )}
        {strip.net != null && (
          <div style={{ '--d': '.84s' }}>
            <div className={s.statKey}>Net before payday</div>
            <div className={`${strip.net >= 0 ? s.statValPos : s.statValDebt} ${s.tabnum}`}>
              {strip.net >= 0 ? '+' : '−'}${n2(Math.abs(strip.net))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className={s.stateWrap}>Couldn't reach the server — showing what we have. <b>{error}</b></div>
      )}
    </SwShell>
  )
}
