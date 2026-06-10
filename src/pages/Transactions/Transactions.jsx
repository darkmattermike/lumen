import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money, initial, fmtDate } from '../../lib/format'
import s from './Transactions.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Activity (Stillwater · Dark)
   Initial load: rolling 60 days. Older pages load on demand
   at 100 rows each via a "Load more" sentinel at the bottom.
   ────────────────────────────────────────────────────────────── */

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

const TX_TYPES = ['expense', 'income', 'transfer']

export default function Transactions() {
  // Initial page load — rolling 60 days + first historical page
  const { data: initialData, loading, error, refresh: refreshInitial } = useApi(
    () => api.transactions('?page=0&days=60'), []
  )
  const { data: budgetsData } = useApi(() => api.budgets(), [])

  // Accumulated historical pages beyond page 0
  const [extraPages, setExtraPages]   = useState([])   // array of rows arrays
  const [nextPage, setNextPage]       = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const sentinelRef = useRef(null)

  // Sync hasMore from initial load
  useEffect(() => {
    if (initialData?.pagination) setHasMore(initialData.pagination.hasMore)
  }, [initialData])

  const [query, setQuery]       = useState('')
  const [cat, setCat]           = useState('All')
  const [editingTx, setEditingTx] = useState(null)

  const budgetNames = useMemo(() => {
    if (!budgetsData?.budgets) return []
    return budgetsData.budgets.map(b => ({ name: b.name, icon: b.icon || '📦' }))
  }, [budgetsData])

  // All rows: initial + any extra pages appended
  const all = useMemo(() => {
    if (!initialData) return []
    const base = [...(initialData.currentMonth || []), ...(initialData.historical || [])]
    for (const page of extraPages) base.push(...page)
    return base
  }, [initialData, extraPages])

  const categories = useMemo(() => {
    const set = new Set(all.map(t => t.category).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [all])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(t => {
      if (cat !== 'All' && t.category !== cat) return false
      if (!q) return true
      return (t.cleaned_name || t.name || '').toLowerCase().includes(q) ||
             (t.category || '').toLowerCase().includes(q)
    })
  }, [all, query, cat])

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of filtered) {
      const k = String(t.date).slice(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(t)
    }
    return Array.from(map.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]))
  }, [filtered])

  const totals = useMemo(() => {
    const month = initialData?.currentMonth || []
    let income = 0, spending = 0, count = 0
    for (const t of month) {
      if (t.tx_type === 'transfer') continue  // transfers are neutral, not in/out
      const amt = Number(t.amount) || 0
      count++
      if (amt > 0) income += Math.abs(amt)
      else spending += Math.abs(amt)
    }
    return { income, spending, count }
  }, [initialData])
  const net = totals.income - totals.spending

  // Load the next historical page
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await api.transactions(`?page=${nextPage}&days=60`)
      const rows = res.historical || []
      setExtraPages(prev => [...prev, rows])
      setNextPage(p => p + 1)
      setHasMore(res.pagination?.hasMore ?? false)
    } catch { /* silently ignore — user can retry */ }
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, nextPage])

  // IntersectionObserver on the sentinel div — auto-load when it scrolls into view
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  function refresh() {
    setExtraPages([])
    setNextPage(1)
    setHasMore(false)
    refreshInitial()
  }

  async function handleSave(t, updates) {
    setEditingTx(null)
    try {
      await api.updateTransaction(t.id, updates)
      refresh()
    } catch { /* */ }
  }

  return (
    <SwShell>
      {/* ── page head ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Activity</div>
          <h1 className={s.title}>Every dollar, in and out</h1>
          <div className={s.subtitle}>
            {new Date().toLocaleDateString('en-US', { month: 'long' })} · {totals.count} transaction{totals.count === 1 ? '' : 's'}
          </div>
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

      {/* ── search + category pills ── */}
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

      {loading && !initialData && <div className={s.state}>Loading transactions…</div>}
      {error   && <div className={s.state}>Couldn't load transactions. <b>{error}</b></div>}
      {initialData && groups.length === 0 && (
        <div className={s.state}>No transactions match — try a different search or category.</div>
      )}

      {/* ── date-grouped ledger ── */}
      <div className={s.list} key={`${cat}|${query.trim().toLowerCase()}`}>
        {groups.map(([date, rows], gi) => (
          <section key={date} className={s.group} style={{ '--d': `${0.12 + Math.min(gi, 8) * 0.06}s` }}>
            <div className={s.groupDate}>{fmtDate(date)}</div>
            <div className={s.groupCard}>
              {rows.map((t, ri) => {
                const isTransfer = t.tx_type === 'transfer'
                const income = !isTransfer && Number(t.amount) > 0
                const nm = t.cleaned_name || t.name
                return (
                  <div key={t.id} className={s.row}
                    style={{ '--d': `${0.18 + Math.min(gi, 8) * 0.06 + ri * 0.04}s` }}
                    onClick={() => setEditingTx(t)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setEditingTx(t) }}>
                    <span className={s.av} style={{ background: avTint(nm) }}>{initial(nm)}</span>
                    <div className={s.meta}>
                      <div className={s.name}>{nm}</div>
                      <div className={s.catRow}>
                        <span className={isTransfer ? s.catTransfer : s.cat}>{isTransfer ? 'Transfer' : (t.category || 'Uncategorized')}</span>
                        {t.account_mask && (
                          <span className={s.acct}>{t.account_institution || t.account_name} ··{t.account_mask}</span>
                        )}
                      </div>
                    </div>
                    <div className={`${isTransfer ? s.amtTransfer : income ? s.amtIn : s.amt} ${s.tabnum}`}>
                      {isTransfer
                        ? money(Math.abs(t.amount)).slice(1)
                        : income
                          ? `+${money(Math.abs(t.amount)).slice(1)}`
                          : `−${money(Math.abs(t.amount)).slice(1)}`}
                    </div>
                    <span className={s.editHint} aria-hidden="true">✎</span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {/* ── pagination sentinel ── */}
        {hasMore && (
          <div ref={sentinelRef} className={s.sentinel}>
            {loadingMore
              ? <span className={s.loadingMore}>Loading more…</span>
              : <button className={s.loadMoreBtn} onClick={loadMore}>Load more</button>}
          </div>
        )}
        {!hasMore && all.length > 0 && !loading && (
          <div className={s.endNote}>All {all.length} transactions loaded</div>
        )}
      </div>

      {editingTx && createPortal(
        <TxEditor
          tx={editingTx}
          budgetNames={budgetNames}
          onClose={() => setEditingTx(null)}
          onSave={handleSave}
        />,
        document.body
      )}
    </SwShell>
  )
}

/* ── Full transaction editor modal ── */
function TxEditor({ tx, budgetNames, onClose, onSave }) {
  const nm  = tx.cleaned_name || tx.name
  const amt = Number(tx.amount) || 0
  // Amount sign is the ground truth for type. Stored tx_type only resolves
  // expense vs transfer (negative) or income vs transfer (positive).
  const derivedType = amt > 0
    ? (tx.tx_type === 'transfer' ? 'transfer' : 'income')
    : amt < 0
      ? (tx.tx_type === 'transfer' ? 'transfer' : 'expense')
      : (tx.tx_type || 'expense')

  const [form, setForm] = useState({
    name:     nm || '',
    category: tx.category || '',
    amount:   String(Math.abs(amt)),
    date:     tx.date ? String(tx.date).slice(0, 10) : '',
    tx_type:  derivedType,
    note:     tx.note || '',
  })
  const [catOpen, setCatOpen]   = useState(false)
  const [catTyping, setCatTyping] = useState(false)
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setBusy(true)
    const amt = Number(form.amount)
    const signedAmt = form.tx_type === 'income' ? Math.abs(amt) : -Math.abs(amt)
    await onSave(tx, {
      name:               form.name.trim() || undefined,
      category:           form.category || null,
      amount:             signedAmt,
      date:               form.date || undefined,
      tx_type:            form.tx_type,
      note:               form.note || null,
      _original_category: tx.category,
    })
    setBusy(false)
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.drawer} onClick={e => e.stopPropagation()}>
        <div className={s.drawerHead}>
          <div className={s.drawerTitle}>Edit transaction</div>
          <button className={s.drawerX} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={s.fld}>
          <label className={s.flabel}>Type</label>
          <div className={s.typeRow}>
            {TX_TYPES.map(t => (
              <button key={t} type="button"
                className={`${s.typeBtn} ${form.tx_type === t ? s.typeBtnOn : ''} ${s['type_' + t] || ''}`}
                onClick={() => set('tx_type', t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={s.fld}>
          <label className={s.flabel}>Name</label>
          <input className={s.fin} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Merchant name" />
        </div>

        <div className={s.fld}>
          <label className={s.flabel}>Category</label>
          <div className={s.catField}>
            <input className={s.fin} value={form.category}
              onChange={e => { set('category', e.target.value); setCatOpen(true); setCatTyping(true) }}
              onFocus={() => { setCatOpen(true); setCatTyping(false) }}
              placeholder="Category" />
            {catOpen && budgetNames.length > 0 && (
              <div className={s.catDrop}>
                <div className={s.catDropHead}>Budget categories</div>
                {budgetNames
                  .filter(b => !catTyping || !form.category || b.name.toLowerCase().includes(form.category.toLowerCase()))
                  .map(b => (
                    <button key={b.name} className={s.catOpt} type="button"
                      onClick={() => { set('category', b.name); setCatOpen(false); setCatTyping(false) }}>
                      <span className={s.catOptIcon}>{b.icon}</span>
                      {b.name}
                    </button>
                  ))}
                <button className={s.catClose} type="button" onClick={() => setCatOpen(false)}>Dismiss</button>
              </div>
            )}
          </div>
        </div>

        <div className={s.frow}>
          <div className={s.fld}>
            <label className={s.flabel}>Amount</label>
            <input className={s.fin} inputMode="decimal" value={form.amount}
              onChange={e => set('amount', e.target.value)} placeholder="0.00" />
          </div>
          <div className={s.fld}>
            <label className={s.flabel}>Date</label>
            <input className={s.fin} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        <div className={s.fld}>
          <label className={s.flabel}>Note</label>
          <input className={s.fin} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optional note" />
        </div>

        <div className={s.drawerFoot}>
          <button className={s.drawerCancel} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={s.drawerSave} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  )
}
