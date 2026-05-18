import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Transactions.module.css'

const FILTERS = ['All', 'INCOME', 'FOOD_AND_DRINK', 'SHOPS', 'TRANSPORTATION', 'PAYMENT', 'TRANSFER']
const FILTER_LABELS = {
  'All': 'All',
  'INCOME': 'Income',
  'FOOD_AND_DRINK': 'Food',
  'SHOPS': 'Shopping',
  'TRANSPORTATION': 'Transport',
  'PAYMENT': 'Bills',
  'TRANSFER': 'Transfers',
}

function fmt(n) {
  return Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtK(n) {
  return Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function Transactions() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  const { data, loading, error } = useApi(
    () => api.transactions(activeFilter !== 'All' ? `?category=${activeFilter}` : ''),
    [activeFilter]
  )

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { grouped = {}, totals = {} } = data
  const income  = Number(totals.income || 0)
  const spending = Number(totals.spending || 0)
  const net     = income - spending
  const count   = Number(totals.count || 0)

  // Days remaining in month
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - today.getDate()
  const spendPct = income > 0 ? Math.round((spending / income) * 100) : 0

  // Top categories from grouped data
  const catTotals = {}
  Object.values(grouped).flat().forEach(tx => {
    if (Number(tx.amount) < 0) {
      const cat = tx.category || 'Other'
      catTotals[cat] = (catTotals[cat] || 0) + Math.abs(Number(tx.amount))
    }
  })
  const topCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const maxCat = topCats[0]?.[1] || 1

  // Filter by search
  const filteredGrouped = Object.fromEntries(
    Object.entries(grouped).map(([date, txs]) => [
      date,
      txs.filter(tx => !search || tx.name.toLowerCase().includes(search.toLowerCase()))
    ]).filter(([, txs]) => txs.length > 0)
  )

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>↕ What Happened</div>
          <div className={styles.title}>Transactions</div>
          <div className={styles.sub}>
            Every dollar in and out. Lumen watches for patterns you'd never catch manually —
            timing shifts, creeping averages, category drift.
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><div className={styles.statL}>This Month In</div><div className={styles.statV} style={{ color: 'var(--safe)' }}>${fmtK(income)}</div></div>
            <div className={styles.stat}><div className={styles.statL}>This Month Out</div><div className={styles.statV} style={{ color: 'var(--debt)' }}>${fmtK(spending)}</div></div>
            <div className={styles.stat}><div className={styles.statL}>Net</div><div className={styles.statV} style={{ color: net >= 0 ? 'var(--safe)' : 'var(--debt)' }}>{net >= 0 ? '+' : '−'}${fmtK(Math.abs(net))}</div></div>
            <div className={styles.stat}><div className={styles.statL}>Transactions</div><div className={styles.statV}>{count}</div></div>
          </div>
        </div>
        <div className={styles.pace}>
          <div className={styles.paceLabel}>Monthly Spend Rate</div>
          <div className={styles.paceTrack}>
            <div className={styles.paceFill} style={{ width: `${Math.min(spendPct, 100)}%` }} />
          </div>
          <div className={styles.paceMeta}>
            <span>$0</span>
            <span style={{ color: spendPct > 80 ? 'var(--debt)' : spendPct > 60 ? 'var(--warn)' : 'var(--safe)' }}>{spendPct}%</span>
            <span>${fmtK(income)}</span>
          </div>
          <div className={styles.paceReading}>{spendPct > 80 ? 'Over Pace' : spendPct > 60 ? 'Watch' : 'On Pace'}</div>
          <div className={styles.paceSub}>{daysLeft} days remaining</div>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.filterChip} ${activeFilter === f ? styles.filterOn : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        <input
          className={styles.search}
          placeholder="🔍 Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.list}>
          {Object.keys(filteredGrouped).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              No transactions found
            </div>
          ) : (
            Object.entries(filteredGrouped).map(([date, txs]) => (
              <div key={date}>
                <div className={styles.dayHead}>{date}</div>
                {txs.map(tx => {
                  const amt = Number(tx.amount)
                  const isIncome = amt > 0
                  return (
                    <div key={tx.id} className={styles.txRow}>
                      <div className={styles.txIcon}>{tx.icon || (isIncome ? '💰' : '💳')}</div>
                      <div>
                        <div className={styles.txName}>{tx.name}</div>
                        <div className={styles.txCat}>{tx.category}{tx.account_name ? ` · ${tx.account_name}` : ''}</div>
                      </div>
                      <div className={styles.txAmt} style={{ color: isIncome ? 'var(--safe)' : 'var(--debt)' }}>
                        {isIncome ? '+' : '−'}${fmt(Math.abs(amt))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.aside}>
          <div className={styles.asideLabel}>Top Categories · This Month</div>
          {topCats.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 0' }}>No spending data yet.</div>
          ) : topCats.map(([cat, total]) => (
            <div key={cat} className={styles.catRow}>
              <div className={styles.catMeta}>
                <span className={styles.catName}>{cat.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--debt)' }}>${fmtK(total)}</span>
              </div>
              <div className={styles.catTrack}>
                <div className={styles.catFill} style={{ width: `${Math.round((total / maxCat) * 100)}%`, background: 'var(--debt)', opacity: 0.5 }} />
              </div>
            </div>
          ))}

          <div className={styles.asideLabel} style={{ marginTop: 16 }}>Lumen Watching</div>
          <LumenInsight
            label="This Month"
            contextType="transactions"
            prompt="In 2-3 sentences, give me a sharp read on how this month's transactions look — income vs spending, anything unusual, and where I should pay attention."
            color="green"
          />
          <LumenInsight
            label="Pattern Alert"
            contextType="transactions"
            prompt="In 2-3 sentences, identify the most important spending pattern or anomaly in my recent transactions that I should know about."
            color="blue"
          />
        </div>
      </div>
    </ScreenWrap>
  )
}
