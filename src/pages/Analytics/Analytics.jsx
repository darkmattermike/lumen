import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import styles from './Analytics.module.css'

const KPIS = [
  { label: 'Avg Monthly Spend', val: '$2,108', change: '↓ 4.2% vs last 3mo', up: true },
  { label: 'Savings Rate',      val: '25.7%',  change: '↑ 3.1pts vs last mo', up: true },
  { label: 'Net Worth Growth',  val: '$7,941',  change: '↑ 74% YTD gain',     up: true, color: 'var(--calm)' },
  { label: 'Subscriptions /mo', val: '$37',    change: '→ Stable',             up: null  },
]

const BARS = [
  { month: 'Dec', income: 78, spend: 68 },
  { month: 'Jan', income: 82, spend: 74 },
  { month: 'Feb', income: 82, spend: 80 },
  { month: 'Mar', income: 82, spend: 62 },
  { month: 'Apr', income: 82, spend: 70 },
  { month: 'May', income: 82, spend: 53, current: true },
]

const DONUT_ITEMS = [
  { label: 'Housing',     pct: '89%', color: 'rgba(93,202,165,.7)' },
  { label: 'Groceries',   pct: '7%',  color: 'rgba(108,140,255,.6)' },
  { label: 'Dining',      pct: '4%',  color: 'rgba(167,139,255,.6)' },
  { label: 'Transport',   pct: '3%',  color: 'rgba(240,176,76,.6)' },
  { label: 'Subs',        pct: '2%',  color: 'rgba(232,115,99,.6)' },
  { label: 'Other',       pct: '1%',  color: 'rgba(74,81,97,.4)' },
]

const INSIGHTS = [
  { type: 'good', label: 'Savings Velocity',  text: 'You\'re saving <strong>$730/month on average</strong> over the last 6 months — up from $590 in the prior 6. At this rate you\'ll hit your $12,000 savings goal in <strong>4.9 months.</strong>' },
  { type: 'warn', label: 'Dining Trend',       text: 'Dining spend has increased <strong>22% month-over-month</strong> for 3 consecutive months. Not alarming yet, but the trajectory is worth watching.' },
  { type: 'info', label: 'Income Stability',   text: 'Your paychecks have landed within <strong>±1 day of schedule</strong> for 12 consecutive months. Solid foundation for your emergency fund target.' },
  { type: 'good', label: 'Debt Paydown',       text: 'Student loan down to <strong>$6,000</strong> from $9,540 a year ago. At current rate, payoff date is <strong>Q3 2027</strong> — 8 months ahead of original schedule.' },
]

export default function Analytics() {
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
          {KPIS.map(k => (
            <div key={k.label} className={styles.kpi}>
              <div className={styles.kpiLabel}>{k.label}</div>
              <div className={styles.kpiVal} style={k.color ? { color: k.color } : {}}>{k.val}</div>
              <div
                className={styles.kpiChange}
                style={{ color: k.up === true ? 'var(--safe)' : k.up === false ? 'var(--debt)' : 'var(--ink-3)' }}
              >
                {k.change}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        {/* Cash flow bar chart */}
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
          <div className={styles.barChart}>
            {BARS.map(b => (
              <div key={b.month} className={styles.barGroup}>
                <div className={styles.barPair}>
                  <div
                    className={styles.bar}
                    style={{ height: `${b.income}%`, background: b.current ? 'rgba(93,202,165,.65)' : 'rgba(93,202,165,.3)' }}
                  />
                  <div
                    className={`${styles.bar} ${b.current ? styles.barDashed : ''}`}
                    style={{ height: `${b.spend}%`, background: b.current ? 'rgba(232,115,99,.65)' : 'rgba(232,115,99,.3)' }}
                  />
                </div>
                <div className={styles.barLabel} style={b.current ? { color: 'var(--safe)' } : {}}>
                  {b.month}{b.current ? ' ←' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.chartNote}>May is projected based on pace through May 17</div>
        </div>

        {/* Donut */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Spend by Category · May</div>
              <div className={styles.chartSub}>$1,511 total</div>
            </div>
          </div>
          <div className={styles.donutWrap}>
            <div className={styles.donut}>
              <div className={styles.donutHole}>
                <div className={styles.donutVal}>$1,511</div>
                <div className={styles.donutLbl}>Spent</div>
              </div>
            </div>
            <div className={styles.donutLegend}>
              {DONUT_ITEMS.map(d => (
                <div key={d.label} className={styles.dlItem}>
                  <div className={styles.dlDot} style={{ background: d.color }} />
                  <span className={styles.dlName}>{d.label}</span>
                  <span className={styles.dlPct}>{d.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lumen insights */}
        <div className={styles.insightPanel}>
          <div className={styles.insightPanelTag}>
            <LumenDot size={10} />
            Lumen Insights
          </div>
          {INSIGHTS.map(i => (
            <div key={i.label} className={`${styles.insight} ${styles[i.type]}`}>
              <div className={styles.insightLabel}>{i.label}</div>
              <div
                className={styles.insightText}
                dangerouslySetInnerHTML={{ __html: i.text }}
              />
            </div>
          ))}
        </div>
      </div>
    </ScreenWrap>
  )
}
