import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import Spotlight from '../../components/Spotlight/Spotlight'
import { CALENDAR_EVENTS, UPCOMING_EVENTS } from '../../data/mock'
import styles from './Calendar.module.css'

const TODAY = '2025-05-17'
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Build May 2025 grid (starts Thursday = index 4)
function buildMayGrid() {
  const cells = []
  // April tail: 27–30
  for (let d = 27; d <= 30; d++) cells.push({ day: d, month: 'apr' })
  // May 1–31
  for (let d = 1; d <= 31; d++) cells.push({ day: d, month: 'may' })
  // June head: 1–6
  for (let d = 1; d <= 6; d++) cells.push({ day: d, month: 'jun' })
  return cells
}

const GRID = buildMayGrid()

export default function Calendar() {
  const [month] = useState('May 2025')

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
          <button className={styles.navBtn}>‹</button>
          <span>{month}</span>
          <button className={styles.navBtn}>›</button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.calMain}>
          <div className={styles.dow}>
            {DAYS_OF_WEEK.map(d => <div key={d} className={styles.dowCell}>{d}</div>)}
          </div>
          <div className={styles.grid}>
            {GRID.map((cell, i) => {
              const key = cell.month === 'may' ? `2025-05-${String(cell.day).padStart(2, '0')}` : null
              const events = key ? (CALENDAR_EVENTS[key] || []) : []
              const isToday = key === TODAY
              const isOther = cell.month !== 'may'

              return (
                <div
                  key={i}
                  className={[
                    styles.cell,
                    isOther ? styles.otherMonth : '',
                    isToday ? styles.today : '',
                    events.length ? styles.hasEvent : '',
                  ].join(' ')}
                >
                  <div className={styles.cellDate}>{cell.day}</div>
                  {events.map((ev, ei) => (
                    <div key={ei} className={`${styles.calEvent} ${styles[ev.type]}`}>
                      {ev.label}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.aside}>
          <div className={styles.remaining}>
            <div className={styles.remLabel}>Remaining this Cycle</div>
            <div className={styles.remVal}>$4,028</div>
            <div className={styles.remSub}>After all committed bills · Paycheck May 24</div>
          </div>

          <div className={styles.upcomingHead}>Upcoming · May 17–31</div>

          {UPCOMING_EVENTS.map(ev => (
            <div
              key={ev.name + ev.date}
              className={styles.eventRow}
              style={ev.highlight ? { background: 'rgba(93,202,165,.04)', borderRadius: 8, padding: '8px 4px' } : {}}
            >
              <div className={styles.eventDate} style={ev.highlight ? { color: 'rgba(93,202,165,.6)' } : {}}>
                {ev.date}
              </div>
              <div className={styles.eventDot} style={{ background: ev.color }} />
              <div className={styles.eventInfo}>
                <div className={styles.eventName} style={ev.highlight ? { color: 'rgba(93,202,165,.9)' } : {}}>
                  {ev.name}
                </div>
                <div className={styles.eventType} style={ev.highlight ? { color: 'rgba(93,202,165,.4)' } : {}}>
                  {ev.type}
                </div>
              </div>
              <div className={styles.eventAmt} style={{ color: ev.color }}>{ev.amount}</div>
            </div>
          ))}

          <div className={styles.spotlightWrap}>
            <Spotlight tag="Lumen on May" dotSize={22}>
              <span style={{ fontSize: 12, lineHeight: 1.65 }}>
                Bills are <strong>well spaced</strong>. No cluster weeks. The{' '}
                <span className="w">May 17–20</span> window has two bills back-to-back
                but paycheck on May 24 recovers it cleanly.
              </span>
            </Spotlight>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Legend</div>
            {[
              { label: 'Income',        color: 'rgba(93,202,165,.5)' },
              { label: 'Bills',         color: 'rgba(232,115,99,.5)' },
              { label: 'Subscriptions', color: 'rgba(240,176,76,.5)' },
              { label: 'Transfers',     color: 'rgba(108,140,255,.5)' },
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
