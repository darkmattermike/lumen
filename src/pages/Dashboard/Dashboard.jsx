import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import PressureGauge from '../../components/PressureGauge/PressureGauge'
import BillRow from '../../components/BillRow/BillRow'
import WhatIfTheater from '../../components/WhatIfTheater/WhatIfTheater'
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

const PRESSURE_OFFSET = { SAFE: 70, WATCH: 40, TIGHT: 15, CRITICAL: 0 }

export default function Dashboard() {
  const { data, loading, error } = useApi(api.dashboard)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const {
    balance, balanceAfterBills, committedBills,
    pressureLabel, pressureScore,
    monthSpent, monthIncome,
    upcomingBills, nextPaycheck,
  } = data

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const daysUntilPay = nextPaycheck?.daysUntil ?? null
  const netChange = monthIncome - monthSpent

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
          <LumenDot size={56} rings />
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
          <div className={styles.amount}>${fmt(balance)}</div>
          <div className={styles.prose}>
            After every bill <strong>already promised</strong> this cycle, you'll have{' '}
            <strong>${fmt(balanceAfterBills)}</strong> clear.
            {daysUntilPay !== null && daysUntilPay > 0 && (
              <> Next paycheck lands in <span className="b">{daysUntilPay} days</span>.</>
            )}
            {daysUntilPay === 0 && <> Paycheck lands <strong>today</strong>.</>}
            {' '}The pressure gauge reads <strong>{pressureLabel}</strong>.
          </div>
        </div>

        <div className={styles.rightCol}>
          <PressureGauge
            label={pressureLabel}
            sub={daysUntilPay !== null ? `${daysUntilPay === 0 ? 'Paycheck today' : `Paycheck in ${daysUntilPay} days`}` : ''}
            dashOffset={PRESSURE_OFFSET[pressureLabel] ?? 70}
          />
          <div className={styles.statStack}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>After Bills</span>
              <span className={styles.statVal} style={{ color: balanceAfterBills >= 0 ? 'var(--safe)' : 'var(--debt)' }}>
                ${fmt(balanceAfterBills)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Committed Bills</span>
              <span className={styles.statVal} style={{ color: 'var(--warn)' }}>${fmt(committedBills)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Four Principle Zones ── */}
      <div className={styles.zones}>
        {/* WHERE I AM */}
        <div className={`${styles.zone} ${styles.now}`}>
          <div className={styles.zoneTag}>✦ Where I Am</div>
          <div className={styles.zoneVal}>${fmt(balance)}</div>
          <div className={styles.zoneProse}>
            Checking live. <strong>${fmt(balanceAfterBills)}</strong> after all committed bills this cycle.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>Balance</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>${fmt(balance)}</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>After bills</span><span className={styles.zrv} style={{ color: balanceAfterBills >= 0 ? 'var(--safe)' : 'var(--debt)' }}>${fmt(balanceAfterBills)}</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Committed</span><span className={styles.zrv} style={{ color: 'var(--warn)' }}>−${fmt(committedBills)}</span></div>
          </div>
        </div>

        {/* WHAT HAPPENED */}
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

        {/* WHAT'S COMING */}
        <div className={`${styles.zone} ${styles.nxt}`}>
          <div className={styles.zoneTag}>→ What's Coming</div>
          <div className={styles.zoneVal}>${fmt(committedBills)}</div>
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

        {/* WHAT IF */}
        <div className={`${styles.zone} ${styles.ask}`}>
          <div className={styles.zoneTag}>✦ What If</div>
          <div className={styles.zoneVal}>Live</div>
          <div className={styles.zoneProse}>
            Any scenario — dinner, trip, subscription, purchase.{' '}
            <strong>Lumen runs it</strong> against your real numbers.
          </div>
          <div className={styles.quickChips}>
            <span className="wi-chip" style={{ fontSize: 11, padding: '6px 12px' }}>🍽️ Dinner</span>
            <span className="wi-chip" style={{ fontSize: 11, padding: '6px 12px' }}>✈️ Trip</span>
          </div>
        </div>
      </div>

      {/* ── Body: Theater + Aside ── */}
      <div className={styles.body}>
        <WhatIfTheater balance={balance} balanceAfterBills={balanceAfterBills} />

        <div className={styles.aside}>
          <div className={styles.asideLabel}>Bill Schedule</div>
          {billRows.length > 0
            ? billRows.map(b => <BillRow key={b.id} {...b} />)
            : <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 0' }}>No upcoming bills found. Add recurring bills in the Calendar.</div>
          }

          <div className={styles.asideLabel} style={{ marginTop: 16 }}>Lumen Noticed</div>
          <div className={styles.insightBlue}>
            <div className={styles.insightTag} style={{ color: 'rgba(108,140,255,0.7)' }}>
              <span className="pdot" style={{ background: 'rgba(108,140,255,0.7)' }} />
              Pressure Score
            </div>
            <div className={styles.insightText}>
              Committed bills are <strong style={{ color: 'rgba(108,140,255,0.85)' }}>{pressureScore}% of your balance</strong>.
              Pressure gauge: <strong style={{ color: 'rgba(108,140,255,0.85)' }}>{pressureLabel}</strong>.
            </div>
          </div>
          <div className={styles.insightGreen}>
            <div className={styles.insightTag} style={{ color: 'rgba(93,202,165,0.6)' }}>✦ This Month</div>
            <div className={styles.insightText}>
              <strong style={{ color: 'rgba(93,202,165,0.8)' }}>${fmt(monthIncome)}</strong> in,{' '}
              <strong style={{ color: 'var(--debt)' }}>${fmt(monthSpent)}</strong> out.
              Net: <strong style={{ color: netChange >= 0 ? 'var(--safe)' : 'var(--debt)' }}>
                {netChange >= 0 ? '+' : '−'}${fmt(Math.abs(netChange))}
              </strong>.
            </div>
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
