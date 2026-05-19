import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import LumenDot from '../LumenDot/LumenDot'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const [data, setData]       = useState({ notifications: [], unread_count: 0 })
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef              = useRef(null)

  async function load() {
    try {
      setLoading(true)
      const d = await api.notifications()
      setData(d)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
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
    const wasOpen = open
    setOpen(v => !v)
    if (!wasOpen && data.unread_count > 0) {
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

  async function clearAll() {
    for (const n of data.notifications) await api.dismissNotification(n.id)
    setData({ notifications: [], unread_count: 0 })
  }

  const TYPE_COLOR = {
    alert:   'var(--debt)',
    warning: 'var(--warn)',
    insight: 'var(--calm)',
    win:     'var(--safe)',
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      {/* Trigger — Lumen orb with unread badge */}
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
        aria-label="Lumen notifications"
        title="Notifications"
      >
        <LumenDot size={22} rings={open} />
        {data.unread_count > 0 && (
          <span className={styles.badge}>{data.unread_count > 9 ? '9+' : data.unread_count}</span>
        )}
      </button>

      {/* Chat-bubble panel — expands to the right */}
      {open && (
        <div className={styles.bubble}>
          {/* Bubble tail pointing left toward the orb */}
          <div className={styles.tail} />

          <div className={styles.bubbleHeader}>
            <div className={styles.lumenLabel}>
              <LumenDot size={14} />
              <span>Lumen</span>
            </div>
            {data.notifications.length > 0 && (
              <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>
            )}
          </div>

          {loading && !data.notifications.length && (
            <div className={styles.empty}>
              <span className={styles.emptyDots}>···</span>
            </div>
          )}

          {!loading && !data.notifications.length && (
            <div className={styles.empty}>
              <p className={styles.emptyMsg}>You're all caught up ✓</p>
              <p className={styles.emptySub}>I'll let you know when something needs attention.</p>
            </div>
          )}

          <div className={styles.list}>
            {data.notifications.map((n, i) => (
              <div
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                style={{ '--accent': TYPE_COLOR[n.type] || 'var(--calm)', animationDelay: `${i * 40}ms` }}
              >
                <div className={styles.itemTop}>
                  <span className={styles.itemIcon}>{n.icon}</span>
                  <span className={styles.itemTitle}>{n.title}</span>
                  <button className={styles.dismissBtn} onClick={() => dismiss(n.id)} aria-label="Dismiss">×</button>
                </div>
                <p className={styles.itemBody}>{n.body}</p>
                <span className={styles.itemTime}>{relativeTime(n.created_at)}</span>
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
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
