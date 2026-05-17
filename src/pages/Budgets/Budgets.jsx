import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { BUDGET_CATEGORIES } from '../../data/mock'
import styles from './Budgets.module.css'

const AI_RECS = [
  { head: 'Dining budget will overshoot', body: 'At your current pace you\'ll spend ~$230 this month vs. your $200 cap. Consider skipping 1–2 restaurant meals in the final two weeks.', tag: '⚠ Soft Overshoot', tagType: 'warn' },
  { head: 'Grocery savings opportunity', body: 'You have $188 left in groceries for the month. Your last 3 months average $260. Trending toward a record low — driven by Whole Foods vs delivery apps.', tag: '↓ Positive Drift', tagType: 'save' },
  { head: 'Uber usage spike detected', body: '4 Uber charges this month vs your 1.3/month average over 90 days. At this rate you\'ll exceed your $80 transport cap by ~$22.', tag: '⚠ Unusual Pattern', tagType: 'warn' },
  { head: 'Subscription audit suggestion', body: 'You have 3 active streaming services. Netflix and Spotify are both active but Netflix watch history shows only 2 hours this month.', tag: '↓ Potential $15/mo saving', tagType: 'save' },
]

export default function Budgets() {
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
          <div className={styles.mtLabel}>Total Budgeted · May</div>
          <div className={styles.mtAmt}>$2,400</div>
          <div className={styles.mtSub}>$1,511 spent · 63% used · 13 days left</div>
        </div>
      </div>

      <div className={styles.body}>
        <div>
          <div className="section-label" style={{ marginBottom: 16 }}>Active Categories</div>
          {BUDGET_CATEGORIES.map(cat => {
            const pct = Math.round((cat.spent / cat.cap) * 100)
            return (
              <div key={cat.id} className={styles.catCard}>
                <div className={styles.catHeader}>
                  <div className={styles.catIcon}>{cat.icon}</div>
                  <div>
                    <div className={styles.catName}>{cat.name}</div>
                    <div className={styles.catPeriod}>{cat.period}</div>
                  </div>
                  <div className={styles.catNums}>
                    <div className={styles.catSpent} style={{ color: cat.color }}>${cat.spent}</div>
                    <div className={styles.catCap}>of ${cat.cap} cap</div>
                  </div>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${Math.min(pct, 100)}%`, background: cat.color, opacity: 0.6 }} />
                </div>
                {cat.warn && (
                  <div className={styles.catWarn}>
                    <span className="pdot" style={{ background: cat.color }} />
                    {cat.warn}
                  </div>
                )}
                <div className={styles.subRows}>
                  {cat.subs.map(s => (
                    <div key={s.name} className={styles.subRow}>
                      <span className={styles.subName}>{s.name}</span>
                      <span className={styles.subAmt}>${s.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 16 }}>Lumen Recommendations</div>
          <div className={styles.aiRecs}>
            <div className={styles.aiTag}>
              <LumenDot size={10} />
              AI Budget Analysis
            </div>
            {AI_RECS.map(r => (
              <div key={r.head} className={styles.aiRec}>
                <div className={styles.aiRecHead}>{r.head}</div>
                <div className={styles.aiRecBody}>{r.body}</div>
                <div className={`${styles.aiRecTag} ${r.tagType === 'save' ? styles.tagSave : styles.tagWarn}`}>
                  {r.tag}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Rollover Balances</div>
            <div className={styles.rolloverCard}>
              <div className={styles.rolloverNote}>
                Categories that came in under budget last month. Lumen rolls unused amounts forward.
              </div>
              {[
                { name: 'Groceries (Apr rollover)', amt: '+$40' },
                { name: 'Transport (Apr rollover)',  amt: '+$22' },
                { name: 'Shopping (Apr rollover)',   amt: '+$55' },
              ].map(r => (
                <div key={r.name} className={styles.rolloverRow}>
                  <span className={styles.rolloverName}>{r.name}</span>
                  <span className={styles.rolloverAmt}>{r.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
