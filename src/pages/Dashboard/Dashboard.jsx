import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import PressureGauge from '../../components/PressureGauge/PressureGauge'
import BillRow from '../../components/BillRow/BillRow'
import WhatIfTheater from '../../components/WhatIfTheater/WhatIfTheater'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import CashFlowChart from '../../components/CashFlowChart/CashFlowChart'
import HealthScore from '../../components/HealthScore/HealthScore'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { useCountUp } from '../../hooks/useAnimation'
import { api } from '../../data/api'
import styles from './Dashboard.module.css'

function fmtD(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Animated dollar display
function AnimatedAmount({ value, color, className, decimals = 0 }) {
  const display = useCountUp(Number(value || 0), { duration: 900, decimals })
  return <span className={className} style={color ? { color } : undefined}>${display}</span>
}

const LUMEN_MOOD = {
  CRITICAL: 'alert',
  TIGHT:    'thinking',
  WATCH:    'thinking',
  SAFE:     'happy',
}

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

  const today         = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const daysUntilPay  = nextPaycheck?.daysUntil ?? null
  const netChange     = monthIncome - monthSpent
  const hasPlans      = activePlans.length > 0
  const heroBalance   = hasPlans ? (balanceAfterPlans ?? balanceAfterBills) : balanceAfterBills
  const heroColor     = heroBalance >= 0 ? 'var(--safe)' : 'var(--debt)'
  const mood          = LUMEN_MOOD[pressureLabel] || 'idle'

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
            mood={mood}
            tooltip={
              pressureLabel === 'CRITICAL' ? 'This is tight. Look at me.' :
              pressureLabel === 'SAFE'     ? 'Looking good 👀' : null
            }
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
          <AnimatedAmount value={heroBalance} color={heroColor} className={styles.amount} />
          <div className={styles.prose}>
            Balance is <strong><AnimatedAmount value={balance} /></strong>.
            After remaining bills{upcomingPayTotal > 0 ? ' and incoming paychecks' : ''} this cycle
            {' '}you'll have <strong style={{ color: heroColor }}><AnimatedAmount value={heroBalance} /></strong> free.
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
              <AnimatedAmount value={heroBalance} color={heroBalance >= 0 ? 'var(--safe)' : 'var(--debt)'} className={styles.statVal} />
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Committed Bills</span>
              <AnimatedAmount value={committedBills} color="var(--warn)" className={styles.statVal} />
            </div>
          </div>
        </div>
      </div>

      <HealthScore />

      {/* ── Four zones ── */}
      <div className={styles.zones}>
        <div className={`${styles.zone} ${styles.now}`}>
          <div className={styles.zoneTag}>✦ Where I Am</div>
          <AnimatedAmount value={heroBalance} color={heroColor} className={styles.zoneVal} />
          <div className={styles.zoneProse}>
            Free to spend after bills{data.upcomingPayTotal > 0 ? ' and pay' : ''} this cycle.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>Balance</span><AnimatedAmount value={balance} color="var(--safe)" className={styles.zrv} /></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Bills remaining</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−<AnimatedAmount value={committedBills} /></span></div>
            {data.upcomingPayTotal > 0 && (
              <div className={styles.zoneRow}><span className={styles.zrn}>Income coming</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+<AnimatedAmount value={data.upcomingPayTotal} /></span></div>
            )}
            <div className={styles.zoneRow}><span className={styles.zrn}>Free to spend</span><AnimatedAmount value={heroBalance} color={heroColor} className={styles.zrv} /></div>
          </div>
        </div>

        <div className={`${styles.zone} ${styles.was}`}>
          <div className={styles.zoneTag}>↩ What Happened</div>
          <AnimatedAmount value={monthSpent} className={styles.zoneVal} />
          <div className={styles.zoneProse}>
            Spent this month. Net change of{' '}
            <strong style={{ color: netChange >= 0 ? 'var(--safe)' : 'var(--debt)' }}>
              {netChange >= 0 ? '+' : '−'}<AnimatedAmount value={Math.abs(netChange)} />
            </strong>.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>Income</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+<AnimatedAmount value={monthIncome} /></span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Spending</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−<AnimatedAmount value={monthSpent} /></span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Net</span><span className={styles.zrv} style={{ color: netChange >= 0 ? 'var(--safe)' : 'var(--debt)' }}>{netChange >= 0 ? '+' : '−'}<AnimatedAmount value={Math.abs(netChange)} /></span></div>
          </div>
        </div>

        <div className={`${styles.zone} ${styles.nxt}`}>
          <div className={styles.zoneTag}>→ What's Coming</div>
          <AnimatedAmount value={committedBills} className={styles.zoneVal} />
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
                  {b.type === 'income' ? '+' : '−'}${fmtD(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        <div ref={theaterRef}>
          <WhatIfTheater balance={balance} balanceAfterBills={balanceAfterBills} activePlans={activePlans} plannedSpend={plannedSpend} />
        </div>

        <div className={styles.aside}>
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
