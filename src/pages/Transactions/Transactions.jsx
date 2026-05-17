import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import { TRANSACTIONS } from '../../data/mock'
import styles from './Transactions.module.css'

const FILTERS = ['All', 'Income', 'Bills', 'Food', 'Shopping', 'Transport', 'Subscriptions']

export default function Transactions() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  return (
    <ScreenWrap>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>↕ What Happened</div>
          <div className={styles.title}>Transactions</div>
          <div className={styles.sub}>
            Every dollar in and out. Lumen watches for patterns you'd never catch manually —
            timing shifts, creeping averages, category drift.
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><div className={styles.statL}>This Month In</div><div className={styles.statV} style={{ color: 'var(--safe)' }}>$2,840</div></div>
            <div className={styles.stat}><div className={styles.statL}>This Month Out</div><div className={styles.statV} style={{ color: 'var(--debt)' }}>$1,511</div></div>
            <div className={styles.stat}><div className={styles.statL}>Net</div><div className={styles.statV} style={{ color: 'var(--safe)' }}>+$1,329</div></div>
            <div className={styles.stat}><div className={styles.statL}>Transactions</div><div className={styles.statV}>43</div></div>
          </div>
        </div>
        <div className={styles.pace}>
          <div className={styles.paceLabel}>Monthly Spend Rate</div>
          <div className={styles.paceTrack}>
            <div className={styles.paceFill} style={{ width: '53%' }} />
          </div>
          <div className={styles.paceMeta}>
            <span>$0</span><span style={{ color: 'var(--warn)' }}>53%</span><span>$2,840</span>
          </div>
          <div className={styles.paceReading}>On Pace</div>
          <div className={styles.paceSub}>17 days remaining</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.filterChip} ${activeFilter === f ? styles.filterOn : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
        <input
          className={styles.search}
          placeholder="🔍 Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        <div className={styles.list}>
          {TRANSACTIONS.map(group => (
            <div key={group.date}>
              <div className={styles.dayHead}>{group.date}</div>
              {group.items.map(tx => (
                <div key={tx.id} className={styles.txRow}>
                  <div className={styles.txIcon}>{tx.icon}</div>
                  <div>
                    <div className={styles.txName}>{tx.name}</div>
                    <div className={styles.txCat}>{tx.cat}</div>
                  </div>
                  <div className={styles.txAmt} style={{ color: tx.color }}>{tx.amount}</div>
                  <div className={styles.txBal}>{tx.balance}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.aside}>
          <div className={styles.asideLabel}>Lumen Watching</div>

          <div className={styles.notice} style={{ background: 'linear-gradient(135deg,rgba(108,140,255,.07),rgba(93,202,165,.04))', borderColor: 'rgba(108,140,255,.15)' }}>
            <div className={styles.noticeTag} style={{ color: 'rgba(108,140,255,0.7)' }}>
              <div className="pdot" style={{ background: 'rgba(108,140,255,0.7)' }} />
              Pattern Detected
            </div>
            <div className={styles.noticeText}>
              Dining spend is <strong>$178 this month</strong> — 89% of your $200 cap with 13 days left.
              On pace to overshoot by <strong>~$30</strong>.
            </div>
          </div>

          <div className={styles.notice} style={{ background: 'linear-gradient(135deg,rgba(93,202,165,.06),rgba(93,202,165,.03))', borderColor: 'rgba(93,202,165,.15)' }}>
            <div className={styles.noticeTag} style={{ color: 'var(--safe)' }}>
              <div className="pdot" />Positive Trend
            </div>
            <div className={styles.noticeText}>
              <strong style={{ color: 'var(--safe)' }}>Grocery spending down 12%</strong> vs last month.
              Whole Foods replacing delivery apps.
            </div>
          </div>

          <div className={styles.notice} style={{ background: 'linear-gradient(135deg,rgba(240,176,76,.06),rgba(240,176,76,.03))', borderColor: 'rgba(240,176,76,.15)' }}>
            <div className={styles.noticeTag} style={{ color: 'var(--warn)' }}>
              <div className="pdot" style={{ background: 'var(--warn)' }} />Watch This
            </div>
            <div className={styles.noticeText}>
              <strong style={{ color: 'var(--warn)' }}>Uber charges up 3x</strong> vs 90-day average.
              4 rides this month vs 1.3/mo typical.
            </div>
          </div>

          <div className={styles.asideLabel} style={{ marginTop: 16 }}>Top Categories · May</div>
          {[
            { name: 'Housing',     amt: '$1,350', pct: '95%', color: 'var(--debt)' },
            { name: 'Groceries',   amt: '$112',   pct: '8%',  color: 'var(--calm)' },
            { name: 'Dining',      amt: '$178',   pct: '12%', color: 'var(--warn)' },
            { name: 'Utilities',   amt: '$94',    pct: '6%',  color: 'var(--ink-3)' },
          ].map(c => (
            <div key={c.name} className={styles.catRow}>
              <div className={styles.catMeta}>
                <span className={styles.catName}>{c.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.color }}>{c.amt}</span>
              </div>
              <div className={styles.catTrack}>
                <div className={styles.catFill} style={{ width: c.pct, background: c.color, opacity: 0.6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenWrap>
  )
}
