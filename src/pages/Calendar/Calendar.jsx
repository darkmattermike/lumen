import { useState, useMemo, useEffect } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money, money0, fmtDate } from '../../lib/format'
import s from './Calendar.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Calendar (Stillwater · Dark)
   Rhythm view: mini calendar grid for the month, agenda timeline
   for all recurring items. Past items gray out if matched in
   transactions. Full recurring editor. Account forecast panel.
   ────────────────────────────────────────────────────────────── */

const WD   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WD_L = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TYPE_OPTS = [
  { value: 'bill',         label: 'Bill'         },
  { value: 'subscription', label: 'Subscription' },
  { value: 'income',       label: 'Income'       },
  { value: 'transfer',     label: 'Transfer'     },
]
const ICONS = ['🏠','⚡','🌐','📱','🎵','📺','☁️','🚗','💊','🐾','🎓','💰','💼','🏋️','🍽️','☕','🎮','📦','✈️','🔧','💡','🛒']

export default function Calendar() {
  const { data, loading, error, refresh }           = useApi(() => api.calendar(), [])
  const { data: txData }                            = useApi(() => api.transactions('?page=0'), [])
  const { data: forecast, refresh: refreshForecast } = useApi(() => api.accountForecast(), [])
  const [editor, setEditor] = useState(null) // null | {} (new) | item (edit)

  const now       = new Date()
  const y         = now.getFullYear()
  const m         = now.getMonth()
  const todayDate = now.getDate()

  const recurring = data?.recurring?.filter(r => r.active !== false) || []
  const expanded  = data?.expanded  || []
  const accounts  = data?.accounts  || []

  const bills  = recurring.filter(r => r.type !== 'income').reduce((t, r) => t + Number(r.amount), 0)
  const income = recurring.filter(r => r.type === 'income' ).reduce((t, r) => t + Number(r.amount), 0)

  // Build a set of dates where a matching transaction was found (to gray past items)
  const matchedDates = useMemo(() => {
    const allTx = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
    const set   = new Set()
    for (const r of recurring) {
      for (const t of allTx) {
        const tName = (t.cleaned_name || t.name || '').toLowerCase()
        const rName = (r.name || '').toLowerCase()
        const sameAmt = Math.abs(Number(t.amount)) === Math.abs(Number(r.amount))
        if (tName.includes(rName.split(' ')[0]) && sameAmt) {
          // Mark the day this recurring item "falls" as paid
          set.add(`${r.id}:${String(t.date).slice(0, 10)}`)
        }
      }
    }
    return set
  }, [txData, recurring])

  // Calendar grid cells
  const cells = useMemo(() => {
    const first = new Date(y, m, 1).getDay()
    const days  = new Date(y, m + 1, 0).getDate()
    const out   = []
    for (let i = 0; i < first; i++) out.push(null)
    for (let d = 1; d <= days; d++) out.push(d)
    return out
  }, [y, m])

  // Group expanded items by day
  const byDay = useMemo(() => {
    const map = {}
    for (const e of expanded) (map[e.day_of_month] ||= []).push(e)
    return map
  }, [expanded])

  const acctById = useMemo(() => {
    const map = {}
    for (const a of accounts) map[a.id] = a
    return map
  }, [accounts])

  // Agenda — sorted by day, with "paid" logic
  const agenda = useMemo(() => {
    return [...recurring]
      .sort((a, b) => (a.day_of_month || 0) - (b.day_of_month || 0))
      .map(r => {
        const day  = r.day_of_month || 1
        const date = new Date(y, m, Math.min(day, 28))
        const wd   = WD_L[date.getDay()]
        const past = day < todayDate
        // "paid" = past AND we found a matching transaction
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`
        const paid   = past && matchedDates.has(`${r.id}:${dateStr}`)
        const isToday = day === todayDate
        const diff = day - todayDate
        const when = isToday ? 'Today'
          : past    ? `${wd} ${day}`
          : diff === 1 ? `Tomorrow · ${wd}`
          : `In ${diff} days · ${wd}`
        return { ...r, when, paid, past, income: r.type === 'income', dateStr }
      })
  }, [recurring, y, m, todayDate, matchedDates])

  async function remove(r) {
    try { await api.deleteRecurring(r.id); refresh(); refreshForecast() } catch { /* */ }
  }
  function onSaved() { setEditor(null); refresh(); refreshForecast() }

  return (
    <SwShell>
      {/* ── page head ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Rhythm</div>
          <h1 className={s.title}>Your financial calendar</h1>
          <div className={s.subtitle}>
            {MONTHS[m]} {y} · {recurring.length} recurring item{recurring.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className={s.summary}>
          <div className={s.stat}>
            <div className={s.statKey}>Monthly bills</div>
            <div className={`${s.statValDebt} ${s.tabnum}`}>{money(bills)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Monthly income</div>
            <div className={`${s.statValIn} ${s.tabnum}`}>{money(income)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Net</div>
            <div className={`${income - bills >= 0 ? s.statValIn : s.statValDebt} ${s.tabnum}`}>
              {income - bills >= 0 ? '+' : '−'}{money(Math.abs(income - bills)).slice(1)}
            </div>
          </div>
        </div>
      </div>

      {loading && !data && <div className={s.state}>Loading calendar…</div>}
      {error   && !data && <div className={s.state}>Couldn't load calendar. {error}</div>}

      {/* ── cash-flow forecast panel ── */}
      {forecast && !forecast.unconfigured && !forecast.needsMigration && (
        <div className={s.fc}>
          <div className={s.fcBar}>
            <div className={s.fcBarL}>
              <span className={s.fcBlink} />
              <span className={s.fcGrn}>Cash-flow · next {forecast.horizonDays}d</span>
              {forecast.nextPayDate && <span className={s.fcPay}>paycheck {fmtDate(forecast.nextPayDate)}</span>}
            </div>
            {forecast.safeToSave > 0 && (
              <div className={s.fcSave}>safe to save <b>{money0(forecast.safeToSave)}</b></div>
            )}
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
              <div className={s.fcActHead}>Actions needed</div>
              {forecast.recommendations.map((r, i) => (
                <div key={i} className={`${s.fcAct} ${r.urgent ? s.fcActUrgent : ''}`}>
                  <div className={s.fcActTop}>
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
      {forecast?.unconfigured && !forecast?.needsMigration && (
        <div className={s.fcNote}>Tag your accounts (Source / Protected / Ignore) on the Accounts page to enable the cash-flow forecast.</div>
      )}

      {/* ── main layout: grid + agenda ── */}
      <div className={s.layout}>

        {/* ── mini calendar grid ── */}
        <div className={s.calCard}>
          <div className={s.monthLabel}>{MONTHS[m]} {y}</div>
          <div className={s.weekRow}>{WD.map(d => <span key={d}>{d}</span>)}</div>
          <div className={s.grid}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`b${i}`} className={s.blank} />
              const items = byDay[d] || []
              const past  = d < todayDate
              const isT   = d === todayDate
              return (
                <div key={d} className={`${s.cell} ${isT ? s.today : ''} ${past && !isT ? s.pastCell : ''}`}>
                  <span className={s.dnum}>{d}</span>
                  <div className={s.pills}>
                    {items.slice(0, 3).map((it, k) => (
                      <span key={k}
                        className={`${s.pill} ${it.type === 'income' ? s.pIn : s.pOut}`}
                        title={`${it.name} · ${money(it.amount)}`}>
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

        {/* ── agenda timeline ── */}
        <div className={s.agenda}>
          <div className={s.agendaHead}>
            <h2 className={s.agendaTitle}>Recurring</h2>
            <button className={s.addBtn} onClick={() => setEditor({})}>+ Add</button>
          </div>

          <div className={s.tl}>
            {agenda.length === 0 && <div className={s.empty}>No recurring items yet. Add one above.</div>}
            {agenda.map((r, i) => {
              const acct = r.account_id ? acctById[r.account_id] : null
              const isToday = r.day_of_month === todayDate

              return (
                <div key={r.id}
                  className={`${s.ev} ${r.income ? s.evIncome : ''} ${r.paid ? s.evPaid : ''} ${r.past && !r.paid && !isToday ? s.evPast : ''}`}
                  style={{ '--d': `${0.08 + i * 0.04}s` }}>

                  {/* today indicator */}
                  {isToday && <div className={s.todayBar}><span className={s.todayPill}>Today</span></div>}

                  <span className={`${s.node} ${r.income ? s.nodeIncome : ''} ${r.paid ? s.nodePaid : ''}`} />

                  <div className={s.when}>{r.when}</div>

                  <div className={s.evBody}>
                    <div className={s.evLine}>
                      <span className={s.evIcon}>{r.icon || (r.income ? '💰' : '📦')}</span>
                      <span className={s.evName}>{r.name}</span>
                      <span className={`${s.evAmt} ${r.income ? s.evAmtIn : ''} ${s.tabnum}`}>
                        {r.income ? `+${money(r.amount).slice(1)}` : `−${money(Math.abs(r.amount)).slice(1)}`}
                      </span>
                    </div>

                    <div className={s.evMeta}>
                      <span className={s.evFreq}>{r.frequency === 'biweekly' ? 'biweekly' : 'monthly'}</span>
                      {acct
                        ? <span className={s.evAcct}>{acct.icon || ''}{acct.name}{acct.mask ? ` ··${acct.mask}` : ''}</span>
                        : <span className={s.evUnassigned}>unassigned</span>}
                      {r.paid && <span className={s.evPaidBadge}>✓ posted</span>}
                    </div>
                  </div>

                  <div className={s.evActs}>
                    <button className={s.evEdit} onClick={() => setEditor(r)} title="Edit" aria-label={`Edit ${r.name}`}>✎</button>
                    <button className={s.evDel}  onClick={() => remove(r)}    title="Delete" aria-label={`Delete ${r.name}`}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editor !== null && (
        <RecurringEditor
          item={editor.id ? editor : null}
          accounts={accounts}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </SwShell>
  )
}

/* ── Recurring editor modal ── */
function RecurringEditor({ item, accounts, onClose, onSaved }) {
  const isEdit = !!item
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')
  const [form, setForm] = useState(() => ({
    name:         item?.name        || '',
    type:         item?.type        || 'bill',
    amount:       item != null ? String(item.amount ?? '') : '',
    frequency:    item?.frequency   || 'monthly',
    day_of_month: String(item?.day_of_month || 1),
    start_date:   item?.start_date  ? String(item.start_date).slice(0, 10) : '',
    account_id:   item?.account_id  != null ? String(item.account_id) : '',
    icon:         item?.icon        || '📦',
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
    if (!form.name.trim())                            return setErr('Name is required.')
    if (!Number.isFinite(amount) || amount <= 0)      return setErr('Enter an amount greater than 0.')
    if (form.frequency === 'monthly') {
      const d = Number(form.day_of_month)
      if (!(d >= 1 && d <= 31))                       return setErr('Day of month must be 1–31.')
    } else if (!form.start_date) {
      return setErr('Biweekly items need a start date.')
    }

    const acctId = form.account_id ? Number(form.account_id) : null
    const base = {
      name: form.name.trim(), amount, type: form.type, icon: form.icon || null,
      frequency: form.frequency,
      ...(form.frequency === 'monthly'
        ? { day_of_month: Number(form.day_of_month) }
        : { start_date: form.start_date }),
    }

    setBusy(true)
    try {
      if (isEdit) {
        await api.updateRecurring(item.id, { ...base, account_id: acctId })
      } else {
        const created = await api.createRecurring(base)
        if (acctId != null && created?.id) await api.updateRecurring(created.id, { account_id: acctId })
      }
      onSaved()
    } catch (e) { setErr(e?.message || 'Could not save.'); setBusy(false) }
  }

  async function del() {
    setBusy(true)
    try { await api.deleteRecurring(item.id); onSaved() }
    catch (e) { setErr(e?.message || 'Could not delete.'); setBusy(false) }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h3 className={s.modalTitle}>{isEdit ? 'Edit recurring' : 'New recurring item'}</h3>
          <button className={s.modalX} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Type */}
        <div className={s.mfld}>
          <label className={s.mlabel}>Type</label>
          <div className={s.typeRow}>
            {TYPE_OPTS.map(t => (
              <button key={t.value} type="button"
                className={`${s.typeBtn} ${form.type === t.value ? s.typeBtnOn : ''}`}
                onClick={() => set('type', t.value)}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className={s.mfld}>
          <label className={s.mlabel}>Name</label>
          <input className={s.min} value={form.name} autoFocus placeholder="e.g. Rent, Paycheck, Spotify"
            onChange={e => set('name', e.target.value)} />
        </div>

        <div className={s.mrow}>
          {/* Amount */}
          <div className={s.mfld}>
            <label className={s.mlabel}>Amount</label>
            <input className={s.min} inputMode="decimal" placeholder="0.00"
              value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          {/* Account */}
          <div className={s.mfld}>
            <label className={s.mlabel}>Account</label>
            <select className={s.msel} value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Unassigned</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}{a.mask ? ` ··${a.mask}` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequency */}
        <div className={s.mfld}>
          <label className={s.mlabel}>Frequency</label>
          <div className={s.typeRow}>
            <button type="button"
              className={`${s.typeBtn} ${form.frequency === 'monthly' ? s.typeBtnOn : ''}`}
              onClick={() => set('frequency', 'monthly')}>Monthly</button>
            <button type="button"
              className={`${s.typeBtn} ${form.frequency === 'biweekly' ? s.typeBtnOn : ''}`}
              onClick={() => set('frequency', 'biweekly')}>Biweekly</button>
          </div>
        </div>

        {form.frequency === 'monthly' ? (
          <div className={s.mfld}>
            <label className={s.mlabel}>Day of month</label>
            <input className={s.min} inputMode="numeric" value={form.day_of_month}
              onChange={e => set('day_of_month', e.target.value)} />
            <div className={s.mhint}>Which day it recurs (1–31).</div>
          </div>
        ) : (
          <div className={s.mfld}>
            <label className={s.mlabel}>First date</label>
            <input className={s.min} type="date" value={form.start_date}
              onChange={e => set('start_date', e.target.value)} />
            <div className={s.mhint}>Repeats every 14 days from this date.</div>
          </div>
        )}

        {/* Icon */}
        <div className={s.mfld}>
          <label className={s.mlabel}>Icon</label>
          <div className={s.iconGrid}>
            {ICONS.map(ic => (
              <button key={ic} type="button"
                className={`${s.iconBtn} ${form.icon === ic ? s.iconOn : ''}`}
                onClick={() => set('icon', ic)}>{ic}</button>
            ))}
          </div>
        </div>

        {err && <div className={s.merr}>{err}</div>}

        <div className={s.modalFoot}>
          {isEdit
            ? <button className={s.delBtn} onClick={del} disabled={busy}>Delete</button>
            : <span />}
          <div className={s.footRight}>
            <button className={s.mcancel} onClick={onClose} disabled={busy}>Cancel</button>
            <button className={s.msave}   onClick={save}    disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add recurring'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
