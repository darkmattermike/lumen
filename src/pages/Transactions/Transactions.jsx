import { useState, useMemo } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import { money, initial, fmtDate } from '../../lib/format'
import s from './Transactions.module.css'

export default function Transactions() {
  const { data, loading, error, refresh } = useApi(() => api.transactions('?page=0'), [])
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [editing, setEditing] = useState(null) // tx id being recategorized

  const all = useMemo(() => {
    if (!data) return []
    return [...(data.currentMonth || []), ...(data.historical || [])]
  }, [data])

  const categories = useMemo(() => {
    const set = new Set(all.map(t => t.category).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [all])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(t => {
      if (cat !== 'All' && t.category !== cat) return false
      if (!q) return true
      return (t.cleaned_name || t.name || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q)
    })
  }, [all, query, cat])

  // group by date
  const groups = useMemo(() => {
    const map = new Map()
    for (const t of filtered) {
      const k = t.date
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(t)
    }
    return Array.from(map.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]))
  }, [filtered])

  // Summary computed from the current month's transactions so it always matches
  // the inflows/outflows shown below (the backend's totals field can under-count income).
  const totals = useMemo(() => {
    const month = data?.currentMonth || []
    let income = 0, spending = 0
    for (const t of month) {
      const amt = Number(t.amount) || 0
      if (amt > 0 || t.tx_type === 'income') income += Math.abs(amt)
      else spending += Math.abs(amt)
    }
    return { income, spending, count: month.length }
  }, [data])
  const net = totals.income - totals.spending

  async function saveCategory(t, value) {
    setEditing(null)
    const next = value.trim()
    if (!next || next === t.category) return
    try {
      await api.updateTransaction(t.id, { category: next, _original_category: t.category })
      refresh()
    } catch { /* surfaced via error state on next load */ }
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <div className={s.eyebrow}>Ledger</div>
          <h1 className={s.title}>Transactions</h1>
        </div>
        <div className={s.summary}>
          <Stat label="Income" value={money(totals.income)} tone="mint" />
          <Stat label="Spent" value={money(totals.spending)} tone="rose" />
          <Stat label="Net" value={money(net, { sign: true })} tone={net >= 0 ? 'teal' : 'rose'} />
        </div>
      </header>

      <div className={s.controls}>
        <div className={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input className={s.search} placeholder="Search transactions" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className={s.chips}>
          {categories.slice(0, 9).map(c => (
            <button key={c} className={`${s.chip} ${cat === c ? s.chipOn : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      {loading && !data && <div className={s.state}>Loading transactions…</div>}
      {error && <div className={s.state}>Couldn’t load transactions. {error}</div>}

      {data && groups.length === 0 && <div className={s.state}>No transactions match.</div>}

      <div className={s.list}>
        {groups.map(([date, rows]) => (
          <section key={date} className={s.group}>
            <div className={s.groupDate}>{fmtDate(date)}</div>
            <div className={s.rows}>
              {rows.map(t => {
                const income = t.amount > 0 || t.tx_type === 'income'
                return (
                  <div key={t.id} className={s.row}>
                    <span className={s.av} style={{ background: avatarColor(t.cleaned_name || t.name) }}>{initial(t.cleaned_name || t.name)}</span>
                    <div className={s.meta}>
                      <div className={s.name}>{t.cleaned_name || t.name}</div>
                      {editing === t.id ? (
                        <input
                          className={s.catEdit}
                          defaultValue={t.category || ''}
                          autoFocus
                          onBlur={e => saveCategory(t, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null) }}
                        />
                      ) : (
                        <button className={s.cat} onClick={() => setEditing(t.id)} title="Edit category">
                          {t.category || 'Uncategorized'}
                          {t.account_mask ? <span className={s.dot}> · </span> : null}
                          {t.account_mask ? <span className={s.acct}>{t.account_institution || t.account_name} ••{t.account_mask}</span> : null}
                        </button>
                      )}
                    </div>
                    <div className={`${s.amt} ${income ? s.pos : ''}`}>{income ? money(Math.abs(t.amount), { sign: true }) : money(-Math.abs(t.amount))}</div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className={s.stat}>
      <div className={s.statL}>{label}</div>
      <div className={`${s.statV} ${s[tone] || ''}`}>{value}</div>
    </div>
  )
}

function avatarColor(name = '') {
  const palette = ['#3a8fd8', '#7c5cff', '#2fb3a0', '#d8743a', '#c0497e', '#5a9e3a', '#b0852f']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length
  return palette[h]
}
