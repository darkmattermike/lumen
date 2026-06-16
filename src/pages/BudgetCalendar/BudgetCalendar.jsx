import { useEffect, useRef } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import s from './BudgetCalendar.module.css'
import { request } from '../../data/api'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function BudgetCalendar() {
  const iframeRef = useRef(null)
  const src = `/budget-calendar-standalone.html?apiBase=${encodeURIComponent(API_BASE)}`

  useEffect(() => {
    let disposed = false

    async function sendRemoteState() {
      try {
        const payload = await request('/api/budget-calendar')
        if (disposed) return
        iframeRef.current?.contentWindow?.postMessage({
          type: 'BUDGET_CALENDAR_REMOTE_STATE',
          payload,
        }, window.location.origin)
      } catch (err) {
        console.warn('[BudgetCalendar parent] load failed:', err)
        iframeRef.current?.contentWindow?.postMessage({
          type: 'BUDGET_CALENDAR_REMOTE_STATE_ERROR',
          error: err?.message || 'Load failed',
        }, window.location.origin)
      }
    }

    async function onMessage(event) {
      if (event.origin !== window.location.origin) return
      const msg = event.data || {}

      if (msg.type === 'BUDGET_CALENDAR_REQUEST_REMOTE_STATE') {
        await sendRemoteState()
        return
      }

      if (msg.type === 'BUDGET_CALENDAR_SAVE_STATE') {
        try {
          await request('/api/budget-calendar', {
            method: 'POST',
            body: msg.payload || {},
          })
          iframeRef.current?.contentWindow?.postMessage({
            type: 'BUDGET_CALENDAR_SAVE_OK',
            savedAt: new Date().toISOString(),
          }, window.location.origin)
        } catch (err) {
          console.warn('[BudgetCalendar parent] save failed:', err)
          iframeRef.current?.contentWindow?.postMessage({
            type: 'BUDGET_CALENDAR_SAVE_ERROR',
            error: err?.message || 'Save failed',
          }, window.location.origin)
        }
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      disposed = true
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return (
    <SwShell>
      <div className={s.hostedCalendarPage}>
        <iframe
          ref={iframeRef}
          title="Budget Calendar"
          src={src}
          className={s.hostedCalendarFrame}
        />
      </div>
    </SwShell>
  )
}
