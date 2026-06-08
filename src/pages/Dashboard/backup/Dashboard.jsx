import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Dashboard.module.css'
import PaycheckAllocation from '../../components/PaycheckAllocation/PaycheckAllocation'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtD(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(isoStr) {
  if (!isoStr) return ''
  // Handle both "YYYY-MM-DD" and full ISO "2026-06-01T00:00:00.000Z"
  const dateOnly = String(isoStr).slice(0, 10) // always take first 10 chars
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const LABEL_COLOR = { SAFE: 'var(--safe)', WATCH: 'var(--warn)', TIGHT: 'var(--warn)', CRITICAL: 'var(--debt)' }

export default function Dashboard() {
  const { data, loading, error } = useApi(api.dashboard)
  const { data: budgetData }       = useApi(api.budgets)
  const { data: txData }           = useApi(() => api.transactions('?limit=10'))
  const navigate = useNavigate()
  const theaterRef = useRef(null)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const COLOR_MAP = {
    debt:'var(--debt)', warn:'var(--warn)', safe:'var(--safe)',
    calm:'var(--calm)', goal:'var(--goal)', pink:'#e87fa3',
    orange:'#f07a3a', sky:'#5bc4e8', lime:'#8ecf4a', gold:'#d4a017',
  }

  // api.budgets() returns { budgets: [...] }
  // api.transactions() returns { currentMonth: [...] }
  const topBudgets  = (budgetData?.budgets || []).slice(0, 3)
  // Combine current month + historical, dedupe by id, take 5 most recent
  const allTxns    = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
  const seenIds    = new Set()
  const recentTxns = allTxns.filter(tx => {
    if (seenIds.has(tx.id)) return false
    seenIds.add(tx.id)
    return true
  }).slice(0, 5)

  const {
    balance, freeToSpend, balanceAfterBills, balanceAfterPlans,
    committedBills, upcomingPayTotal = 0, bills30Days = 0, income30Days = 0,
    pressureLabel, pressureScore,
    monthSpent, monthIncome,
    upcomingBills, nextPaycheck, next3Bills = [],
    activePlans = [], plannedSpend = 0, plannedSavings = 0,
    windows: payWindows = [],
  } = data

  const today     = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const netChange = monthIncome - monthSpent
  const hasPlans  = activePlans.length > 0

  // ── Pay-period windows ────────────────────────────────────
  const w0 = payWindows[0] || null   // current window: today → next paycheck
  const w1 = payWindows[1] || null   // next window: next paycheck → one after

  // Hero number: balance + any paychecks that landed today - bills before next paycheck
  const heroBalance = hasPlans ? balanceAfterPlans : freeToSpend
  const heroColor   = heroBalance >= 0 ? 'var(--safe)' : 'var(--debt)'

  const w0Bills        = w0?.billsTotal ?? Number(committedBills)
  const w0NextPay      = w0?.nextPay ?? nextPaycheck
  const daysUntilPay   = w0NextPay?.daysUntil ?? null
  const todayPayTotal  = w0?.paycheckOnStartTotal ?? 0
  const todayPaychecks = w0?.paychecksOnStart ?? []

  // Window 1: is the next window going to be tight?
  const w1Bills      = w1?.billsTotal ?? 0
  const w1PayTotal   = (w1?.paycheckOnStartTotal ?? 0) + (w1?.paychecksInTotal ?? 0)
  const w1Free       = w1PayTotal - w1Bills
  const w1IsTight    = w1Bills > 0 && w1Free < 300

  // Safe-to-spend: what you'll have after ALL known windows clear.
  // = heroBalance (w0 free) + w1 paycheck - w1 bills
  // This is the number you shouldn't exceed if you want to stay solvent through w1.
  const safeToSpend = heroBalance + w1PayTotal - w1Bills

  // Build bill rows for aside
  const billRows = upcomingBills.map(b => ({
    id: b.id,
    name: b.name,
    when: `${b.type === 'income' ? '' : 'Due in '} ${b.daysUntil === 0 ? 'Today' : `${b.daysUntil} day${b.daysUntil === 1 ? '' : 's'}`}`,
    amount: `${b.type === 'income' ? '+' : '−'}$${fmtD(b.amount)}`,
    variant: b.type === 'income' ? 'safe' : b.daysUntil <= 2 ? 'debt' : 'warn',
    highlight: b.type === 'income',
  }))

  // ── Narrative builder ─────────────────────────────────────
  function buildNarrative() {
    const parts = []

    // 1. Current window summary
    if (todayPayTotal > 0) {
      // Paycheck landed today
      parts.push(
        <span key="pay-today">
          Your <strong style={{ color: 'var(--safe)' }}>${fmt(todayPayTotal)}</strong> paycheck landed today.{' '}
        </span>
      )
    }

    if (w0Bills > 0 && daysUntilPay !== null) {
      parts.push(
        <span key="w0-bills">
          With only <strong style={{ color: 'var(--warn)' }}>${fmt(w0Bills)}</strong> in bills before your{' '}
          {daysUntilPay === 0
            ? 'paycheck today'
            : <><strong style={{ color: 'var(--safe)' }}>${fmt(w0NextPay?.amount)}</strong> paycheck on <strong>{fmtDate(w0?.endDate)}</strong></>
          }, you have <strong style={{ color: heroColor }}>${fmt(heroBalance)}</strong> free to spend.{' '}
        </span>
      )
    } else if (w0Bills === 0 && daysUntilPay !== null) {
      parts.push(
        <span key="w0-nobills">
          No bills before your paycheck on <strong>{fmtDate(w0?.endDate)}</strong> — you have <strong style={{ color: heroColor }}>${fmt(heroBalance)}</strong> free to spend.{' '}
        </span>
      )
    } else {
      // No upcoming paycheck on record
      parts.push(
        <span key="w0-nopay">
          Your <strong style={{ color: heroColor }}>${fmt(heroBalance)}</strong> balance after <strong style={{ color: 'var(--warn)' }}>${fmt(w0Bills)}</strong> in upcoming bills.{' '}
        </span>
      )
    }

    // 2. Next-window context — always shown when w1 has bills
    if (w1 && w1Bills > 0) {
      const w1PayDate   = fmtDate(w1?.endDate)
      const w1StartDate = fmtDate(w1?.startDate)
      const w1PayLabel  = w1PayTotal > 0 ? `$${fmt(w1PayTotal)} paycheck` : null

      parts.push(
        <span key="w1-warn">
          {w1IsTight && <strong style={{ color: 'var(--warn)' }}>Heads up: </strong>}
          <strong style={{ color: w1IsTight ? 'var(--debt)' : 'var(--warn)' }}>${fmt(w1Bills)}</strong> in bills
          between {w1StartDate}–{w1PayDate}{w1PayLabel ? <> covered mostly by your {w1PayLabel} ({w1Free >= 0 ? <strong style={{ color: 'var(--safe)' }}>${fmt(w1Free)} left over</strong> : <strong style={{ color: 'var(--debt)' }}>${fmt(Math.abs(w1Free))} short</strong>})</> : ' with no paycheck'}.
          {' '}So don't spend more than{' '}
          <strong style={{ color: safeToSpend >= 0 ? 'var(--safe)' : 'var(--debt)' }}>${fmt(safeToSpend)}</strong>
          {' '}before {w1PayDate}.{' '}
        </span>
      )
    }

    // 3. Verdict
    const verdict =
      heroBalance < 0           ? "You're underwater — move money now." :
      pressureLabel === 'CRITICAL' ? 'This is tight. Watch closely.' :
      pressureLabel === 'TIGHT'    ? 'A bit tight — keep an eye on spending.' :
      w1IsTight                  ? `Pressure gauge reads ${pressureLabel}.` :
      pressureLabel === 'WATCH'  ? 'Manageable, but stay aware.' :
                                   "You're in good shape."

    parts.push(<strong key="verdict" style={{ color: heroColor }}>{verdict}</strong>)
    return parts
  }


  // ── Pressure meter segments ──
  const segs = 20
  const filled = Math.round((Number(pressureScore) || 0) / 100 * segs)
  const meterSegs = Array.from({ length: segs }, (_, i) => {
    const frac = i / segs
    const c = frac < 0.55 ? 'var(--safe)' : frac < 0.8 ? 'var(--warn)' : 'var(--debt)'
    return { on: i < filled, color: c, pulse: i === filled - 1 }
  })

  const heroColorClass = heroBalance >= 0 ? 'g' : 'r'

  return (
    <ScreenWrap>
      <div className={styles.dash}>

        {/* ── Status bar ── */}
        <div className={styles.bar}>
          <div className={styles.barL}>
            <span className={styles.blink} />
            <span className={styles.grn}>Lumen · Live</span>
            <span>{today}</span>
          </div>
          <div>Balance ${fmt(balance)} · Pressure {pressureScore}/100</div>
        </div>

        {/* ── Metric grid ── */}
        <div className={styles.grid4}>
          <div className={`${styles.cell} ${styles.hero}`}>
            <div className={styles.cl}>
              <svg className={styles.coin} width="14" height="14" viewBox="0 0 8 8" aria-hidden>
                <rect x="2" y="0" width="4" height="1" fill="#ffc24a"/><rect x="1" y="1" width="6" height="1" fill="#ffc24a"/>
                <rect x="0" y="2" width="8" height="4" fill="#ffc24a"/><rect x="1" y="6" width="6" height="1" fill="#ffc24a"/>
                <rect x="2" y="7" width="4" height="1" fill="#ffc24a"/><rect x="3" y="2" width="1" height="4" fill="#c8902a"/>
              </svg> Free to spend
            </div>
            <div className={styles.cv} style={{ color: heroColor }}>${fmt(heroBalance)}</div>
            <div className={styles.cd}>this pay window</div>
          </div>

          <div className={`${styles.cell} ${styles.amb}`}>
            <div className={styles.cl}>Bills this window</div>
            <div className={styles.cv} style={{ color: 'var(--warn)' }}>${fmt(w0Bills)}</div>
            <div className={styles.cd}>{upcomingBills.filter(b => b.type !== 'income').length} items due</div>
          </div>

          <div className={`${styles.cell} ${styles.grn}`}>
            <div className={styles.cl}>Next paycheck</div>
            <div className={styles.cv} style={{ color: 'var(--safe)' }}>
              {w0NextPay ? `+$${fmt(w0NextPay.amount)}` : '—'}
            </div>
            <div className={styles.cd}>
              {daysUntilPay !== null ? (daysUntilPay === 0 ? 'today' : `in ${daysUntilPay} days`) : 'no paycheck'}
              {w0?.endDate ? ` · ${fmtDate(w0.endDate)}` : ''}
            </div>
          </div>

          <div className={`${styles.cell} ${styles.red}`}>
            <div className={styles.cl}>Pressure · {pressureLabel}</div>
            <div className={styles.meter}>
              {meterSegs.map((s, i) => (
                <span key={i} className={`${styles.seg} ${s.pulse ? styles.segPulse : ''}`}
                  style={{ background: s.on ? s.color : 'var(--bg-3)' }} />
              ))}
            </div>
            <div className={styles.cd}>{pressureScore} / 100</div>
          </div>
        </div>

        {/* ── Verdict ── */}
        <div className={styles.verdict}>
          <span className={styles.prose}>{buildNarrative()}</span>
        </div>

        {/* ── Paycheck Allocation (kept) ── */}
        <PaycheckAllocation />

        {/* ── Three principle zones ── */}
        <div className={styles.zones}>
          <div className={`${styles.zone} ${styles.now}`}>
            <div className={styles.zoneTag}>✦ Where I Am</div>
            <div className={styles.zoneVal} style={{ color: heroColor }}>${fmt(heroBalance)}</div>
            <div className={styles.zoneProse}>
              Free to spend this window{todayPayTotal > 0 ? ", including today's paycheck" : ''}.
            </div>
            <div className={styles.zoneRows}>
              <div className={styles.zoneRow}><span className={styles.zrn}>Balance</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>${fmt(balance)}</span></div>
              {todayPayTotal > 0 && (
                <div className={styles.zoneRow}><span className={styles.zrn}>Paycheck today</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+${fmt(todayPayTotal)}</span></div>
              )}
              <div className={styles.zoneRow}><span className={styles.zrn}>Bills this window</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−${fmt(w0Bills)}</span></div>
              <div className={styles.zoneRow}><span className={styles.zrn}>Free to spend</span><span className={styles.zrv} style={{ color: heroColor }}>${fmt(heroBalance)}</span></div>
            </div>
          </div>

          <div className={`${styles.zone} ${styles.was}`}>
            <div className={styles.zoneTag}>↩ What Happened</div>
            <div className={styles.zoneVal}>${fmt(monthSpent)}</div>
            <div className={styles.zoneProse}>
              Spent this month. Net change of{' '}
              <strong style={{ color: netChange >= 0 ? 'var(--safe)' : 'var(--debt)' }}>
                {netChange >= 0 ? '+' : '−'}${fmt(Math.abs(netChange))}
              </strong>.
            </div>
            <div className={styles.zoneRows}>
              <div className={styles.zoneRow}><span className={styles.zrn}>Income</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+${fmt(monthIncome)}</span></div>
              <div className={styles.zoneRow}><span className={styles.zrn}>Spending</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−${fmt(monthSpent)}</span></div>
              <div className={styles.zoneRow}><span className={styles.zrn}>Net</span><span className={styles.zrv} style={{ color: netChange >= 0 ? 'var(--safe)' : 'var(--debt)' }}>{netChange >= 0 ? '+' : '−'}${fmt(Math.abs(netChange))}</span></div>
            </div>
          </div>

          <div className={`${styles.zone} ${styles.nxt}`}>
            <div className={styles.zoneTag}>→ What's Coming</div>
            <div className={styles.zoneVal}>${fmt(w0Bills)}</div>
            <div className={styles.zoneProse}>
              {w0Bills > 0
                ? <>Bills this window. {w0NextPay ? <>Next paycheck <strong>{daysUntilPay === 0 ? 'today' : `in ${daysUntilPay} days`}</strong>.</> : ''}</>
                : 'No bills before next paycheck.'}
              {w1Bills > 0 && <> Then <strong style={{ color: w1IsTight ? 'var(--debt)' : 'var(--warn)' }}>${fmt(w1Bills)}</strong> after that.</>}
            </div>
            <div className={styles.zoneRows}>
              {upcomingBills.slice(0, 3).map(b => (
                <div key={b.id} className={styles.zoneRow}>
                  <span className={styles.zrn}>{b.icon} {b.name}</span>
                  <span className={styles.zrv} style={{ color: b.type === 'income' ? 'var(--safe)' : b.daysUntil <= 2 ? 'var(--debt)' : 'var(--warn)' }}>
                    {b.type === 'income' ? '+' : '−'}${fmt(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent activity + Bill schedule ── */}
        <div className={styles.cols2}>
          <div className={styles.panel}>
            <div className={styles.ph}><span>Recent activity</span><span className={styles.phA}>View all →</span></div>
            {recentTxns.length > 0 ? recentTxns.map(tx => {
              const isIncome = tx.tx_type === 'income' || Number(tx.amount) > 0
              return (
                <div key={tx.id} className={styles.row}>
                  <span className={styles.ic}>{tx.icon || '💳'}</span>
                  <span className={styles.nm}>{tx.cleaned_name || tx.name}</span>
                  <span className={styles.cat}>{fmtDate(tx.date)}</span>
                  <span className={styles.amt} style={{ color: isIncome ? 'var(--safe)' : 'var(--ink-0)' }}>
                    {isIncome ? '+' : '−'}${fmt(Math.abs(Number(tx.amount)))}
                  </span>
                </div>
              )
            }) : <div className={styles.empty}>No recent transactions.</div>}
          </div>

          <div className={styles.panel}>
            <div className={styles.ph}><span>Bill schedule</span><span className={styles.phA}>Calendar →</span></div>
            {billRows.length > 0 ? billRows.slice(0, 6).map(b => (
              <div key={b.id} className={styles.row}>
                <span className={styles.ic}>{b.highlight ? '💵' : '📄'}</span>
                <span className={styles.nm}>{b.name}</span>
                <span className={styles.cat}>{b.when}</span>
                <span className={styles.amt} style={{ color: b.variant === 'safe' ? 'var(--safe)' : b.variant === 'debt' ? 'var(--debt)' : 'var(--warn)' }}>
                  {b.amount}
                </span>
              </div>
            )) : <div className={styles.empty}>No upcoming bills.</div>}
          </div>
        </div>

        {/* ── Lumen insights (kept) ── */}
        <div className={styles.cols2}>
          <div className={styles.panel}>
            <div className={styles.ph}><span>Lumen noticed</span></div>
            <div className={styles.insightPad}>
              <LumenInsight
                label="Pressure & Bills"
                contextType="dashboard"
                prompt={`The dashboard shows $${Math.round(heroBalance).toLocaleString()} free to spend this pay window (balance minus bills due before next paycheck${w0NextPay ? `, which is in ${daysUntilPay} days` : ''}). In 2-3 sentences, comment on the current financial pressure — mention this exact number, any bills coming up, and whether it looks comfortable or tight.`}
                color="blue"
              />
            </div>
          </div>
          <div className={styles.panel}>
            <div className={styles.ph}><span>This month</span></div>
            <div className={styles.insightPad}>
              <LumenInsight
                label="This Month"
                contextType="dashboard"
                prompt="One finding about how this month is going — income, spending, or one category that stands out. Be specific with numbers."
                color="green"
              />
            </div>
          </div>
        </div>

      </div>
    </ScreenWrap>
  )
}
