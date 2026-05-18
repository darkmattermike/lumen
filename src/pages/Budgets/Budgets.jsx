import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Budgets.module.css'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtK(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const COLOR_MAP = { debt: 'var(--debt)', warn: 'var(--warn)', safe: 'var(--safe)', calm: 'var(--calm)', goal: 'var(--goal)' }
const today = new Date()
const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
const daysLeft = daysInMonth - today.getDate()
const monthName = today.toLocaleString('en-US', { month: 'long' })

export default function Budgets() {
  const { data, loading, error } = useApi(api.budgets)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { budgets = [], totalBudgeted = 0, totalSpent = 0 } = data
  const totalPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // Auto-generate insights from real data
  const insights = budgets
    .filter(b => b.pct > 75)
    .map(b => ({
      head: `${b.name} at ${b.pct}% of budget`,
      body: `$${fmt(b.spent)} spent of your $${fmtK(b.cap)} cap with ${daysLeft} days left. ${b.pct > 100 ? 'Already over budget.' : `On pace to ${b.pct > 85 ? 'overshoot' : 'stay close'}.`}`,
      tagType: b.pct > 100 ? 'warn' : b.pct > 85 ? 'warn' : 'save',
      tag: b.pct > 100 ? '⚠ Over Budget' : '⚠ Watch This',
    }))

  const underBudget = budgets.filter(b => b.pct < 50 && b.cap > 0)
  underBudget.forEach(b => {
    insights.push({
      head: `${b.name} well under budget`,
      body: `Only $${fmt(b.spent)} of $${fmtK(b.cap)} used (${b.pct}%). You have $${fmt(b.cap - b.spent)} remaining.`,
      tagType: 'save',
      tag: '↓ On Track',
    })
  })

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>◎ Where I Am · What Happened</div>
          <div className={styles.title}>Budgets</div>
          <div className={styles.sub}>
            Lumen tracks every category in real time and flags overspend before it happens.
            Soft caps you set, hard limits Lumen enforces invisibly.
          </div>
        </div>
        <div className={styles.monthTotal}>
          <div className={styles.mtLabel}>Total Budgeted · {monthName}</div>
          <div className={styles.mtAmt}>${fmtK(totalBudgeted)}</div>
          <div className={styles.mtSub}>${fmtK(totalSpent)} spent · {totalPct}% used · {daysLeft} days left</div>
        </div>
      </div>

      <div className={styles.body}>
        <div>
          <div className="section-label" style={{ marginBottom: 16 }}>Active Categories</div>
          {budgets.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.65 }}>
              No budget categories set up yet. Add them in your database to start tracking.
            </div>
          ) : budgets.map(cat => {
            const color = COLOR_MAP[cat.color] || 'var(--safe)'
            const pct   = Math.min(cat.pct, 100)
            const isOver = cat.pct > 100
            return (
              <div key={cat.id} className={styles.catCard}>
                <div className={styles.catHeader}>
                  <div className={styles.catIcon}>{cat.icon || '📦'}</div>
                  <div>
                    <div className={styles.catName}>{cat.name}</div>
                    <div className={styles.catPeriod}>{cat.period} · {cat.pct}% used</div>
                  </div>
                  <div className={styles.catNums}>
                    <div className={styles.catSpent} style={{ color: isOver ? 'var(--debt)' : color }}>${fmt(cat.spent)}</div>
                    <div className={styles.catCap}>of ${fmtK(cat.cap)} cap</div>
                  </div>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%`, background: isOver ? 'var(--debt)' : color, opacity: 0.6 }} />
                </div>
                {isOver && (
                  <div className={styles.catWarn}>
                    <span className="pdot" style={{ background: 'var(--debt)' }} />
                    Over budget by ${fmt(cat.spent - cat.cap)}
                  </div>
                )}
                {!isOver && cat.pct > 80 && (
                  <div className={styles.catWarn}>
                    <span className="pdot" style={{ background: 'var(--warn)' }} />
                    {cat.pct}% used — {daysLeft} days remain. Pace carefully.
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 16 }}>Lumen Analysis</div>
          <div className={styles.aiRecs}>
            <div className={styles.aiTag}>
              <LumenDot size={10} />
              AI Budget Analysis
            </div>
            {insights.length === 0 ? (
              <div className={styles.aiRec}>
                <div className={styles.aiRecHead}>All budgets on track</div>
                <div className={styles.aiRecBody}>
                  You're at {totalPct}% of your total budget with {daysLeft} days remaining this month. Everything looks healthy.
                </div>
                <div className={`${styles.aiRecTag} ${styles.tagSave}`}>↓ Looking Good</div>
              </div>
            ) : insights.map((r, i) => (
              <div key={i} className={styles.aiRec}>
                <div className={styles.aiRecHead}>{r.head}</div>
                <div className={styles.aiRecBody}>{r.body}</div>
                <div className={`${styles.aiRecTag} ${r.tagType === 'save' ? styles.tagSave : styles.tagWarn}`}>
                  {r.tag}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Budget Summary</div>
            <div className={styles.rolloverCard}>
              <div className={styles.rolloverNote}>
                Your spending vs budget caps for {monthName}.
              </div>
              {budgets.map(b => (
                <div key={b.id} className={styles.rolloverRow}>
                  <span className={styles.rolloverName}>{b.icon} {b.name}</span>
                  <span className={styles.rolloverAmt} style={{ color: b.pct > 100 ? 'var(--debt)' : 'var(--safe)' }}>
                    ${fmt(b.cap - b.spent)} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
