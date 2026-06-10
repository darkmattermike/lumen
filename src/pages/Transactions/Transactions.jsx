import { useState, useMemo } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money, initial, fmtDate } from '../../lib/format'
import s from './Transactions.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Activity (Stillwater · Dark)
   The ledger under the water: month summary strip, glass search
   and category pills, date-grouped rows with inline category
   editing. All previous functionality preserved.
   ────────────────────────────────────────────────────────────── */

// mint-family avatar tints so every merchant sits in the palette
const AV_TINTS = [
  'linear-gradient(150deg,#1f5a48,#123a2e)',
  'linear-gradient(150deg,#1c4f54,#10333a)',
  'linear-gradient(150deg,#2a5a3a,#16331f)',
  'linear-gradient(150deg,#1f4a5e,#102a3a)',
  'linear-gradient(150deg,#3a5a2a,#1f3316)',
  'linear-gradient(150deg,#1d5550,#0f322e)',
]
const avTint = (name = '') => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AV_TINTS.length
  return AV_TINTS[h]
}

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
    <SwShell>
      {/* ── page head: title + month summary ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Activity</div>
          <h1 className={s.title}>Every dollar, in and out</h1>
          <div className={s.subtitle}>{new Date().toLocaleDateString('en-US', { month: 'long' })} · {totals.count} transaction{totals.count === 1 ? '' : 's'}</div>
        </div>
        <div className={s.summary}>
          <div className={s.stat}>
            <div className={s.statKey}>In</div>
            <div className={`${s.statValIn} ${s.tabnum}`}>+{money(totals.income).slice(1)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Out</div>
            <div className={`${s.statVal} ${s.tabnum}`}>−{money(totals.spending).slice(1)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Net</div>
            <div className={`${net >= 0 ? s.statValIn : s.statValDebt} ${s.tabnum}`}>
              {net >= 0 ? '+' : '−'}{money(Math.abs(net)).slice(1)}
            </div>
          </div>
        </div>
      </div>

      {/* ── controls: glass search + category pills ── */}
      <div className={s.controls}>
        <div className={s.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className={s.search}
            placeholder="Search transactions"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search transactions"
          />
        </div>
        <div className={s.chips}>
          {categories.slice(0, 9).map(c => (
            <button key={c} className={cat === c ? s.chipOn : s.chip} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      {loading && !data && <div className={s.state}>Loading transactions…</div>}
      {error && <div className={s.state}>Couldn't load transactions. <b>{error}</b></div>}
      {data && groups.length === 0 && <div className={s.state}>No transactions match — try a different search or category.</div>}

      {/* ── date-grouped ledger ── */}
      {/* keyed by filter so the cascade replays when results change */}
      <div className={s.list} key={`${cat}|${query.trim().toLowerCase()}`}>
        {groups.map(([date, rows], gi) => (
          <section key={date} className={s.group} style={{ '--d': `${0.12 + gi * 0.07}s` }}>
            <div className={s.groupDate}>{fmtDate(date)}</div>
            <div className={s.groupCard}>
              {rows.map((t, ri) => {
                const income = t.amount > 0 || t.tx_type === 'income'
                const nm = t.cleaned_name || t.name
                return (
                  <div key={t.id} className={s.row} style={{ '--d': `${0.18 + gi * 0.07 + ri * 0.05}s` }}>
                    <span className={s.av} style={{ background: avTint(nm) }}>{initial(nm)}</span>
                    <div className={s.meta}>
                      <div className={s.name}>{nm}</div>
                      {editing === t.id ? (
                        <input
                          className={s.catEdit}
                          defaultValue={t.category || ''}
                          autoFocus
                          onBlur={e => saveCategory(t, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null) }}
                          aria-label="Edit category"
                        />
                      ) : (
                        <button className={s.cat} onClick={() => setEditing(t.id)} title="Edit category">
                          {t.category || 'Uncategorized'}
                          {t.account_mask && (
                            <span className={s.acct}> · {t.account_institution || t.account_name} ··{t.account_mask}</span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className={`${income ? s.amtIn : s.amt} ${s.tabnum}`}>
                      {income ? `+${money(Math.abs(t.amount)).slice(1)}` : `−${money(Math.abs(t.amount)).slice(1)}`}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </SwShell>
  )
}
