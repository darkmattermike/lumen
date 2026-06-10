import { useState, useMemo } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money, money0 } from '../../lib/format'
import s from './Budgets.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Budgets (Stillwater · Dark)
   Envelopes as water levels: each budget is a glass channel that
   fills as you spend. A "pace" tick marks how far through the
   month you are — fill ahead of the tick means you're spending
   faster than the month is moving. Full CRUD preserved.
   ────────────────────────────────────────────────────────────── */

export default function Budgets() {
  const { data, loading, error, refresh } = useApi(() => api.budgets(), [])
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', cap: '', icon: '📦' })

  const budgets = data?.budgets || []
  const totalBudgeted = data?.totalBudgeted || 0
  const totalSpent = data?.totalSpent || 0
  const remaining = totalBudgeted - totalSpent

  // how far through the month we are (the pace tick)
  const pace = useMemo(() => {
    const now = new Date()
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return { day: now.getDate(), days, pct: Math.round((now.getDate() / days) * 100) }
  }, [])

  async function saveCap(b, value) {
    setEditing(null)
    const n = Number(String(value).replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(n) || n <= 0 || n === Number(b.cap)) return
    try { await api.updateBudget(b.id, { cap: n }); refresh() } catch { /* surfaced on next load */ }
  }
  async function createBudget() {
    const cap = Number(form.cap)
    if (!form.name.trim() || !Number.isFinite(cap) || cap <= 0) return
    try {
      await api.createBudget({ name: form.name.trim(), cap, icon: form.icon || '📦' })
      setForm({ name: '', cap: '', icon: '📦' }); setAdding(false); refresh()
    } catch { /* surfaced on next load */ }
  }
  async function remove(b) {
    try { await api.deleteBudget(b.id); refresh() } catch { /* surfaced on next load */ }
  }

  return (
    <SwShell>
      {/* ── page head: title + month summary ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budgets</div>
          <h1 className={s.title}>Where the month is going</h1>
          <div className={s.subtitle}>
            Day {pace.day} of {pace.days} · {pace.pct}% through {new Date().toLocaleDateString('en-US', { month: 'long' })}
          </div>
        </div>
        <div className={s.summary}>
          <div className={s.stat}>
            <div className={s.statKey}>Budgeted</div>
            <div className={`${s.statVal} ${s.tabnum}`}>{money(totalBudgeted)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Spent</div>
            <div className={`${s.statVal} ${s.tabnum}`}>{money(totalSpent)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Remaining</div>
            <div className={`${remaining >= 0 ? s.statValIn : s.statValDebt} ${s.tabnum}`}>
              {remaining >= 0 ? '' : '−'}{money(Math.abs(remaining))}
            </div>
          </div>
        </div>
      </div>

      {loading && !data && <div className={s.state}>Loading budgets…</div>}
      {error && <div className={s.state}>Couldn't load budgets. <b>{error}</b></div>}

      {/* ── envelope channels ── */}
      <div className={s.list}>
        {budgets.map((b, i) => {
          const rawPct = Number(b.pct) || 0
          const pct = Math.min(100, Math.max(0, rawPct))
          const over = rawPct > 100
          const warn = !over && rawPct >= 80
          const ahead = !over && rawPct > pace.pct  // filling faster than the month
          const left = Number(b.cap) - Number(b.spent)
          return (
            <div key={b.id} className={s.row} style={{ '--d': `${0.1 + i * 0.07}s` }}>
              <span className={s.icon}>{b.icon || '📦'}</span>

              <div className={s.main}>
                <div className={s.topLine}>
                  <span className={s.name}>{b.name}</span>
                  <span className={over ? s.tagOver : ahead ? s.tagAhead : s.tagOk}>
                    {over ? `${money0(-left)} over` : warn ? 'running hot' : ahead ? 'ahead of pace' : 'on pace'}
                  </span>
                  <span className={`${s.nums} ${s.tabnum}`}>
                    <span className={s.spent}>{money(b.spent)}</span>
                    <span className={s.sep}> / </span>
                    {editing === b.id ? (
                      <input
                        className={s.capEdit}
                        defaultValue={Number(b.cap).toFixed(0)}
                        autoFocus
                        onBlur={e => saveCap(b, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null) }}
                        aria-label="Edit cap"
                      />
                    ) : (
                      <button className={s.cap} onClick={() => setEditing(b.id)} title="Edit cap">{money0(b.cap)}</button>
                    )}
                  </span>
                </div>

                {/* water channel: fill + month-pace tick */}
                <div className={s.bar}>
                  <i
                    className={over ? s.fillOver : warn ? s.fillWarn : s.fill}
                    style={{ width: `${pct}%`, '--d': `${0.25 + i * 0.08}s` }}
                  />
                  <span className={s.paceTick} style={{ left: `${pace.pct}%` }} title={`Day ${pace.day} — ${pace.pct}% through the month`} />
                </div>

                <div className={s.bottomLine}>
                  <span className={over ? s.leftOver : s.leftOk}>
                    {left >= 0 ? `${money0(left)} left` : `${money0(-left)} over cap`}
                  </span>
                  <span className={`${over ? s.pctOver : warn ? s.pctWarn : s.pctOk} ${s.tabnum}`}>{rawPct}%</span>
                </div>
              </div>

              <button className={s.del} onClick={() => remove(b)} title="Delete budget" aria-label={`Delete ${b.name} budget`}>×</button>
            </div>
          )
        })}

        {/* ── add new envelope ── */}
        {adding ? (
          <div className={s.addRow}>
            <input
              className={s.inIcon}
              value={form.icon}
              maxLength={2}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              aria-label="Icon"
            />
            <input
              className={s.inName}
              placeholder="Name (matches category)"
              value={form.name}
              autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') createBudget(); if (e.key === 'Escape') setAdding(false) }}
              aria-label="Budget name"
            />
            <input
              className={s.inCap}
              placeholder="Cap"
              inputMode="decimal"
              value={form.cap}
              onChange={e => setForm(f => ({ ...f, cap: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') createBudget(); if (e.key === 'Escape') setAdding(false) }}
              aria-label="Monthly cap"
            />
            <button className={s.cancel} onClick={() => { setAdding(false); setForm({ name: '', cap: '', icon: '📦' }) }}>Cancel</button>
            <button className={s.save} onClick={createBudget}>Add</button>
          </div>
        ) : (
          <button className={s.newRow} onClick={() => setAdding(true)}>
            <span className={s.plus} aria-hidden="true">+</span> New budget
          </button>
        )}
      </div>
    </SwShell>
  )
}
