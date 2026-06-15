import SwShell from '../../components/SwShell/SwShell'
import s from './BudgetCalendar.module.css'

export default function BudgetCalendar() {
  return (
    <SwShell>
      <div className={s.hostedCalendarPage}>
        <iframe
          title="Budget Calendar"
          src="/budget-calendar-standalone.html"
          className={s.hostedCalendarFrame}
        />
      </div>
    </SwShell>
  )
}
