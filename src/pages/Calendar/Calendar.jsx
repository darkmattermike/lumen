import { useState, useMemo } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import { money } from '../../lib/format'
import s from './Calendar.module.css'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const blankForm = { name: '', amount: '', type: 'expense', day_of_month: '1', icon: '📌' }

export default function Calendar() {
  const { data, loading, error, refresh } = useApi(() => api.calendar(), [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [editId, setEditId] = useState(null)
  const [edit, setEdit] = useState({ amount: '', day_of_month: '' })

  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), todayDate = now.getDate()
  const recurring = data?.recurring?.filter(r => r.active) || []
  const expanded = data?.expanded || []

  const bills = recurring.filter(r => r.type !== 'income').reduce((t, r) => t + Number(r.amount), 0)
  const income = recurring.filter(r => r.type === 'income').reduce((t, r) => t + Number(r.amount), 0)

  const byDay = useMemo(() => {
    const map = {}
    for (const e of expanded) (map[e.day_of_month] ||= []).push(e)
    return map
  }, [expanded])

  const cells = useMemo(() => {
    const first = new Date(y, m, 1).getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const out = []
    for (let i = 0; i < first; i++) out.push(null)
    for (let d = 1; d <= days; d++) out.push(d)
    return out
  }, [y, m])

  async function createItem() {
    const amount = Number(form.amount)
    const day = Number(form.day_of_month)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || day < 1 || day > 31) return
    try {
      await api.createRecurring({ name: form.name.trim(), amount, type: form.type, day_of_month: day, icon: form.icon || '📌', frequency: 'monthly' })
      setForm(blankForm); setAdding(false); refresh()
    } catch { /* */ }
  }
  async function saveEdit(r) {
    const amount = Number(edit.amount), day = Number(edit.day_of_month)
    const body = {}
    if (Number.isFinite(amount) && amount > 0 && amount !== Number(r.amount)) body.amount = amount
    if (Number.isFinite(day) && day >= 1 && day <= 31 && day !== Number(r.day_of_month)) body.day_of_month = day
    setEditId(null)
    if (!Object.keys(body).length) return
    try { await api.updateRecurring(r.id, body); refresh() } catch { /* */ }
  }
  async function remove(r) {
    try { await api.deleteRecurring(r.id); refresh() } catch { /* */ }
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <div className={s.eyebrow}>Rhythm</div>
          <h1 className={s.title}>Calendar</h1>
        </div>
        <div className={s.summary}>
          <Stat label="Monthly bills" value={money(bills)} tone="rose" />
          <Stat label="Monthly income" value={money(income)} tone="mint" />
          <Stat label="Net" value={money(income - bills, { sign: true })} tone={income - bills >= 0 ? 'teal' : 'rose'} />
        </div>
      </header>

      {loading && !data && <div className={s.state}>Loading calendar…</div>}
      {error && <div className={s.state}>Couldn’t load calendar. {error}</div>}

      <div className={s.layout}>
        {/* month grid */}
        <div className={s.calCard}>
          <div className={s.monthLabel}>{MONTHS[m]} {y}</div>
          <div className={s.weekRow}>{WD.map(d => <span key={d}>{d}</span>)}</div>
          <div className={s.grid}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`b${i}`} className={s.blank} />
              const items = byDay[d] || []
              return (
                <div key={d} className={`${s.cell} ${d === todayDate ? s.today : ''}`}>
                  <span className={s.dnum}>{d}</span>
                  <div className={s.pills}>
                    {items.slice(0, 3).map((it, k) => (
                      <span key={k} className={`${s.pill} ${it.type === 'income' ? s.pIn : s.pOut}`} title={`${it.name} · ${money(it.amount)}`}>
                        {it.icon || (it.type === 'income' ? '＋' : '•')} {it.name}
                      </span>
                    ))}
                    {items.length > 3 && <span className={s.more}>+{items.length - 3}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* recurring list + add */}
        <div className={s.side}>
          <div className={s.sideHead}>
            <h2>Recurring</h2>
            <button className={s.add} onClick={() => setAdding(v => !v)}>{adding ? 'Close' : '+ Add'}</button>
          </div>

          {adding && (
            <div className={s.form}>
              <input className={s.in} placeholder="Name" value={form.name} autoFocus onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className={s.formRow}>
                <input className={s.inIcon} value={form.icon} maxLength={2} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
                <input className={s.inAmt} placeholder="Amount" inputMode="decimal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className={s.formRow}>
                <select className={s.sel} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="expense">Bill</option>
                  <option value="income">Income</option>
                </select>
                <div className={s.dayWrap}>
                  <span className={s.dayL}>Day</span>
                  <input className={s.inDay} inputMode="numeric" value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} />
                </div>
              </div>
              <button className={s.save} onClick={createItem}>Add recurring</button>
            </div>
          )}

          <div className={s.items}>
            {recurring.sort((a, b) => a.day_of_month - b.day_of_month).map(r => (
              <div key={r.id} className={s.item}>
                <span className={s.itemIcon}>{r.icon || (r.type === 'income' ? '💰' : '📌')}</span>
                <div className={s.itemMeta}>
                  <div className={s.itemName}>{r.name}</div>
                  {editId === r.id ? (
                    <div className={s.editRow}>
                      <span className={s.dayL}>Day</span>
                      <input className={s.miniDay} defaultValue={r.day_of_month} onChange={e => setEdit(p => ({ ...p, day_of_month: e.target.value }))} />
                      <input className={s.miniAmt} defaultValue={Number(r.amount).toFixed(2)} onChange={e => setEdit(p => ({ ...p, amount: e.target.value }))} />
                      <button className={s.ok} onClick={() => saveEdit(r)}>✓</button>
                    </div>
                  ) : (
                    <div className={s.itemDay}>Day {r.day_of_month} · monthly</div>
                  )}
                </div>
                <div className={s.itemRight}>
                  <span className={`${s.itemAmt} ${r.type === 'income' ? s.incomeAmt : ''}`}>{r.type === 'income' ? money(r.amount, { sign: true }) : money(-Math.abs(r.amount))}</span>
                  <div className={s.itemActions}>
                    <button onClick={() => { setEditId(editId === r.id ? null : r.id); setEdit({ amount: r.amount, day_of_month: r.day_of_month }) }} title="Edit">✎</button>
                    <button onClick={() => remove(r)} title="Delete" className={s.delBtn}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
