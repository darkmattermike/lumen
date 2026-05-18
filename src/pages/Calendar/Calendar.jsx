import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import Spotlight from '../../components/Spotlight/Spotlight'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Calendar.module.css'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const cells = []

  // Previous month tail
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, month: 'prev' })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: 'cur' })
  }
  // Next month head — fill to complete last row
  let next = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, month: 'next' })
  }
  return cells
}

function fmt(n) {
  return Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Calendar() {
  const today = new Date()
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const { data, loading, error } = useApi(api.calendar)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { recurring = [], upcoming = [], remainingBills = 0 } = data

  // Build event map keyed by day-of-month for the current view month
  const eventMap = {}
  recurring.forEach(r => {
    const key = r.day_of_month
    if (!eventMap[key]) eventMap[key] = []
    eventMap[key].push(r)
  })

  const grid = buildGrid(viewDate.year, viewDate.month)
  const monthLabel = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    setViewDate(v => {
      const d = new Date(v.year, v.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  function nextMonth() {
    setViewDate(v => {
      const d = new Date(v.year, v.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const isCurrentMonth = viewDate.year === today.getFullYear() && viewDate.month === today.getMonth()

  return (
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
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={prevMonth}>‹</button>
          <span>{monthLabel}</span>
          <button className={styles.navBtn} onClick={nextMonth}>›</button>
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
            {isCurrentMonth ? 'Upcoming This Month' : `Events in ${monthLabel}`}
          </div>

          {upcoming.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 0', lineHeight: 1.65 }}>
              No recurring bills set up. Add them to your database to see them here.
            </div>
          ) : upcoming.map(ev => (
            <div
              key={ev.id}
              className={styles.eventRow}
              style={ev.type === 'income' ? { background: 'rgba(93,202,165,.04)', borderRadius: 8, padding: '8px 4px' } : {}}
            >
              <div className={styles.eventDate} style={ev.type === 'income' ? { color: 'rgba(93,202,165,.6)' } : {}}>
                Day {ev.day_of_month}
              </div>
              <div className={styles.eventDot} style={{ background: ev.type === 'income' ? 'var(--safe)' : ev.daysUntil <= 2 ? 'var(--debt)' : 'var(--warn)' }} />
              <div className={styles.eventInfo}>
                <div className={styles.eventName} style={ev.type === 'income' ? { color: 'rgba(93,202,165,.9)' } : {}}>
                  {ev.icon} {ev.name}
                </div>
                <div className={styles.eventType} style={ev.type === 'income' ? { color: 'rgba(93,202,165,.4)' } : {}}>
                  {ev.type} · {ev.daysUntil === 0 ? 'Today' : `in ${ev.daysUntil} day${ev.daysUntil === 1 ? '' : 's'}`}
                </div>
              </div>
              <div className={styles.eventAmt} style={{ color: ev.type === 'income' ? 'var(--safe)' : ev.daysUntil <= 2 ? 'var(--debt)' : 'var(--warn)' }}>
                {ev.type === 'income' ? '+' : '−'}${fmt(ev.amount)}
              </div>
            </div>
          ))}

          <div className={styles.spotlightWrap}>
            <Spotlight tag="Lumen on Your Schedule" dotSize={22}>
              <span style={{ fontSize: 12, lineHeight: 1.65 }}>
                {upcoming.filter(e => e.type !== 'income').length > 0
                  ? <><strong>{upcoming.filter(e => e.type !== 'income').length} bills</strong> remaining this month totaling <strong>${fmt(remainingBills)}</strong>.</>
                  : <>No upcoming bills this month.</>
                }{' '}
                {upcoming.find(e => e.type === 'income')
                  ? <>Next paycheck in <strong>{upcoming.find(e => e.type === 'income').daysUntil} days</strong>.</>
                  : null
                }
              </span>
            </Spotlight>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Legend</div>
            {[
              { label: 'Income',        color: 'rgba(93,202,165,.5)' },
              { label: 'Bills',         color: 'rgba(232,115,99,.5)' },
              { label: 'Subscriptions', color: 'rgba(240,176,76,.5)' },
            ].map(l => (
              <div key={l.label} className={styles.legendRow}>
                <div className={styles.legendDot} style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
