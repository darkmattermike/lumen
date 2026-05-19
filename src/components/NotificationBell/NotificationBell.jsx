import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const [data, setData]         = useState({ notifications: [], unread_count: 0 })
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const panelRef                = useRef(null)

  async function load() {
    try {
      setLoading(true)
      const d = await api.notifications()
      setData(d)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000) // poll every minute
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleOpen() {
    setOpen(v => !v)
    if (!open && data.unread_count > 0) {
      await api.markAllNotificationsRead()
      setData(prev => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }))
    }
  }

  async function dismiss(id) {
    await api.dismissNotification(id)
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }))
  }

  const TYPE_COLORS = {
    alert:   'var(--col-debt)',
    warning: 'var(--col-warn)',
    insight: 'var(--col-calm)',
    win:     'var(--col-safe)',
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button className={styles.bell} onClick={handleOpen} aria-label="Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {data.unread_count > 0 && (
          <span className={styles.badge}>{data.unread_count > 9 ? '9+' : data.unread_count}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>Notifications</span>
            {data.notifications.length > 0 && (
              <button className={styles.clearBtn} onClick={async () => {
                for (const n of data.notifications) await api.dismissNotification(n.id)
                setData({ notifications: [], unread_count: 0 })
              }}>Clear all</button>
            )}
          </div>

          {loading && !data.notifications.length && (
            <div className={styles.empty}>Loading…</div>
          )}

          {!loading && !data.notifications.length && (
            <div className={styles.empty}>
              <span style={{fontSize:28}}>🔔</span>
              <p>You're all caught up</p>
            </div>
          )}

          <div className={styles.list}>
            {data.notifications.map(n => (
              <div key={n.id} className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                style={{ '--accent': TYPE_COLORS[n.type] || 'var(--col-calm)' }}>
                <span className={styles.icon}>{n.icon}</span>
                <div className={styles.body}>
                  <div className={styles.title}>{n.title}</div>
                  <div className={styles.text}>{n.body}</div>
                  <div className={styles.time}>{relativeTime(n.created_at)}</div>
                </div>
                <button className={styles.x} onClick={() => dismiss(n.id)} aria-label="Dismiss">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function relativeTime(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
