import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import PressureGauge from '../../components/PressureGauge/PressureGauge'
import BillRow from '../../components/BillRow/BillRow'
import WhatIfTheater from '../../components/WhatIfTheater/WhatIfTheater'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import CashFlowChart from '../../components/CashFlowChart/CashFlowChart'
import HealthScore from '../../components/HealthScore/HealthScore'
import { AnimatedNumber } from '../../hooks/useCountUp'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Dashboard.module.css'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtD(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const LABEL_COLOR = { SAFE: 'var(--safe)', WATCH: 'var(--warn)', TIGHT: 'var(--warn)', CRITICAL: 'var(--debt)' }

export default function Dashboard() {
  const { data, loading, error } = useApi(api.dashboard)
  const navigate = useNavigate()
  const theaterRef = useRef(null)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const {
    balance, balanceAfterBills, balanceAfterPlans, committedBills, upcomingPayTotal = 0,
    pressureLabel, pressureScore,
    monthSpent, monthIncome,
    upcomingBills, nextPaycheck,
    activePlans = [], plannedSpend = 0, plannedSavings = 0,
  } = data

  const today       = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const daysUntilPay  = nextPaycheck?.daysUntil ?? null
  const netChange     = monthIncome - monthSpent
  const hasPlans      = activePlans.length > 0
  const heroBalance   = hasPlans ? (balanceAfterPlans ?? balanceAfterBills) : balanceAfterBills
  const heroColor     = heroBalance >= 0 ? 'var(--safe)' : 'var(--debt)'

  // Build bill rows for aside
  const billRows = upcomingBills.map(b => ({
    id: b.id,
    name: b.name,
    when: `${b.type === 'income' ? '' : 'Due in '} ${b.daysUntil === 0 ? 'Today' : `${b.daysUntil} day${b.daysUntil === 1 ? '' : 's'}`}`,
    amount: `${b.type === 'income' ? '+' : '−'}$${fmtD(b.amount)}`,
    variant: b.type === 'income' ? 'safe' : b.daysUntil <= 2 ? 'debt' : 'warn',
    highlight: b.type === 'income',
  }))

  return (
    <ScreenWrap>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.dotCol}>
          <LumenDot
              size={56}
              rings
              mood={pressureLabel === 'CRITICAL' ? 'alert' : pressureLabel === 'TIGHT' ? 'thinking' : pressureLabel === 'SAFE' ? 'happy' : 'idle'}
              tooltip={pressureLabel === 'CRITICAL' ? 'This is tight. Look at me.' : pressureLabel === 'SAFE' ? "Looking good 👀" : null}
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
          <div className={styles.prose}>
            Balance is <strong>${fmt(balance)}</strong>. After remaining bills{upcomingPayTotal > 0 ? ' and incoming paychecks' : ''} this cycle
            {' '}you'll have <strong style={{ color: heroColor }}>${fmt(heroBalance)}</strong> free.
            {daysUntilPay !== null && daysUntilPay > 0 && (
              <> Next paycheck in <span className="b">{daysUntilPay} days</span>.</>
            )}
            {daysUntilPay === 0 && <> Paycheck lands <strong>today</strong>.</>}
            {' '}Pressure reads <strong style={{ color: heroColor }}>{pressureLabel}</strong>.
          </div>
        </div>

        <div className={styles.rightCol}>
          <PressureGauge
            label={pressureLabel}
            sub={daysUntilPay !== null ? `${daysUntilPay === 0 ? 'Paycheck today' : `Paycheck in ${daysUntilPay} days`}` : ''}
            score={pressureScore}
          />
          <div className={styles.statStack}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>After Bills</span>
              <AnimatedNumber value={heroBalance} prefix="$" className={styles.statVal} style={{ color: heroBalance >= 0 ? 'var(--safe)' : 'var(--debt)' }} />
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Committed Bills</span>
              <AnimatedNumber value={committedBills} prefix="$" className={styles.statVal} style={{ color: 'var(--warn)' }} />
            </div>
          </div>
        </div>
      </div>
      {/* ── Phase I: Health Score ── */}
      <HealthScore />

      {/* ── Four Principle Zones ── */}
      <div className={styles.zones}>
        {/* WHERE I AM */}
        <div className={`${styles.zone} ${styles.now}`}>
          <div className={styles.zoneTag}>✦ Where I Am</div>
          <AnimatedNumber value={heroBalance} prefix="$" className={styles.zoneVal} style={{ color: heroColor }} />
          <div className={styles.zoneProse}>
            Free to spend after bills{data.upcomingPayTotal > 0 ? ' and pay' : ''} this cycle.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>Balance</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>${fmt(balance)}</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Bills remaining</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−${fmt(committedBills)}</span></div>
            {data.upcomingPayTotal > 0 && (
              <div className={styles.zoneRow}><span className={styles.zrn}>Income coming</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+${fmt(data.upcomingPayTotal)}</span></div>
            )}
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
          <AnimatedNumber value={committedBills} prefix="$" className={styles.zoneVal} />
          <div className={styles.zoneProse}>
            {upcomingBills.length > 0
              ? <>Bills due this cycle. {nextPaycheck ? <>Paycheck in <strong>{nextPaycheck.daysUntil} days</strong>.</> : ''}</>
              : 'No upcoming bills on record.'}
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
        <WhatIfTheater balance={balance} balanceAfterBills={balanceAfterBills} activePlans={activePlans} plannedSpend={plannedSpend} />
        </div>

        <div className={styles.aside}>
          {/* Phase D: Cash Flow Forecast Chart */}
          <CashFlowChart />

          <div className={styles.asideLabel}>Bill Schedule</div>
          {billRows.length > 0
            ? billRows.map(b => <BillRow key={b.id} {...b} />)
            : <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 0' }}>No upcoming bills found. Add recurring bills in the Calendar.</div>
          }

          <div className={styles.asideLabel} style={{ marginTop: 16 }}>Lumen Noticed</div>
          <LumenInsight
            label="Pressure & Bills"
            contextType="dashboard"
            prompt="What is the single most important thing about my current financial pressure right now — consider upcoming bills, balance, any skip plans, and incoming paychecks."
            color="blue"
          />
          <LumenInsight
            label="This Month"
            contextType="dashboard"
            prompt="One finding about how this month is going — income, spending, or one category that stands out."
            color="green"
          />
        </div>
      </div>
    </ScreenWrap>
  )
}
