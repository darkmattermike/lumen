import { useState, useMemo, useEffect } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import { money, money0, fmtDate } from '../../lib/format'
import s from './Calendar.module.css'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const TYPE_OPTS = [
  { value: 'bill', label: 'Bill' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]
const ICONS = ['🏠','⚡','🌐','📱','🎵','📺','☁️','🚗','💊','🐾','🎓','💰','💼','🏋️','🍽️','☕','🎮','📦','✈️','🔧','💡','🛒']

export default function Calendar() {
  const { data, loading, error, refresh } = useApi(() => api.calendar(), [])
  const { data: forecast, refresh: refreshForecast } = useApi(() => api.accountForecast(), [])
  const [editor, setEditor] = useState(null) // null | {} (new) | item (edit)

  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), todayDate = now.getDate()
  const recurring = data?.recurring?.filter(r => r.active !== false) || []
  const expanded = data?.expanded || []
  const accounts = data?.accounts || []

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

  const acctById = useMemo(() => {
    const map = {}
    for (const a of accounts) map[a.id] = a
    return map
  }, [accounts])

  const agenda = useMemo(() => (
    [...recurring].sort((a, b) => a.day_of_month - b.day_of_month).map(r => {
      const day = r.day_of_month
      const date = new Date(y, m, Math.min(day, 28))
      const wd = WD[date.getDay()]
      const paid = day < todayDate
      const isToday = day === todayDate
      const diff = day - todayDate
      const when = paid ? `${wd} ${day} · Paid`
        : isToday ? 'Today'
        : diff === 1 ? `Tomorrow · ${wd}`
        : `In ${diff} days · ${wd}`
      return { ...r, when, paid, income: r.type === 'income' }
    })
  ), [recurring, y, m, todayDate])

  async function remove(r) {
    try { await api.deleteRecurring(r.id); refresh(); refreshForecast() } catch { /* */ }
  }
  function onSaved() { setEditor(null); refresh(); refreshForecast() }

  const freqLabel = (r) => (r.frequency === 'biweekly' ? 'biweekly' : 'monthly')

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

      {/* ── cash-flow forecast: are accounts covered through payday? ── */}
      {forecast && !forecast.unconfigured && !forecast.needsMigration && (
        <div className={s.fc}>
          <div className={s.fcBar}>
            <div className={s.fcBarL}>
              <span className={s.fcBlink} />
              <span className={s.fcGrn}>Cash-flow · next {forecast.horizonDays}d</span>
              {forecast.nextPayDate && <span className={s.fcPay}>paycheck {fmtDate(forecast.nextPayDate)}</span>}
            </div>
            {forecast.safeToSave > 0 && <div className={s.fcSave}>safe to save <b>{money0(forecast.safeToSave)}</b></div>}
          </div>

          <div className={s.fcAccts}>
            {forecast.accounts.map(a => (
              <div key={a.id} className={`${s.fcCell} ${a.safe ? s.fcSafe : s.fcRisk}`}>
                <div className={s.fcCellName}>{a.name}{a.role === 'protected+source' ? ' · hub' : ''}</div>
                <div className={s.fcCellTrough}>{a.trough < 0 ? '−' : ''}{money(Math.abs(a.trough))}</div>
                <div className={s.fcCellMeta}>low {fmtDate(a.troughDate)}{a.dailyPace > 0 ? ` · ${money0(a.dailyPace)}/day` : ''}</div>
                {a.troughCause && <div className={s.fcCellCause}>{a.troughCause.name} {money(a.troughCause.amount)}</div>}
              </div>
            ))}
          </div>

          {forecast.recommendations.length > 0 ? (
            <div className={s.fcActions}>
              <div className={s.fcActionsHead}>Actions needed</div>
              {forecast.recommendations.map((r, i) => (
                <div key={i} className={`${s.fcAction} ${r.urgent ? s.fcActionUrgent : ''}`}>
                  <div className={s.fcActionTop}>
                    <span className={`${s.fcTag} ${r.urgent ? s.fcTagUrgent : r.kind === 'instant' ? s.fcTagInstant : s.fcTagTransfer}`}>
                      {r.kind === 'instant' ? 'INSTANT' : r.urgent ? 'SEND ASAP' : 'TRANSFER'}
                    </span>
                    <span className={s.fcMove}>{money0(r.amount)} · {r.from_account_name} → {r.to_account_name}</span>
                    <span className={s.fcWhen}>{r.urgent ? 'today' : (r.kind === 'instant' ? 'when ' : 'by ') + fmtDate(r.send_by)}</span>
                  </div>
                  <div className={s.fcReason}>{r.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={s.fcClear}>✓ Nothing needed — all accounts stay above {money0(forecast.cushion)} through payday.</div>
          )}
        </div>
      )}
      {forecast && forecast.unconfigured && !forecast.needsMigration && (
        <div className={s.fcNote}>Tag your accounts (Source / Protected / Ignore) on the Accounts page to enable the cash-flow forecast.</div>
      )}
      {forecast && forecast.needsMigration && (
        <div className={s.fcNote}>Run the cash-flow schema migration in your database, then reload to see the forecast.</div>
      )}

      <div className={s.layout}>
        {/* month grid */}
        <div className={s.calCard}>
          <div className={s.monthLabel}>{MONTHS[m]} {y}</div>
          <div className={s.weekRow}>{WD.map(d => <span key={d}>{d}</span>)}</div>
          <div className={s.grid}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`b${i}`} className={s.blank} />
              const items = byDay[d] || []
              const past = d < todayDate
              return (
                <div key={d} className={`${s.cell} ${d === todayDate ? s.today : ''} ${past ? s.pastCell : ''}`}>
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

        {/* recurring — timeline agenda */}
        <div className={s.side}>
          <div className={s.sideHead}>
            <h2>Recurring</h2>
            <button className={s.add} onClick={() => setEditor({})}>+ Add</button>
          </div>

          <div className={s.tl}>
            {agenda.length ? agenda.map(r => {
              const acct = r.account_id ? acctById[r.account_id] : null
              return (
                <div key={r.id} className={`${s.ev} ${r.income ? s.pay : ''} ${r.paid ? s.paid : ''}`}>
                  <span className={s.node} />
                  <div className={s.when}>{r.when}</div>
                  <div className={s.line}>
                    <span className={s.nm}>{r.icon ? `${r.icon} ` : ''}{r.name}</span>
                    <span className={s.evAmt}>{r.income ? money(r.amount, { sign: true }) : money(-Math.abs(r.amount))}</span>
                  </div>
                  <div className={s.catRow}>
                    <span className={s.cat}>
                      {freqLabel(r)}
                      {acct ? ` · ${acct.icon || ''}${acct.name}` : <span className={s.unassigned}> · unassigned</span>}
                    </span>
                    <span className={s.acts}>
                      <button title="Edit" onClick={() => setEditor(r)}>✎</button>
                      <button title="Delete" className={s.delBtn} onClick={() => remove(r)}>×</button>
                    </span>
                  </div>
                </div>
              )
            }) : <div className={s.empty}>No recurring items yet.</div>}
          </div>
        </div>
      </div>

      {editor && (
        <RecurringEditor
          item={editor.id ? editor : null}
          accounts={accounts}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

/* ── full recurring editor (create + edit) ── */
function RecurringEditor({ item, accounts, onClose, onSaved }) {
  const isEdit = !!item
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState(() => ({
    name: item?.name || '',
    type: item?.type || 'bill',
    amount: item != null ? String(item.amount ?? '') : '',
    frequency: item?.frequency || 'monthly',
    day_of_month: String(item?.day_of_month || 1),
    start_date: item?.start_date ? String(item.start_date).slice(0, 10) : '',
    account_id: item?.account_id != null ? String(item.account_id) : '',
    icon: item?.icon || '📌',
  }))
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    setErr('')
    const amount = Number(form.amount)
    if (!form.name.trim()) return setErr('Name is required.')
    if (!Number.isFinite(amount) || amount <= 0) return setErr('Enter an amount greater than 0.')
    if (form.frequency === 'monthly') {
      const d = Number(form.day_of_month)
      if (!(d >= 1 && d <= 31)) return setErr('Day of month must be 1–31.')
    } else if (!form.start_date) {
      return setErr('Biweekly items need a start date.')
    }

    const acctId = form.account_id ? Number(form.account_id) : null
    const base = {
      name: form.name.trim(), amount, type: form.type, icon: form.icon || null,
      frequency: form.frequency,
      ...(form.frequency === 'monthly' ? { day_of_month: Number(form.day_of_month) } : { start_date: form.start_date }),
    }

    setBusy(true)
    try {
      if (isEdit) {
        await api.updateRecurring(item.id, { ...base, account_id: acctId })
      } else {
        const created = await api.createRecurring(base)
        // POST does not accept account_id — assign it with a follow-up PATCH
        if (acctId != null && created?.id) await api.updateRecurring(created.id, { account_id: acctId })
      }
      onSaved()
    } catch (e) {
      setErr(e?.message || 'Could not save.')
      setBusy(false)
    }
  }

  async function del() {
    setBusy(true)
    try { await api.deleteRecurring(item.id); onSaved() }
    catch (e) { setErr(e?.message || 'Could not delete.'); setBusy(false) }
  }

  return (
    <div className={s.modalBackdrop} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h3>{isEdit ? 'Edit recurring' : 'New recurring'}</h3>
          <button className={s.modalX} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={s.field}>
          <label className={s.fLabel}>Name</label>
          <input className={s.fInput} value={form.name} autoFocus placeholder="e.g. Rent, Paycheck, Spotify" onChange={e => set('name', e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fLabel}>Type</label>
          <div className={s.pills2}>
            {TYPE_OPTS.map(t => (
              <button key={t.value} type="button"
                className={`${s.pill2} ${form.type === t.value ? s.pill2On : ''}`}
                onClick={() => set('type', t.value)}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className={s.row2}>
          <div className={s.field}>
            <label className={s.fLabel}>Amount</label>
            <input className={s.fInput} inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.fLabel}>Account</label>
            <select className={s.fSelect} value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Unassigned</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}{a.mask ? ` ••${a.mask}` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={s.field}>
          <label className={s.fLabel}>Frequency</label>
          <div className={s.pills2}>
            <button type="button" className={`${s.pill2} ${form.frequency === 'monthly' ? s.pill2On : ''}`} onClick={() => set('frequency', 'monthly')}>Monthly</button>
            <button type="button" className={`${s.pill2} ${form.frequency === 'biweekly' ? s.pill2On : ''}`} onClick={() => set('frequency', 'biweekly')}>Biweekly</button>
          </div>
        </div>

        {form.frequency === 'monthly' ? (
          <div className={s.field}>
            <label className={s.fLabel}>Day of month</label>
            <input className={s.fInput} inputMode="numeric" value={form.day_of_month} onChange={e => set('day_of_month', e.target.value)} />
            <div className={s.hint}>Which day it recurs (1–31).</div>
          </div>
        ) : (
          <div className={s.field}>
            <label className={s.fLabel}>First date</label>
            <input className={s.fInput} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            <div className={s.hint}>Repeats every 14 days from this date.</div>
          </div>
        )}

        <div className={s.field}>
          <label className={s.fLabel}>Icon</label>
          <div className={s.iconGrid}>
            {ICONS.map(ic => (
              <button key={ic} type="button" className={`${s.iconBtn} ${form.icon === ic ? s.iconOn : ''}`} onClick={() => set('icon', ic)}>{ic}</button>
            ))}
          </div>
        </div>

        {err && <div className={s.err}>{err}</div>}

        <div className={s.modalFoot}>
          {isEdit
            ? <button className={s.del2} onClick={del} disabled={busy}>Delete</button>
            : <span />}
          <div className={s.footRight}>
            <button className={s.cancel} onClick={onClose} disabled={busy}>Cancel</button>
            <button className={s.save} onClick={save} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add recurring'}</button>
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
