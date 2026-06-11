import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money, money0 } from '../../lib/format'
import s from './Budgets.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Budgets (Stillwater · Dark)
   Envelopes as water levels. Click a category to edit all
   details. Completed categories are grayed to the bottom.
   Sort: overspent → in-progress → completed.
   ────────────────────────────────────────────────────────────── */

const ICONS = ['📦','🏠','⚡','🍽️','🚗','🛒','☕','🎵','📱','💊','🐾','🎓','💰','🎮','✈️','🔧','🎁','💼','🏋️','🌐','📺','☁️']

export default function Budgets() {
  const { data, loading, error, refresh } = useApi(() => api.budgets(), [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', cap: '', icon: '📦' })
  const [editing, setEditing] = useState(null) // budget object being edited

  const budgets = data?.budgets || []
  const totalBudgeted = data?.totalBudgeted || 0
  const totalSpent = data?.totalSpent || 0
  const remaining = totalBudgeted - totalSpent

  const pace = useMemo(() => {
    const now = new Date()
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return { day: now.getDate(), days, pct: Math.round((now.getDate() / days) * 100) }
  }, [])

  // Sort: overspent → in-progress ahead of pace → in-progress on pace → completed
  const sorted = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const scoreOf = (x) => {
        if (x.completed) return 3
        if (Number(x.pct) > 100) return 0        // overspent
        if (Number(x.pct) > pace.pct) return 1   // ahead of pace
        return 2                                   // on pace
      }
      return scoreOf(a) - scoreOf(b)
    })
  }, [budgets, pace.pct])

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
  async function toggleComplete(b) {
    try {
      await api.updateBudget(b.id, { completed: !b.completed })
      refresh()
    } catch { /* */ }
  }

  return (
    <SwShell>
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

      <div className={s.list}>
        {sorted.map((b, i) => {
          const rawPct = Number(b.pct) || 0
          const pct = Math.min(100, Math.max(0, rawPct))
          const over = rawPct > 100
          const warn = !over && rawPct >= 80
          const ahead = !over && rawPct > pace.pct
          const left = Number(b.cap) - Number(b.spent)
          const completed = !!b.completed

          return (
            <div key={b.id}
              className={`${s.row} ${completed ? s.rowCompleted : ''}`}
              style={{ '--d': `${0.1 + i * 0.07}s` }}
              onClick={() => setEditing(b)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setEditing(b) }}>
              <span className={s.icon}>{b.icon || '📦'}</span>

              <div className={s.main}>
                <div className={s.topLine}>
                  <span className={s.name}>{b.name}</span>
                  <span className={completed ? s.tagDone : over ? s.tagOver : ahead ? s.tagAhead : s.tagOk}>
                    {completed ? 'completed' : over ? `${money0(-left)} over` : warn ? 'running hot' : ahead ? 'ahead of pace' : 'on pace'}
                  </span>
                  <span className={`${s.nums} ${s.tabnum}`}>
                    <span className={s.spent}>{money(b.spent)}</span>
                    <span className={s.sep}> / </span>
                    <span className={s.cap}>{money0(b.cap)}</span>
                  </span>
                </div>

                <div className={s.bar}>
                  <i className={completed ? s.fillDone : over ? s.fillOver : warn ? s.fillWarn : s.fill}
                    style={{ width: `${pct}%`, '--d': `${0.25 + i * 0.08}s` }} />
                  {!completed && <span className={s.paceTick} style={{ left: `${pace.pct}%` }} title={`Day ${pace.day}`} />}
                </div>

                <div className={s.bottomLine}>
                  <span className={completed ? s.leftDone : over ? s.leftOver : s.leftOk}>
                    {completed ? 'no more spending this month' : left >= 0 ? `${money0(left)} left` : `${money0(-left)} over cap`}
                  </span>
                  <span className={`${completed ? s.pctDone : over ? s.pctOver : warn ? s.pctWarn : s.pctOk} ${s.tabnum}`}>{rawPct}%</span>
                </div>
              </div>

              <span className={s.editHint} aria-hidden="true">✎</span>
            </div>
          )
        })}

        {adding ? (
          <div className={s.addRow}>
            <input className={s.inIcon} value={form.icon} maxLength={2}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} aria-label="Icon" />
            <input className={s.inName} placeholder="Name (matches category)" value={form.name} autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') createBudget(); if (e.key === 'Escape') setAdding(false) }} />
            <input className={s.inCap} placeholder="Cap" inputMode="decimal" value={form.cap}
              onChange={e => setForm(f => ({ ...f, cap: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') createBudget(); if (e.key === 'Escape') setAdding(false) }} />
            <button className={s.cancel} onClick={() => { setAdding(false); setForm({ name: '', cap: '', icon: '📦' }) }}>Cancel</button>
            <button className={s.save} onClick={createBudget}>Add</button>
          </div>
        ) : (
          <button className={s.newRow} onClick={() => setAdding(true)}>
            <span className={s.plus} aria-hidden="true">+</span> New budget
          </button>
        )}
      </div>

      {editing && createPortal(
        <BudgetEditor
          budget={editing}
          icons={ICONS}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh() }}
          onDelete={async (b) => { await remove(b); setEditing(null) }}
          onComplete={async (b) => { await toggleComplete(b); setEditing(null) }}
        />,
        document.body
      )}
    </SwShell>
  )
}

/* ── Budget editor modal ── */
function BudgetEditor({ budget, icons, onClose, onSaved, onDelete, onComplete }) {
  const [tab, setTab] = useState('edit') // 'edit' | 'txns'
  const [form, setForm] = useState({
    name: budget.name || '',
    cap: String(Number(budget.cap) || ''),
    icon: budget.icon || '📦',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Transactions for this category this month — fetched lazily on tab switch
  const [txns, setTxns] = useState(null)
  const [txnsLoading, setTxnsLoading] = useState(false)
  const [txnsErr, setTxnsErr] = useState('')

  useEffect(() => {
    if (tab !== 'txns' || txns !== null) return
    setTxnsLoading(true)
    setTxnsErr('')
    api.transactions(`?category=${encodeURIComponent(budget.name)}&days=31`)
      .then(data => {
        // api returns { current: [...], historical: [...] } — combine and sort
        const all = [...(data?.current || []), ...(data?.historical || [])]
        all.sort((a, b) => new Date(b.date) - new Date(a.date))
        setTxns(all)
      })
      .catch(() => setTxnsErr('Could not load transactions.'))
      .finally(() => setTxnsLoading(false))
  }, [tab, txns, budget.name])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setErr('')
    const cap = Number(form.cap)
    if (!form.name.trim()) return setErr('Name is required.')
    if (!Number.isFinite(cap) || cap <= 0) return setErr('Enter a cap greater than 0.')
    setBusy(true)
    try {
      await api.updateBudget(budget.id, { name: form.name.trim(), cap, icon: form.icon })
      onSaved()
    } catch (e) { setErr(e?.message || 'Could not save.'); setBusy(false) }
  }

  // Guess transaction count from the budget's spend data for the tab label
  const txnCount = txns ? txns.length : null

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={s.modalHead}>
          <div className={s.modalHeadLeft}>
            <span className={s.modalIcon}>{budget.icon || '📦'}</span>
            <h3 className={s.modalTitle}>{budget.name}</h3>
          </div>
          <button className={s.modalX} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Tab bar */}
        <div className={s.tabBar}>
          <button
            className={`${s.tabBtn} ${tab === 'edit' ? s.tabBtnOn : ''}`}
            onClick={() => setTab('edit')}>
            Edit
          </button>
          <button
            className={`${s.tabBtn} ${tab === 'txns' ? s.tabBtnOn : ''}`}
            onClick={() => setTab('txns')}>
            Transactions{txnCount !== null ? ` (${txnCount})` : ''}
          </button>
        </div>

        {/* ── Edit tab ── */}
        {tab === 'edit' && (
          <>
            {/* Icon picker */}
            <div className={s.mfld}>
              <label className={s.mlabel}>Icon</label>
              <div className={s.iconGrid}>
                {icons.map(ic => (
                  <button key={ic} type="button"
                    className={`${s.iconBtn} ${form.icon === ic ? s.iconOn : ''}`}
                    onClick={() => set('icon', ic)}>{ic}</button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className={s.mfld}>
              <label className={s.mlabel}>Category name</label>
              <input className={s.min} value={form.name} autoFocus onChange={e => set('name', e.target.value)}
                placeholder="Matches transaction category" />
              <div className={s.mhint}>This name links the budget to your transactions.</div>
            </div>

            {/* Cap */}
            <div className={s.mfld}>
              <label className={s.mlabel}>Monthly cap</label>
              <input className={s.min} inputMode="decimal" value={form.cap}
                onChange={e => set('cap', e.target.value)} placeholder="0.00" />
            </div>

            {err && <div className={s.merr}>{err}</div>}

            <div className={s.modalFoot}>
              <div className={s.modalFootLeft}>
                <button className={s.delBtn} onClick={() => onDelete(budget)} disabled={busy} title="Delete budget">Delete</button>
                <button
                  className={`${s.completeBtn} ${budget.completed ? s.completeBtnOn : ''}`}
                  onClick={() => onComplete(budget)} disabled={busy}
                  title={budget.completed ? 'Mark as active' : 'Mark as completed'}>
                  {budget.completed ? 'Reopen' : 'Complete'}
                </button>
              </div>
              <div className={s.modalFootRight}>
                <button className={s.mcancel} onClick={onClose} disabled={busy}>Cancel</button>
                <button className={s.msave} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </>
        )}

        {/* ── Transactions tab ── */}
        {tab === 'txns' && (
          <div className={s.txnPane}>
            {/* Summary strip */}
            <div className={s.txnSummary}>
              <div className={s.txnSummaryItem}>
                <span className={s.txnSummaryKey}>Spent</span>
                <span className={s.txnSummaryVal}>{money(budget.spent)}</span>
              </div>
              <div className={s.txnSummaryItem}>
                <span className={s.txnSummaryKey}>Cap</span>
                <span className={s.txnSummaryVal}>{money0(budget.cap)}</span>
              </div>
              <div className={s.txnSummaryItem}>
                <span className={s.txnSummaryKey}>Left</span>
                <span className={`${s.txnSummaryVal} ${Number(budget.cap) - Number(budget.spent) < 0 ? s.txnOver : s.txnIn}`}>
                  {money0(Math.abs(Number(budget.cap) - Number(budget.spent)))}
                </span>
              </div>
            </div>

            {txnsLoading && (
              <div className={s.txnState}>Loading…</div>
            )}
            {txnsErr && (
              <div className={s.txnState}>{txnsErr}</div>
            )}
            {txns && txns.length === 0 && (
              <div className={s.txnState}>No transactions this month.</div>
            )}
            {txns && txns.length > 0 && (
              <div className={s.txnList}>
                {txns.map(tx => (
                  <div key={tx.id} className={s.txnRow}>
                    <div className={s.txnLeft}>
                      <div className={s.txnMerchant}>{tx.merchant_name || tx.name || '—'}</div>
                      <div className={s.txnDate}>
                        {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {tx.account_name && <span className={s.txnAcct}> · {tx.account_name}</span>}
                      </div>
                    </div>
                    <div className={`${s.txnAmt} ${Number(tx.amount) < 0 ? s.txnAmtExp : s.txnAmtInc}`}>
                      {Number(tx.amount) < 0 ? '−' : '+'}{money(Math.abs(Number(tx.amount)))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
