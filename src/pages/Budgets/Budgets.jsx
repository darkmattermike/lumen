import { useState } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import { money, money0 } from '../../lib/format'
import s from './Budgets.module.css'

export default function Budgets() {
  const { data, loading, error, refresh } = useApi(() => api.budgets(), [])
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', cap: '', icon: '📦' })

  const budgets = data?.budgets || []
  const totalBudgeted = data?.totalBudgeted || 0
  const totalSpent = data?.totalSpent || 0
  const remaining = totalBudgeted - totalSpent

  async function saveCap(b, value) {
    setEditing(null)
    const n = Number(String(value).replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(n) || n <= 0 || n === Number(b.cap)) return
    try { await api.updateBudget(b.id, { cap: n }); refresh() } catch { /* */ }
  }
  async function createBudget() {
    const cap = Number(form.cap)
    if (!form.name.trim() || !Number.isFinite(cap) || cap <= 0) return
    try {
      await api.createBudget({ name: form.name.trim(), cap, icon: form.icon || '📦' })
      setForm({ name: '', cap: '', icon: '📦' }); setAdding(false); refresh()
    } catch { /* */ }
  }
  async function remove(b) {
    try { await api.deleteBudget(b.id); refresh() } catch { /* */ }
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <div className={s.eyebrow}>Envelopes</div>
          <h1 className={s.title}>Budgets</h1>
        </div>
        <div className={s.summary}>
          <Stat label="Budgeted" value={money(totalBudgeted)} tone="teal" />
          <Stat label="Spent" value={money(totalSpent)} tone="rose" />
          <Stat label="Remaining" value={money(remaining)} tone={remaining >= 0 ? 'mint' : 'rose'} />
        </div>
      </header>

      {loading && !data && <div className={s.state}>Loading budgets…</div>}
      {error && <div className={s.state}>Couldn’t load budgets. {error}</div>}

      <div className={s.grid}>
        {budgets.map(b => {
          const pct = Math.min(100, Math.max(0, b.pct || 0))
          const over = (b.pct || 0) > 100
          const tone = over ? 'rose' : (b.pct || 0) >= 80 ? 'amber' : 'teal'
          const left = Number(b.cap) - Number(b.spent)
          return (
            <div key={b.id} className={s.card}>
              <div className={s.cardTop}>
                <span className={s.icon}>{b.icon || '📦'}</span>
                <div className={s.bname}>{b.name}</div>
                <button className={s.del} onClick={() => remove(b)} title="Delete budget" aria-label="Delete">×</button>
              </div>

              <div className={s.numbers}>
                <span className={s.spent}>{money(b.spent)}</span>
                <span className={s.sep}>/</span>
                {editing === b.id ? (
                  <input className={s.capEdit} defaultValue={Number(b.cap).toFixed(0)} autoFocus
                    onBlur={e => saveCap(b, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null) }} />
                ) : (
                  <button className={s.cap} onClick={() => setEditing(b.id)} title="Edit cap">{money0(b.cap)}</button>
                )}
              </div>

              <div className={s.bar}><span className={`${s.fill} ${s[tone]}`} style={{ width: `${pct}%` }} /></div>
              <div className={s.meta}>
                <span className={`${s.pctL} ${s[tone + 'T']}`}>{b.pct || 0}%</span>
                <span className={s.left}>{left >= 0 ? `${money(left)} left` : `${money(-left)} over`}</span>
              </div>
            </div>
          )
        })}

        {adding ? (
          <div className={`${s.card} ${s.addCard}`}>
            <input className={s.inName} placeholder="Name (matches category)" value={form.name} autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className={s.addRow}>
              <input className={s.inIcon} value={form.icon} maxLength={2} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
              <input className={s.inCap} placeholder="Cap" inputMode="decimal" value={form.cap}
                onChange={e => setForm(f => ({ ...f, cap: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') createBudget() }} />
            </div>
            <div className={s.addBtns}>
              <button className={s.cancel} onClick={() => { setAdding(false); setForm({ name: '', cap: '', icon: '📦' }) }}>Cancel</button>
              <button className={s.save} onClick={createBudget}>Add</button>
            </div>
          </div>
        ) : (
          <button className={`${s.card} ${s.newCard}`} onClick={() => setAdding(true)}>
            <span className={s.plus}>+</span>
            <span>New budget</span>
          </button>
        )}
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
