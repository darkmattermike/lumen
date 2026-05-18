import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import Spotlight from '../../components/Spotlight/Spotlight'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Calendar.module.css'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TYPE_OPTS = [
  { value: 'bill',         label: 'Bill',         color: 'var(--debt)' },
  { value: 'subscription', label: 'Subscription', color: 'var(--warn)' },
  { value: 'income',       label: 'Income',       color: 'var(--safe)' },
  { value: 'transfer',     label: 'Transfer',     color: 'var(--calm)' },
]

const ICON_OPTS = ['🏠','⚡','🌐','📱','🎵','📺','☁️','🚗','💊','🐾','🎓','💰','💼','🏋️','🍽️','☕','🎮','📦','✈️','🔧']

function buildGrid(year, month) {
  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, month: 'prev' })
  for (let d = 1; d <= daysInMonth; d++)  cells.push({ day: d, month: 'cur' })
  let next = 1
  while (cells.length % 7 !== 0) cells.push({ day: next++, month: 'next' })
  return cells
}

function fmt(n) {
  return Math.abs(Number(n||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
}

// ── Add Recurring Modal and adding extra text here to push as new───────────────────────────────────────
function RecurringModal({ item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm]     = useState({
    name:         item?.name              || '',
    amount:       item?.amount            || '',
    day_of_month: item?.day_of_month      || '',
    type:         item?.type              || 'bill',
    icon:         item?.icon              || '📦',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k,v) { setForm(f=>({...f,[k]:v})); setError('') }

  async function handleSave() {
    if (!form.name.trim())    return setError('Name is required')
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return setError('Enter a valid amount')
    if (!form.day_of_month || form.day_of_month < 1 || form.day_of_month > 31) return setError('Day must be between 1 and 31')

    setSaving(true)
    try {
      const payload = {
        name:         form.name.trim(),
        amount:       Number(form.amount),
        day_of_month: Number(form.day_of_month),
        type:         form.type,
        icon:         form.icon,
      }
      if (isEdit) {
        await api.updateRecurring(item.id, payload)
      } else {
        await api.createRecurring(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const typeColor = TYPE_OPTS.find(t => t.value === form.type)?.color || 'var(--ink-2)'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{isEdit ? 'Edit Recurring Item' : 'New Recurring Item'}</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldLabel}>Type</div>
          <div className={styles.typeRow}>
            {TYPE_OPTS.map(t => (
              <button
                key={t.value}
                className={`${styles.typeBtn} ${form.type === t.value ? styles.typeBtnOn : ''}`}
                style={form.type === t.value ? { borderColor: t.color, color: t.color, background: `${t.color}18` } : {}}
                onClick={() => set('type', t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.fieldLabel}>Icon</div>
          <div className={styles.iconGrid}>
            {ICON_OPTS.map(ic => (
              <button
                key={ic}
                className={`${styles.iconBtn} ${form.icon === ic ? styles.iconBtnOn : ''}`}
                onClick={() => set('icon', ic)}
              >
                {ic}
              </button>
            ))}
          </div>

          <div className={styles.fieldLabel}>Name</div>
          <input
            className={styles.input}
            placeholder="e.g. Rent, Netflix, Salary"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />

          <div className={styles.twoCol}>
            <div>
              <div className={styles.fieldLabel}>Amount ($)</div>
              <input
                className={styles.input}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>
            <div>
              <div className={styles.fieldLabel}>Day of Month</div>
              <input
                className={styles.input}
                type="number"
                min="1"
                max="31"
                placeholder="1–31"
                value={form.day_of_month}
                onChange={e => set('day_of_month', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewIcon}>{form.icon}</div>
            <div>
              <div className={styles.previewName}>{form.name || 'Item Name'}</div>
              <div className={styles.previewMeta}>
                {form.type} · day {form.day_of_month || '—'} · {form.amount ? `$${Number(form.amount).toFixed(2)}` : '$0.00'}
              </div>
            </div>
            <div className={styles.previewBadge} style={{ color: typeColor, borderColor: `${typeColor}44`, background: `${typeColor}12` }}>
              {form.type}
            </div>
          </div>

          {error && <div className={styles.modalError}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Calendar() {
  const today = new Date()
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const { data, loading, error, refresh } = useApi(api.calendar)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { recurring = [], upcoming = [], remainingBills = 0 } = data

  const eventMap = {}
  recurring.forEach(r => {
    if (!eventMap[r.day_of_month]) eventMap[r.day_of_month] = []
    eventMap[r.day_of_month].push(r)
  })

  // All recurring sorted by day for the sidebar — replaces the split upcoming/earlier logic
  const allSorted = [...recurring].sort((a, b) => a.day_of_month - b.day_of_month)

  const grid = buildGrid(viewDate.year, viewDate.month)
  const monthLabel = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const isCurrentMonth = viewDate.year === today.getFullYear() && viewDate.month === today.getMonth()

  function prevMonth() {
    setViewDate(v => { const d = new Date(v.year, v.month-1, 1); return { year:d.getFullYear(), month:d.getMonth() } })
  }
  function nextMonth() {
    setViewDate(v => { const d = new Date(v.year, v.month+1, 1); return { year:d.getFullYear(), month:d.getMonth() } })
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this recurring item?')) return
    await api.deleteRecurring(id)
    refresh()
  }

  const typeColor = { bill:'var(--debt)', subscription:'var(--warn)', income:'var(--safe)', transfer:'var(--calm)' }

  return (
    <>
      {(showModal || editItem) && (
        <RecurringModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSaved={refresh}
        />
      )}

      <ScreenWrap>
        <div className={styles.header}>
          <div>
            <div className={styles.pre}>◷ What's Coming</div>
            <div className={styles.title}>Calendar</div>
            <div className={styles.sub}>
              Every bill, paycheck, and recurring charge mapped to the day. Lumen warns you
              before cluster weeks and flags when cash could run thin before a paycheck.
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.monthNav}>
              <button className={styles.navBtn} onClick={prevMonth}>‹</button>
              <span>{monthLabel}</span>
              <button className={styles.navBtn} onClick={nextMonth}>›</button>
            </div>
            <button className={styles.addBtn} onClick={() => setShowModal(true)}>
              + Add Recurring
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.calMain}>
            <div className={styles.dow}>
              {DAYS_OF_WEEK.map(d => <div key={d} className={styles.dowCell}>{d}</div>)}
            </div>
            <div className={styles.grid}>
              {grid.map((cell, i) => {
                const events = cell.month === 'cur' ? (eventMap[cell.day] || []) : []
                const isToday = isCurrentMonth && cell.month === 'cur' && cell.day === today.getDate()
                return (
                  <div key={i} className={[
                    styles.cell,
                    cell.month !== 'cur' ? styles.otherMonth : '',
                    isToday ? styles.today : '',
                    events.length > 0 ? styles.hasEvent : '',
                  ].join(' ')}>
                    <div className={styles.cellDate}>{cell.day}</div>
                    {events.map((ev, ei) => (
                      <div key={ei} className={`${styles.calEvent} ${styles[ev.type] || ''}`}>
                        {ev.icon} {ev.name}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.aside}>
            {isCurrentMonth && (
              <div className={styles.remaining}>
                <div className={styles.remLabel}>Remaining this Cycle</div>
                <div className={styles.remVal}>${fmt(remainingBills)}</div>
                <div className={styles.remSub}>Committed bills left this month</div>
              </div>
            )}

            <div className={styles.upcomingHead}>
              {isCurrentMonth ? 'This Month' : `Events in ${monthLabel}`}
            </div>

            {allSorted.length === 0 ? (
              <div style={{fontSize:12,color:'var(--ink-3)',padding:'8px 0',lineHeight:1.65}}>
                No recurring items yet. Click <strong style={{color:'var(--safe)'}}>+ Add Recurring</strong> to get started.
              </div>
            ) : allSorted.map(ev => {
              const isPast = isCurrentMonth && ev.day_of_month < today.getDate()
              const upcomingEntry = upcoming.find(u => u.id === ev.id)
              const daysUntil = upcomingEntry?.daysUntil
              return (
                <div
                  key={ev.id}
                  className={styles.eventRow}
                  style={ev.type==='income' ? {background:'rgba(93,202,165,.04)',borderRadius:8,padding:'8px 4px'} : {}}
                >
                  <div className={styles.eventDate} style={isPast ? {color:'var(--ink-4)'} : ev.type==='income' ? {color:'rgba(93,202,165,.6)'} : {}}>
                    Day {ev.day_of_month}
                  </div>
                  <div className={styles.eventDot} style={{background: isPast ? 'var(--ink-4)' : typeColor[ev.type] || 'var(--warn)'}} />
                  <div className={styles.eventInfo}>
                    <div className={styles.eventName} style={isPast ? {color:'var(--ink-3)'} : ev.type==='income' ? {color:'rgba(93,202,165,.9)'} : {}}>
                      {ev.icon} {ev.name}
                    </div>
                    <div className={styles.eventType} style={isPast ? {color:'var(--ink-4)'} : ev.type==='income' ? {color:'rgba(93,202,165,.4)'} : {}}>
                      {ev.type}{isCurrentMonth ? (isPast ? ' · passed' : daysUntil === 0 ? ' · Today' : ` · in ${daysUntil} day${daysUntil===1?'':'s'}`) : ''}
                    </div>
                  </div>
                  <div className={styles.eventAmt} style={{color: isPast ? 'var(--ink-3)' : typeColor[ev.type] || 'var(--warn)'}}>
                    {ev.type==='income' ? '+' : '−'}${fmt(ev.amount)}
                  </div>
                  <button className={styles.eventEdit} onClick={() => setEditItem(ev)} title="Edit">✎</button>
                  <button className={styles.eventDelete} onClick={() => handleDelete(ev.id)}>✕</button>
                </div>
              )
            })}

            <div className={styles.spotlightWrap}>
              <Spotlight tag="Lumen on Your Schedule" dotSize={22}>
                <span style={{fontSize:12,lineHeight:1.65}}>
                  {upcoming.filter(e=>e.type!=='income').length > 0
                    ? <><strong>{upcoming.filter(e=>e.type!=='income').length} bills</strong> remaining this month totaling <strong>${fmt(remainingBills)}</strong>.</>
                    : <>No upcoming bills this month.</>
                  }{' '}
                  {upcoming.find(e=>e.type==='income')
                    ? <>Next paycheck in <strong>{upcoming.find(e=>e.type==='income').daysUntil} days</strong>.</>
                    : null
                  }
                </span>
              </Spotlight>
            </div>

            <div style={{marginTop:8}}>
              <div className="section-label" style={{marginBottom:8}}>Legend</div>
              {[
                {label:'Income',        color:'rgba(93,202,165,.5)'},
                {label:'Bills',         color:'rgba(232,115,99,.5)'},
                {label:'Subscriptions', color:'rgba(240,176,76,.5)'},
                {label:'Transfers',     color:'rgba(108,140,255,.5)'},
              ].map(l => (
                <div key={l.label} className={styles.legendRow}>
                  <div className={styles.legendDot} style={{background:l.color}} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScreenWrap>
    </>
  )
}

  if (loading) return <LoadingShell />