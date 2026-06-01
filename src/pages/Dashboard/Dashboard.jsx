import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import PressureGauge from '../../components/PressureGauge/PressureGauge'
import BillRow from '../../components/BillRow/BillRow'
import WhatIfTheater from '../../components/WhatIfTheater/WhatIfTheater'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import HealthScore from '../../components/HealthScore/HealthScore'
import { AnimatedNumber } from '../../hooks/useCountUp'
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
  const [y, m, d] = isoStr.split('-').map(Number)
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
  const recentTxns  = (txData?.currentMonth || []).slice(0, 8)

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

  return (
    <ScreenWrap>
      {/* Mobile ambient glow */}
      <div className={styles.mobileGlow} aria-hidden />
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.dotCol}>
          <LumenDot
            size={56}
            rings
            mood={pressureLabel === 'CRITICAL' ? 'thinking' : pressureLabel === 'TIGHT' ? 'thinking' : pressureLabel === 'SAFE' ? 'happy' : 'idle'}
            tooltip={pressureLabel === 'CRITICAL' ? 'This is tight. Watch spending.' : pressureLabel === 'SAFE' ? "Looking good 👀" : null}
          />
          <div className={styles.dotMeta}>
            <div className={styles.dotLabel}>Lumen</div>
            <div className={styles.dotStatus}>
              <span className="pdot" />
              <span>Live</span>
            </div>
          </div>
        </div>

        <div className={styles.balanceCol}>
          <div className={styles.pre}>◈ FREE TO SPEND · {today}</div>
          <AnimatedNumber value={heroBalance} prefix="$" className={styles.amount} style={{ color: heroColor }} duration={1000} />
          <div className={styles.prose}>{buildNarrative()}</div>
        </div>

        <div className={styles.rightCol}>
          <PressureGauge
            label={pressureLabel}
            sub={daysUntilPay !== null ? (daysUntilPay === 0 ? 'Paycheck today' : `Paycheck in ${daysUntilPay} days`) : ''}
            score={pressureScore}
          />
          <div className={styles.statStack}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>After Bills</span>
              <AnimatedNumber value={heroBalance} prefix="$" className={styles.statVal} style={{ color: heroBalance >= 0 ? 'var(--safe)' : 'var(--debt)' }} />
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Bills this window</span>
              <AnimatedNumber value={w0Bills} prefix="$" className={styles.statVal} style={{ color: 'var(--warn)' }} />
            </div>
            {w1Bills > 0 && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Next window bills</span>
                <AnimatedNumber value={w1Bills} prefix="$" className={styles.statVal} style={{ color: w1IsTight ? 'var(--debt)' : 'var(--warn)' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Paycheck Allocation — shown on both mobile and desktop ── */}
      <PaycheckAllocation />

      {/* ── Desktop only: Health Score + Zones + Body ── */}
      <div className={styles.desktopOnly}>
      <HealthScore />

      {/* ── Four Principle Zones ── */}
      <div className={styles.zones}>
        {/* WHERE I AM */}
        <div className={`${styles.zone} ${styles.now}`}>
          <div className={styles.zoneTag}>✦ Where I Am</div>
          <AnimatedNumber value={heroBalance} prefix="$" className={styles.zoneVal} style={{ color: heroColor }} />
          <div className={styles.zoneProse}>
            Free to spend this window{todayPayTotal > 0 ? ', including today\'s paycheck' : ''}.
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

        {/* WHAT HAPPENED */}
        <div className={`${styles.zone} ${styles.was}`}>
          <div className={styles.zoneTag}>↩ What Happened</div>
          <AnimatedNumber value={monthSpent} prefix="$" className={styles.zoneVal} />
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

        {/* WHAT'S COMING */}
        <div className={`${styles.zone} ${styles.nxt}`}>
          <div className={styles.zoneTag}>→ What's Coming</div>
          <AnimatedNumber value={w0Bills} prefix="$" className={styles.zoneVal} />
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

      {/* ── Body: Theater + Aside ── */}
      <div className={styles.body}>
        <div ref={theaterRef}>
          <WhatIfTheater balance={heroBalance} balanceAfterBills={balanceAfterBills} activePlans={activePlans} plannedSpend={plannedSpend} />
        </div>

        <div className={styles.aside}>
          <div className={styles.asideLabel}>Bill Schedule</div>
          {billRows.length > 0
            ? billRows.map((b, i) => <BillRow key={b.id} {...b} style={{ '--row-delay': `${i * 40}ms` }} />)
            : <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 0' }}>No upcoming bills found. Add recurring bills in the Calendar.</div>
          }

          <div className={styles.asideLabel} style={{ marginTop: 16 }}>Lumen Noticed</div>
          <LumenInsight
            label="Pressure & Bills"
            contextType="dashboard"
            prompt={`The dashboard shows $${Math.round(heroBalance).toLocaleString()} free to spend this pay window (balance minus bills due before next paycheck${w0NextPay ? `, which is in ${daysUntilPay} days` : ''}). In 2-3 sentences, comment on the current financial pressure — mention this exact number, any bills coming up, and whether it looks comfortable or tight.`}
            color="blue"
          />
          <LumenInsight
            label="This Month"
            contextType="dashboard"
            prompt="One finding about how this month is going — income, spending, or one category that stands out. Be specific with numbers."
            color="green"
          />
        </div>
      </div>
      </div>{/* end desktopOnly */}

      {/* ══ MOBILE ONLY: Budget ledger + recent transactions ══ */}
      <div className={styles.mobileOnly}>

        {/* Budget ledger */}
        {topBudgets.length > 0 && (
          <div className={styles.mobileBudgets}>
            <div className={styles.mobileSectionLabel}>Month so far</div>
            {topBudgets.map(cat => {
              const spent  = Number(cat.spent || 0)
              const cap    = Number(cat.cap   || 0)
              const pct    = cap > 0 ? Math.min((spent / cap) * 100, 100) : 0
              const color  = COLOR_MAP[cat.color] || 'var(--safe)'
              const isOver = cap > 0 && spent > cap
              const val    = isOver
                ? `$${fmt(spent - cap)} over`
                : `$${fmt(cap - spent)} left`
              return (
                <div key={cat.id} className={styles.mobileBudgetRow}>
                  <span className={styles.mobileBudgetName}>{cat.icon} {cat.name}</span>
                  <span className={styles.mobileBudgetBar}>
                    <span
                      className={styles.mobileBudgetFill}
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </span>
                  <span className={styles.mobileBudgetVal} style={{ color: isOver ? 'var(--warn)' : color }}>
                    {val}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Divider */}
        <div className={styles.mobileDivider} />

        {/* Recent transactions */}
        {recentTxns.length > 0 && (
          <div className={styles.mobileTxns}>
            <div className={styles.mobileSectionLabel}>Activity</div>
            {recentTxns.map(tx => {
              const isIncome  = tx.tx_type === 'income' || Number(tx.amount) > 0
              const amtColor  = isIncome ? 'var(--safe)' : 'var(--ink-1)'
              const prefix    = isIncome ? '+' : '−'
              return (
                <div key={tx.id} className={styles.mobileTxRow}>
                  <span className={styles.mobileTxIcon}>{tx.icon || '💳'}</span>
                  <span className={styles.mobileTxBody}>
                    <span className={styles.mobileTxName}>{tx.cleaned_name || tx.name}</span>
                    <span className={styles.mobileTxDate}>{fmtDate(tx.date)}</span>
                  </span>
                  <span className={styles.mobileTxAmt} style={{ color: amtColor }}>
                    {prefix}${fmt(Math.abs(Number(tx.amount)))}
                  </span>
                </div>
              )
            })}
          </div>
        )}

      </div>

    </ScreenWrap>
  )
}
