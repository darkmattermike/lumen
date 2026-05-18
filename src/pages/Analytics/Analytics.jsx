import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Analytics.module.css'

function fmtK(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const CHART_COLORS = [
  'rgba(93,202,165,.7)',
  'rgba(108,140,255,.6)',
  'rgba(167,139,255,.6)',
  'rgba(240,176,76,.6)',
  'rgba(232,115,99,.6)',
  'rgba(74,81,97,.4)',
]

export default function Analytics() {
  const { data, loading, error } = useApi(api.analytics)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { cashFlow = [], byCategory = [], kpis = {} } = data
  const { avgMonthlySpend = 0, savingsRate = 0, savingsBalance = 0 } = kpis

  // Normalize bar heights for chart
  const maxFlow = Math.max(...cashFlow.map(m => Math.max(Number(m.income), Number(m.spending))), 1)
  const currentMonth = cashFlow[cashFlow.length - 1]?.month

  // Donut total
  const catTotal = byCategory.reduce((s, c) => s + Number(c.total), 0)

  // Build conic gradient for donut
  let cumDeg = 0
  const donutSegments = byCategory.slice(0, 6).map((c, i) => {
    const pct = catTotal > 0 ? (Number(c.total) / catTotal) : 0
    const deg = pct * 360
    const seg = `${CHART_COLORS[i] || 'rgba(74,81,97,.4)'} ${cumDeg}deg ${cumDeg + deg}deg`
    cumDeg += deg
    return seg
  })
  const donutGradient = donutSegments.length > 0
    ? `conic-gradient(${donutSegments.join(', ')})`
    : 'conic-gradient(rgba(74,81,97,.3) 0deg 360deg)'

  // Insights from real data
  const insights = []
  if (savingsRate > 0) {
    insights.push({ type: 'good', label: 'Savings Rate', text: `You're saving <strong>${savingsRate}% of income</strong> on average. ${savingsRate > 20 ? 'That\'s strong — above the recommended 20%.' : 'Getting closer to the 20% benchmark.'}` })
  }
  if (avgMonthlySpend > 0) {
    insights.push({ type: 'info', label: 'Avg Monthly Spend', text: `Your 3-month average spend is <strong>$${fmtK(avgMonthlySpend)}/month</strong>. Use this as your baseline when planning.` })
  }
  if (byCategory.length > 0) {
    const top = byCategory[0]
    const topPct = catTotal > 0 ? Math.round((Number(top.total) / catTotal) * 100) : 0
    insights.push({ type: topPct > 50 ? 'warn' : 'info', label: 'Largest Category', text: `<strong>${top.category.replace(/_/g, ' ')}</strong> is your biggest spend this month at <strong>$${fmtK(top.total)}</strong> (${topPct}% of total spending).` })
  }
  if (savingsBalance > 0) {
    insights.push({ type: 'good', label: 'Savings Balance', text: `Savings account at <strong>$${fmtK(savingsBalance)}</strong>. Keep building — aim for 3–6 months of expenses as your emergency fund.` })
  }

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div className={styles.pre}>⌁ What Happened · What's Coming</div>
        <div className={styles.title}>Analytics</div>
        <div className={styles.sub}>
          Lumen surfaces the patterns in your data you wouldn't notice on your own —
          seasonal drift, category creep, income-to-spending ratios, savings velocity.
        </div>
        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>Avg Monthly Spend</div>
            <div className={styles.kpiVal}>${fmtK(avgMonthlySpend)}</div>
            <div className={styles.kpiChange} style={{ color: 'var(--ink-3)' }}>3-month average</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>Savings Rate</div>
            <div className={styles.kpiVal} style={{ color: savingsRate >= 20 ? 'var(--safe)' : 'var(--warn)' }}>{savingsRate}%</div>
            <div className={styles.kpiChange} style={{ color: savingsRate >= 20 ? 'var(--safe)' : 'var(--warn)' }}>{savingsRate >= 20 ? '↑ Above target' : '↓ Below 20% goal'}</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>Savings Balance</div>
            <div className={styles.kpiVal} style={{ color: 'var(--calm)' }}>${fmtK(savingsBalance)}</div>
            <div className={styles.kpiChange} style={{ color: 'var(--ink-3)' }}>Current balance</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>Top Category</div>
            <div className={styles.kpiVal} style={{ fontSize: 18 }}>{byCategory[0]?.category?.replace(/_/g, ' ') || '—'}</div>
            <div className={styles.kpiChange} style={{ color: 'var(--ink-3)' }}>${fmtK(byCategory[0]?.total || 0)} this month</div>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* Cash flow chart */}
        <div className={`${styles.chartCard} ${styles.full}`}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Monthly Cash Flow · 6 Months</div>
              <div className={styles.chartSub}>Income vs. total spend</div>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}><span style={{ background: 'var(--safe)' }} className={styles.legendDot} />Income</span>
              <span className={styles.legendItem}><span style={{ background: 'var(--debt)' }} className={styles.legendDot} />Spending</span>
            </div>
          </div>
          {cashFlow.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              Not enough data yet. Transactions will appear here once synced.
            </div>
          ) : (
            <div className={styles.barChart}>
              {cashFlow.map(m => {
                const iH = Math.round((Number(m.income)  / maxFlow) * 100)
                const sH = Math.round((Number(m.spending) / maxFlow) * 100)
                const isCurrent = m.month === currentMonth
                return (
                  <div key={m.month} className={styles.barGroup}>
                    <div className={styles.barPair}>
                      <div className={styles.bar} style={{ height: `${iH}%`, background: isCurrent ? 'rgba(93,202,165,.65)' : 'rgba(93,202,165,.3)' }} />
                      <div className={`${styles.bar} ${isCurrent ? styles.barDashed : ''}`} style={{ height: `${sH}%`, background: isCurrent ? 'rgba(232,115,99,.65)' : 'rgba(232,115,99,.3)' }} />
                    </div>
                    <div className={styles.barLabel} style={isCurrent ? { color: 'var(--safe)' } : {}}>{m.month}{isCurrent ? ' ←' : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
          <div className={styles.chartNote}>Current month is projected based on transactions to date</div>
        </div>

        {/* Donut */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Spend by Category · This Month</div>
              <div className={styles.chartSub}>${fmtK(catTotal)} total</div>
            </div>
          </div>
          {byCategory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>No spending data yet.</div>
          ) : (
            <div className={styles.donutWrap}>
              <div className={styles.donut} style={{ background: donutGradient }}>
                <div className={styles.donutHole}>
                  <div className={styles.donutVal}>${fmtK(catTotal)}</div>
                  <div className={styles.donutLbl}>Spent</div>
                </div>
              </div>
              <div className={styles.donutLegend}>
                {byCategory.slice(0, 6).map((c, i) => (
                  <div key={c.category} className={styles.dlItem}>
                    <div className={styles.dlDot} style={{ background: CHART_COLORS[i] }} />
                    <span className={styles.dlName}>{c.category.replace(/_/g, ' ')}</span>
                    <span className={styles.dlPct}>{catTotal > 0 ? Math.round((Number(c.total) / catTotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className={styles.insightPanel}>
          <div className={styles.insightPanelTag}>
            <LumenDot size={10} />
            Lumen Insights
          </div>
          {insights.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65 }}>
              Sync more transactions to unlock insights.
            </div>
          ) : insights.map((ins, i) => (
            <div key={i} className={`${styles.insight} ${styles[ins.type]}`}>
              <div className={styles.insightLabel}>{ins.label}</div>
              <div className={styles.insightText} dangerouslySetInnerHTML={{ __html: ins.text }} />
            </div>
          ))}
        </div>
      </div>
    </ScreenWrap>
  )
}
