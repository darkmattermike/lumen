import SwShell from '../../components/SwShell/SwShell'
import s from './BudgetCalendar.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function BudgetCalendar() {
  const src = `/budget-calendar-standalone.html?apiBase=${encodeURIComponent(API_BASE)}`

  return (
    <SwShell>
      <div className={s.hostedCalendarPage}>
        <iframe
          title="Budget Calendar"
          src={src}
          className={s.hostedCalendarFrame}
        />
      </div>
    </SwShell>
  )
}
