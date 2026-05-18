import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Transactions.module.css'

const FILTERS = ['All', 'INCOME', 'FOOD_AND_DRINK', 'SHOPS', 'TRANSPORTATION', 'PAYMENT', 'TRANSFER']
const FILTER_LABELS = {
  'All': 'All', 'INCOME': 'Income', 'FOOD_AND_DRINK': 'Food',
  'SHOPS': 'Shopping', 'TRANSPORTATION': 'Transport', 'PAYMENT': 'Bills', 'TRANSFER': 'Transfers',
}

function fmt(n)  { return Math.abs(Number(n||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtK(n) { return Math.abs(Number(n||0)).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}) }

// ── Expandable transaction row ────────────────────────────────
function TxRow({ tx, budgets, onSaved }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({
    name:     tx.name || '',
    category: tx.category || '',
    amount:   Math.abs(Number(tx.amount || 0)),
    date:     tx.date ? String(tx.date).slice(0, 10) : '',
    note:     tx.note || '',
    tx_type:  tx.tx_type || (Number(tx.amount) > 0 ? 'income' : 'expense'),
  })

  const amt       = Number(tx.amount)
  const txType    = form.tx_type || (amt > 0 ? 'income' : 'expense')
  const isIncome  = txType === 'income'
  const isTransfer = txType === 'transfer'
  const amtColor  = isTransfer ? 'var(--calm)' : isIncome ? 'var(--safe)' : 'var(--debt)'

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.updateTransaction(tx.id, {
        name:     form.name,
        category: form.category || null,
        amount:   form.tx_type === 'income' ? Math.abs(Number(form.amount)) : -Math.abs(Number(form.amount)),
        date:     form.date,
        note:     form.note || null,
        tx_type:  form.tx_type,
      })
      // Close first, then refresh parent — prevents state-after-unmount issues
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(err.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div className={`${styles.txWrap} ${open ? styles.txWrapOpen : ''}`}>
      {/* ── Main row ── */}
      <div className={styles.txRow} onClick={() => setOpen(o => !o)}>
        <div className={styles.txIcon}>{tx.icon || (isIncome ? '💰' : '💳')}</div>
        <div className={styles.txInfo}>
          <div className={styles.txName}>{form.name}</div>
          <div className={styles.txCat}>
            {isTransfer
              ? <span style={{color:'var(--calm)'}}>↔ Transfer — excluded from totals</span>
              : (form.category || 'Uncategorized').replace(/_/g, ' ')
            }
            {!isTransfer && tx.account_name ? ` · ${tx.account_name}` : ''}
            {form.note ? ` — ${form.note}` : ''}
          </div>
        </div>
        <div className={styles.txAmt} style={{ color: amtColor }}>
          {isTransfer ? '↔' : isIncome ? '+' : '−'}${fmt(Math.abs(amt))}
        </div>
        <div className={styles.txChevron} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</div>
      </div>

      {/* ── Expanded editor ── */}
      {open && (
        <div className={styles.txEditor}>
          <div className={styles.editorGrid}>

            <div className={`${styles.editorField} ${styles.editorFieldFull}`}>
              <div className={styles.editorLabel}>Type</div>
              <div className={styles.typeRow}>
                {[
                  { value: 'expense',  label: 'Expense',  color: 'var(--debt)' },
                  { value: 'income',   label: 'Income',   color: 'var(--safe)' },
                  { value: 'transfer', label: 'Transfer', color: 'var(--calm)' },
                ].map(t => (
                  <button
                    key={t.value}
                    className={`${styles.typeBtn} ${form.tx_type === t.value ? styles.typeBtnOn : ''}`}
                    style={form.tx_type === t.value ? { borderColor: t.color, color: t.color, background: `${t.color}18` } : {}}
                    onClick={() => set('tx_type', t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.editorField}>
              <div className={styles.editorLabel}>Name</div>
              <input
                className={styles.editorInput}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Transaction name"
              />
            </div>

            <div className={styles.editorField}>
              <div className={styles.editorLabel}>Budget Category</div>
              <select
                className={styles.editorSelect}
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                <option value="">— Uncategorized —</option>
                {budgets.map(b => (
                  <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.editorField}>
              <div className={styles.editorLabel}>Amount ($)</div>
              <input
                className={styles.editorInput}
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>

            <div className={styles.editorField}>
              <div className={styles.editorLabel}>Date</div>
              <input
                className={styles.editorInput}
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>

            <div className={`${styles.editorField} ${styles.editorFieldFull}`}>
              <div className={styles.editorLabel}>Note</div>
              <input
                className={styles.editorInput}
                value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder="Split with Jake, client dinner, reimbursable..."
              />
            </div>

          </div>

          {error && <div className={styles.editorError}>{error}</div>}

          <div className={styles.editorFooter}>
            <button className={styles.editorCancel} onClick={() => setOpen(false)}>Cancel</button>
            <button
              className={styles.editorSave}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Transactions() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  const { data, loading, error, refresh } = useApi(
    () => api.transactions(activeFilter !== 'All' ? `?category=${activeFilter}` : ''),
    [activeFilter]
  )
  const { data: budgetData } = useApi(api.budgets)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { grouped = {}, totals = {} } = data
  const budgets  = budgetData?.budgets || []
  const income   = Number(totals.income || 0)
  const spending = Number(totals.spending || 0)
  const net      = income - spending
  const count    = Number(totals.count || 0)

  const today       = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - today.getDate()
  const spendPct    = income > 0 ? Math.round((spending / income) * 100) : 0

  // Budget-sourced category totals — match by budget name
  const budgetRows = budgets.map(b => {
    const spent = Object.values(grouped).flat()
      .filter(tx => Number(tx.amount) < 0 && (tx.category || '').toLowerCase() === b.name.toLowerCase())
      .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0)
    return { ...b, spent }
  }).filter(b => b.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 5)

  const maxSpent = budgetRows[0]?.spent || 1

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
            Every dollar in and out. Click any transaction to edit it. Assign a budget category to have it count toward your budget caps.
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><div className={styles.statL}>This Month In</div><div className={styles.statV} style={{color:'var(--safe)'}}>${fmtK(income)}</div></div>
            <div className={styles.stat}><div className={styles.statL}>This Month Out</div><div className={styles.statV} style={{color:'var(--debt)'}}>${fmtK(spending)}</div></div>
            <div className={styles.stat}><div className={styles.statL}>Net</div><div className={styles.statV} style={{color:net>=0?'var(--safe)':'var(--debt)'}}>{net>=0?'+':'−'}${fmtK(Math.abs(net))}</div></div>
            <div className={styles.stat}><div className={styles.statL}>Transactions</div><div className={styles.statV}>{count}</div></div>
          </div>
        </div>
        <div className={styles.pace}>
          <div className={styles.paceLabel}>Monthly Spend Rate</div>
          <div className={styles.paceTrack}>
            <div className={styles.paceFill} style={{width:`${Math.min(spendPct,100)}%`}}/>
          </div>
          <div className={styles.paceMeta}>
            <span>$0</span>
            <span style={{color:spendPct>80?'var(--debt)':spendPct>60?'var(--warn)':'var(--safe)'}}>{spendPct}%</span>
            <span>${fmtK(income)}</span>
          </div>
          <div className={styles.paceReading}>{spendPct>80?'Over Pace':spendPct>60?'Watch':'On Pace'}</div>
          <div className={styles.paceSub}>{daysLeft} days remaining</div>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button key={f}
            className={`${styles.filterChip} ${activeFilter===f?styles.filterOn:''}`}
            onClick={() => setActiveFilter(f)}>
            {FILTER_LABELS[f]}
          </button>
        ))}
        <input className={styles.search} placeholder="🔍 Search transactions..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className={styles.body}>
        <div className={styles.list}>
          {Object.keys(filteredGrouped).length === 0 ? (
            <div style={{padding:'40px',textAlign:'center',color:'var(--ink-3)',fontFamily:'var(--font-mono)',fontSize:11}}>
              No transactions found
            </div>
          ) : Object.entries(filteredGrouped).map(([date, txs]) => (
            <div key={date}>
              <div className={styles.dayHead}>{date}</div>
              {txs.map(tx => (
                <TxRow key={tx.id} tx={tx} budgets={budgets} onSaved={refresh} />
              ))}
            </div>
          ))}
        </div>

        <div className={styles.aside}>
          <div className={styles.asideLabel}>Budget Categories · This Month</div>
          {budgetRows.length === 0 ? (
            <div style={{fontSize:12,color:'var(--ink-3)',padding:'8px 0',lineHeight:1.65}}>
              Edit transactions and assign categories to see spending here.
            </div>
          ) : budgetRows.map(b => {
            const color = {debt:'var(--debt)',warn:'var(--warn)',safe:'var(--safe)',calm:'var(--calm)',goal:'var(--goal)',pink:'#e87fa3',orange:'#f07a3a',sky:'#5bc4e8',lime:'#8ecf4a',gold:'#d4a017'}[b.color] || 'var(--safe)'
            const pct   = Math.round((b.spent / maxSpent) * 100)
            const capPct = Number(b.cap) > 0 ? Math.round((b.spent / Number(b.cap)) * 100) : null
            return (
              <div key={b.id} className={styles.catRow}>
                <div className={styles.catMeta}>
                  <span className={styles.catName}>{b.icon} {b.name}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:11,color}}>
                    ${fmtK(b.spent)}{capPct !== null ? ` · ${capPct}%` : ''}
                  </span>
                </div>
                <div className={styles.catTrack}>
                  <div className={styles.catFill} style={{width:`${pct}%`,background:color,opacity:.55}}/>
                </div>
              </div>
            )
          })}

          <div className={styles.asideLabel} style={{marginTop:16}}>Lumen Watching</div>
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
