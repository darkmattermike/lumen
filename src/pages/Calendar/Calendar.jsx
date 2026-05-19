import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
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

// ── Add Recurring Modal ───────────────────────────────────────
function RecurringModal({ item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm]     = useState({
    name:         item?.name              || '',
    amount:       item?.amount            || '',
    day_of_month: item?.day_of_month      || '',
    type:         item?.type              || 'bill',
    icon:         item?.icon              || '📦',
    frequency:    item?.frequency         || 'monthly',
    start_date:   item?.start_date ? String(item.start_date).slice(0, 10) : '',
    account_id:   item?.account_id        || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const { data: acctData }  = useApi(api.accounts)

  const isBiweekly = form.frequency === 'biweekly'

  function set(k,v) { setForm(f=>({...f,[k]:v})); setError('') }

  async function handleSave() {
    if (!form.name.trim())    return setError('Name is required')
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return setError('Enter a valid amount')
    if (isBiweekly) {
      if (!form.start_date) return setError('Select a start date for biweekly frequency')
    } else {
      if (!form.day_of_month || form.day_of_month < 1 || form.day_of_month > 31) return setError('Day must be between 1 and 31')
    }

    setSaving(true)
    try {
      const payload = {
        name:         form.name.trim(),
        amount:       Number(form.amount),
        type:         form.type,
        icon:         form.icon,
        frequency:    form.frequency,
        account_id:   form.account_id ? Number(form.account_id) : null,
        ...(isBiweekly
          ? { start_date: form.start_date, day_of_month: new Date(form.start_date).getDate() }
          : { day_of_month: Number(form.day_of_month), start_date: null }
        ),
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
              {form.type === 'income' ? (
                <>
                  <div className={styles.fieldLabel}>Frequency</div>
                  <div className={styles.typeRow}>
                    {[{value:'monthly',label:'Monthly'},{value:'biweekly',label:'Bi-weekly'}].map(f => (
                      <button
                        key={f.value}
                        className={`${styles.typeBtn} ${form.frequency === f.value ? styles.typeBtnOn : ''}`}
                        style={form.frequency === f.value ? { borderColor: 'var(--safe)', color: 'var(--safe)', background: 'rgba(93,202,165,.1)' } : {}}
                        onClick={() => set('frequency', f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {form.type === 'income' && isBiweekly && (
            <div>
              <div className={styles.fieldLabel}>First Payday</div>
              <input
                className={styles.input}
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
          )}

          {form.type === 'income' && !isBiweekly && (
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
          )}

          <div className={styles.fieldLabel}>Account <span style={{color:'var(--ink-3)',fontWeight:400}}>(optional)</span></div>
          <select
            className={styles.acctSelect}
            value={form.account_id}
            onChange={e => set('account_id', e.target.value)}
          >
            <option value=''>— No specific account —</option>
            {(acctData?.accounts || []).filter(a => !a.is_debt).map(a => (
              <option key={a.id} value={a.id}>
                {a.icon || ''} {a.name}{a.mask ? ` ····${a.mask}` : ''} · ${Number(a.balance).toLocaleString()}
              </option>
            ))}
          </select>

          <div className={styles.preview}>
            <div className={styles.previewIcon}>{form.icon}</div>
            <div>
              <div className={styles.previewName}>{form.name || 'Item Name'}</div>
              <div className={styles.previewMeta}>
                {form.type} · {isBiweekly ? `every 2 weeks${form.start_date ? ` from ${form.start_date}` : ''}` : `day ${form.day_of_month || '—'}`} · {form.amount ? `$${Number(form.amount).toFixed(2)}` : '$0.00'}
              </div>
            </div>
            <div className={styles.previewBadge} style={{ color: typeColor, borderColor: `${typeColor}44`, background: `${typeColor}12` }}>
              {isBiweekly ? 'biweekly' : form.type}
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
  const [viewDate, setViewDate]   = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [openFirst, setOpenFirst]     = useState(false)
  const [openSecond, setOpenSecond]   = useState(false)
  const { data, loading, error, refresh } = useApi(api.calendar)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { recurring = [], expanded = [], upcoming = [], remainingBills = 0, accounts = [] } = data

  // Use expanded (biweekly items appear on each occurrence date) for the calendar grid
  const eventMap = {}
  expanded.forEach(r => {
    if (!eventMap[r.day_of_month]) eventMap[r.day_of_month] = []
    eventMap[r.day_of_month].push(r)
  })

  // Sidebar list — use expanded so biweekly shows both paydays, sorted by day
  const allSorted = [...expanded].sort((a, b) => a.day_of_month - b.day_of_month)

  // Split allSorted into 1st-15th and 16th-end for the aside
  const todayDay = today.getDate()
  const firstHalf  = allSorted.filter(ev => ev.day_of_month <= 15)
  const secondHalf = allSorted.filter(ev => ev.day_of_month > 15)

  function halfTotals(items) {
    const expenses = items.filter(ev => ev.type !== 'income').reduce((s, ev) => s + Number(ev.amount), 0)
    const income   = items.filter(ev => ev.type === 'income').reduce((s, ev) => s + Number(ev.amount), 0)
    const remaining = items.filter(ev => ev.type !== 'income' && ev.day_of_month >= todayDay).reduce((s, ev) => s + Number(ev.amount), 0)
    return { expenses, income, remaining }
  }

  // Build account allocation:
  // 1. Bills with a linked account_id show under that specific account
  // 2. Bills without an account_id fall under include_in_balance accounts (checking first)
  function accountAllocation(items, accountList) {
    const upcomingItems = items.filter(ev => ev.type !== 'income' && ev.day_of_month >= todayDay)
    const result = accountList.map(a => {
      // Coerce IDs to numbers for reliable comparison
      const aId    = Number(a.id)
      const linked = upcomingItems.filter(ev => ev.account_id && Number(ev.account_id) === aId)
      // Bills with no account_id fall to checking/savings accounts (or include_in_balance=true)
      const isDefault = a.include_in_balance === true || a.type === 'checking' || a.type === 'savings'
      const unlinked  = isDefault ? upcomingItems.filter(ev => !ev.account_id) : []
      const responsible = [...linked, ...unlinked]
      const needed  = responsible.reduce((s, ev) => s + Number(ev.amount), 0)
      const bal     = Number(a.balance)
      return {
        ...a,
        balance: bal,
        needed,
        responsible,
        short:    needed > 0 && bal < needed,
        shortAmt: Math.max(0, needed - bal),
        surplus:  needed > 0 && bal >= needed ? bal - needed : 0,
      }
    })
    // Avoid double-counting unlinked bills: only the first checking/savings account gets them
    let unlinkedAssigned = false
    return result.map(a => {
      const isDefault = a.include_in_balance === true || a.type === 'checking' || a.type === 'savings'
      if (isDefault && !unlinkedAssigned) { unlinkedAssigned = true; return a }
      if (isDefault && unlinkedAssigned) {
        // Strip unlinked from subsequent default accounts
        const upcomingItems2 = items.filter(ev => ev.type !== 'income' && ev.day_of_month >= todayDay)
        const linked2  = upcomingItems2.filter(ev => ev.account_id && Number(ev.account_id) === Number(a.id))
        const needed2  = linked2.reduce((s, ev) => s + Number(ev.amount), 0)
        const bal2     = Number(a.balance)
        return { ...a, needed: needed2, short: needed2 > 0 && bal2 < needed2, shortAmt: Math.max(0, needed2 - bal2), surplus: needed2 > 0 && bal2 >= needed2 ? bal2 - needed2 : 0 }
      }
      return a
    }).filter(a => a.needed > 0)  // only show accounts with bills due
  }

  const grid = buildGrid(viewDate.year, viewDate.month)
  const monthLabel = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const isCurrentMonth = viewDate.year === today.getFullYear() && viewDate.month === today.getMonth()

  function prevMonth() {
    setSelectedDay(null)
    setViewDate(v => { const d = new Date(v.year, v.month-1, 1); return { year:d.getFullYear(), month:d.getMonth() } })
  }
  function nextMonth() {
    setSelectedDay(null)
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
                const events    = cell.month === 'cur' ? (eventMap[cell.day] || []) : []
                const isToday   = isCurrentMonth && cell.month === 'cur' && cell.day === today.getDate()
                const isSelected = selectedDay === cell.day && cell.month === 'cur'
                const visible   = events.slice(0, 2)
                const overflow  = events.length - visible.length
                return (
                  <div key={i}
                    className={[
                      styles.cell,
                      cell.month !== 'cur' ? styles.otherMonth : '',
                      isToday ? styles.today : '',
                      events.length > 0 ? styles.hasEvent : '',
                      isSelected ? styles.cellSelected : '',
                    ].join(' ')}
                    onClick={() => {
                      if (cell.month !== 'cur') return
                      setSelectedDay(prev => prev === cell.day ? null : cell.day)
                    }}
                  >
                    <div className={styles.cellDate}>{cell.day}</div>
                    {visible.map((ev, ei) => (
                      <div key={ei} className={`${styles.calEvent} ${styles[ev.type] || ''}`}>
                        {ev.icon} {ev.name}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className={styles.calEventMore}>+{overflow} more</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Day detail panel ── */}
            {selectedDay && eventMap[selectedDay] && (
              <div className={styles.dayDetail}>
                <div className={styles.dayDetailHead}>
                  {new Date(viewDate.year, viewDate.month, selectedDay)
                    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                {eventMap[selectedDay].map((ev, i) => (
                  <div key={i} className={styles.dayDetailRow}>
                    <div className={`${styles.dayDetailDot} ${styles[ev.type] || ''}`} />
                    <div className={styles.dayDetailIcon}>{ev.icon}</div>
                    <div className={styles.dayDetailInfo}>
                      <div className={styles.dayDetailName}>{ev.name}</div>
                      <div className={styles.dayDetailMeta}>
                        {ev.frequency === 'biweekly' ? 'biweekly' : ev.type}
                        {ev.frequency === 'biweekly' ? ' · every 2 weeks' : ''}
                      </div>
                    </div>
                    <div className={styles.dayDetailAmt} style={{color: typeColor[ev.type] || 'var(--ink-2)'}}>
                      {ev.type === 'income' ? '+' : '−'}${fmt(ev.amount)}
                    </div>
                    <button className={styles.eventEdit} onClick={() => setEditItem(recurring.find(r => r.id === ev.id) || ev)} title="Edit">✎</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.aside}>
            <div className={styles.spotlightWrap}>
              <LumenInsight
                label="Your Schedule"
                contextType="calendar"
                prompt="Flag the single most important thing about this month's bills, timing, and balance — be specific."
                color="green"
                showWhenNoKey
              />
            </div>

            {isCurrentMonth && (
              <>
                <div className={styles.remLabel}>Remaining in {monthLabel.split(' ')[0]}</div>

                {/* ── 1st–15th half ── */}
                {(() => {
                  const t = halfTotals(firstHalf)
                  const remaining = firstHalf.filter(ev => ev.type !== 'income' && ev.day_of_month >= todayDay).reduce((s,ev) => s + Number(ev.amount), 0)
                  const passed = todayDay > 15
                  const alloc  = accountAllocation(firstHalf, accounts)
                  return (
                    <div className={styles.halfCard}>
                      <div className={styles.halfHeader} onClick={() => setOpenFirst(o => !o)}>
                        <div className={styles.halfLeft}>
                          <div className={styles.halfRange}>May 1 – 15</div>
                          <div className={styles.halfCount}>{firstHalf.length} items{passed ? ' · all passed' : remaining > 0 ? ` · $${fmt(remaining)} remaining` : ''}</div>
                        </div>
                        <div className={styles.halfRight}>
                          <div className={styles.halfTotal} style={{color: passed ? 'var(--ink-3)' : 'var(--debt)'}}>
                            ${fmt(t.expenses)}
                          </div>
                          <span className={`${styles.halfChevron} ${openFirst ? styles.halfChevronOpen : ''}`}>›</span>
                        </div>
                      </div>
                      {openFirst && (
                        <div className={styles.halfBody}>
                          {firstHalf.map((ev, i) => {
                            const isPast = ev.day_of_month < todayDay
                            const u = upcoming.find(u => u.id === ev.id && u.day_of_month === ev.day_of_month)
                            return (
                              <div key={i} className={styles.halfItem}>
                                <span className={styles.halfItemIcon}>{ev.icon}</span>
                                <span className={styles.halfItemName}>
                                  {ev.name}
                                  {ev.account_name && <span className={styles.halfItemAcct}> · {ev.account_name}</span>}
                                </span>
                                <span className={styles.halfItemDay} style={{color: isPast ? 'var(--ink-2)' : u?.daysUntil === 0 ? 'var(--warn)' : 'var(--ink-3)'}}>
                                  {isPast ? 'passed' : u?.daysUntil === 0 ? 'today' : `${u?.daysUntil}d`}
                                </span>
                                <span className={styles.halfItemAmt} style={{color: isPast ? 'var(--ink-1)' : ev.type === 'income' ? 'var(--safe)' : 'var(--debt)'}}>
                                  {ev.type === 'income' ? '+' : '−'}${fmt(ev.amount)}
                                </span>
                              </div>
                            )
                          })}
                          {accounts.length > 0 && (
                            <div className={styles.allocBox}>
                              <div className={styles.allocLabel}>Account allocation</div>
                              {alloc.map((a, i) => (
                                <div key={i} className={styles.allocRow}>
                                  <div>
                                    <div className={styles.allocName}>{a.icon} {a.name}{a.mask ? ` ····${a.mask}` : ''}</div>
                                    <div className={styles.allocBal}>Balance ${fmt(a.balance)} · needs ${fmt(a.needed)}</div>
                                  </div>
                                  <div className={`${styles.allocAmt} ${a.short ? styles.allocShort : styles.allocOk}`}>
                                    {a.short ? `$${fmt(a.shortAmt)} short` : `+$${fmt(a.surplus)} left`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── 16th–end half ── */}
                {(() => {
                  const t = halfTotals(secondHalf)
                  const remaining = secondHalf.filter(ev => ev.type !== 'income' && ev.day_of_month >= todayDay).reduce((s,ev) => s + Number(ev.amount), 0)
                  const alloc  = accountAllocation(secondHalf, accounts)
                  return (
                    <div className={styles.halfCard}>
                      <div className={styles.halfHeader} onClick={() => setOpenSecond(o => !o)}>
                        <div className={styles.halfLeft}>
                          <div className={styles.halfRange}>May 16 – 31</div>
                          <div className={styles.halfCount}>{secondHalf.length} items{remaining > 0 ? ` · $${fmt(remaining)} remaining` : ' · all passed'}</div>
                        </div>
                        <div className={styles.halfRight}>
                          <div className={styles.halfTotal} style={{color: remaining > 0 ? 'var(--debt)' : 'var(--ink-3)'}}>
                            ${fmt(t.expenses)}
                          </div>
                          <span className={`${styles.halfChevron} ${openSecond ? styles.halfChevronOpen : ''}`}>›</span>
                        </div>
                      </div>
                      {openSecond && (
                        <div className={styles.halfBody}>
                          {secondHalf.map((ev, i) => {
                            const isPast = ev.day_of_month < todayDay
                            const u = upcoming.find(u => u.id === ev.id && u.day_of_month === ev.day_of_month)
                            return (
                              <div key={i} className={styles.halfItem}>
                                <span className={styles.halfItemIcon}>{ev.icon}</span>
                                <span className={styles.halfItemName}>
                                  {ev.name}
                                  {ev.account_name && <span className={styles.halfItemAcct}> · {ev.account_name}</span>}
                                </span>
                                <span className={styles.halfItemDay} style={{color: isPast ? 'var(--ink-2)' : u?.daysUntil === 0 ? 'var(--warn)' : 'var(--ink-3)'}}>
                                  {isPast ? 'passed' : u?.daysUntil === 0 ? 'today' : `${u?.daysUntil}d`}
                                </span>
                                <span className={styles.halfItemAmt} style={{color: isPast ? 'var(--ink-1)' : ev.type === 'income' ? 'var(--safe)' : 'var(--debt)'}}>
                                  {ev.type === 'income' ? '+' : '−'}${fmt(ev.amount)}
                                </span>
                              </div>
                            )
                          })}
                          {accounts.length > 0 && (
                            <div className={styles.allocBox}>
                              <div className={styles.allocLabel}>Account allocation</div>
                              {alloc.filter(a => a.covers).map((a, i) => (
                                <div key={i} className={styles.allocRow}>
                                  <div>
                                    <div className={styles.allocName}>{a.name}{a.mask ? ` ····${a.mask}` : ''}</div>
                                    <div className={styles.allocBal}>Balance: ${fmt(a.balance)}</div>
                                  </div>
                                  <div className={`${styles.allocAmt} ${a.short ? styles.allocShort : styles.allocOk}`}>
                                    {a.short ? `$${fmt(remaining - a.balance)} short` : '✓ Covered'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>

        {/* ── Full recurring list below calendar ── */}
        <div className={styles.belowList}>
          <div className={styles.belowHead}>
            {isCurrentMonth ? 'This Month' : `Events in ${monthLabel}`}
          </div>
          {allSorted.length === 0 ? (
            <div className={styles.belowEmpty}>
              No recurring items yet. Click <strong>+ Add Recurring</strong> to get started.
            </div>
          ) : allSorted.map((ev, idx) => {
            const isPast = isCurrentMonth && ev.day_of_month < today.getDate()
            const upcomingEntry = upcoming.find(u => u.id === ev.id && u.day_of_month === ev.day_of_month)
            const daysUntil = upcomingEntry?.daysUntil
            const baseItem  = recurring.find(r => r.id === ev.id) || ev
            const freqLabel = ev.frequency === 'biweekly' ? 'biweekly' : ev.type
            return (
              <div
                key={`${ev.id}-${ev.day_of_month}-${idx}`}
                className={styles.eventRow}
                style={ev.type==='income' ? {background:'rgba(93,202,165,.04)',borderRadius:8,padding:'8px 4px'} : {}}
              >
                <div className={styles.eventDate} style={isPast ? {color:'var(--ink-2)'} : ev.type==='income' ? {color:'rgba(93,202,165,.6)'} : {}}>
                  Day {ev.day_of_month}
                </div>
                <div className={styles.eventDot} style={{background: isPast ? 'var(--ink-2)' : typeColor[ev.type] || 'var(--warn)'}} />
                <div className={styles.eventInfo}>
                  <div className={styles.eventName} style={isPast ? {color:'var(--ink-1)'} : ev.type==='income' ? {color:'rgba(93,202,165,.9)'} : {}}>
                    {ev.icon} {ev.name}
                  </div>
                  <div className={styles.eventType} style={isPast ? {color:'var(--ink-2)'} : ev.type==='income' ? {color:'rgba(93,202,165,.4)'} : {}}>
                    {freqLabel}{isCurrentMonth ? (isPast ? ' · passed' : daysUntil === 0 ? ' · Today' : ` · in ${daysUntil} day${daysUntil===1?'':'s'}`) : ''}
                  </div>
                </div>
                <div className={styles.eventAmt} style={{color: isPast ? 'var(--ink-1)' : typeColor[ev.type] || 'var(--warn)'}}>
                  {ev.type==='income' ? '+' : '−'}${fmt(ev.amount)}
                </div>
                <button className={styles.eventEdit} onClick={() => setEditItem(baseItem)} title="Edit">✎</button>
                <button className={styles.eventDelete} onClick={() => handleDelete(ev.id)}>✕</button>
              </div>
            )
          })}
        </div>
      </ScreenWrap>
    </>
  )
}