import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import LumenDot from '../LumenDot/LumenDot'
import styles from './NotificationBell.module.css'

/**
 * NotificationBell
 * Desktop: orb trigger in the rail, panel expands to the right as a chat bubble.
 * Mobile (mobileDrawer prop): orb + label row inside the More drawer;
 *   tapping expands an inline panel below rather than a floating bubble.
 */
export default function NotificationBell({ mobileDrawer = false }) {
  const [data, setData]       = useState({ notifications: [], unread_count: 0 })
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef               = useRef(null)

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

  // Desktop: close panel on outside click
  useEffect(() => {
    if (!open || mobileDrawer) return
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, mobileDrawer])

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

  async function confirmDuplicate(notifId) {
    try {
      await api.confirmDuplicate(notifId)
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notifId)
      }))
    } catch { /* silent */ }
  }

  async function dismissDuplicate(notifId) {
    try {
      await api.dismissDuplicate(notifId)
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notifId)
      }))
    } catch { /* silent */ }
  }

  const TYPE_COLOR = {
    alert:             'var(--debt)',
    warning:           'var(--warn)',
    insight:           'var(--calm)',
    win:               'var(--safe)',
    duplicate:         'var(--warn)',
    recurring_change:  'var(--calm)',
    // Phase E types
    anomaly:           'var(--debt)',
    pattern:           'var(--calm)',
    subscription:      'var(--calm)',
    double_billing:    'var(--debt)',
  }

  const list = (
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
          {n.type === 'duplicate' && (
            <div className={styles.itemActions}>
              <button className={styles.actionBtnDanger} onClick={() => confirmDuplicate(n.id)}>
                Yes, remove duplicate
              </button>
              <button className={styles.actionBtnNeutral} onClick={() => dismissDuplicate(n.id)}>
                Not a duplicate
              </button>
            </div>
          )}
          <span className={styles.itemTime}>{relativeTime(n.created_at)}</span>
        </div>
      ))}
    </div>
  )

  const emptyState = (
    <div className={styles.empty}>
      <p className={styles.emptyMsg}>You're all caught up ✓</p>
      <p className={styles.emptySub}>I'll let you know when something needs attention.</p>
    </div>
  )

  // ── Mobile drawer variant ──────────────────────────────────────────────────
  if (mobileDrawer) {
    return (
      <div className={styles.drawerWrap} ref={wrapRef}>
        <button className={styles.drawerTrigger} onClick={handleOpen}>
          <LumenDot
            size={18}
            rings={open}
            mood={open ? 'excited' : data.unread_count > 0 ? 'unread' : 'idle'}
            unread={data.unread_count}
          />
          <span className={styles.drawerTriggerLabel}>
            Lumen
            {data.unread_count > 0 && (
              <span className={styles.drawerBadge}>{data.unread_count}</span>
            )}
          </span>
          <span className={styles.drawerChevron} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {open && (
          <div className={styles.drawerPanel}>
            <div className={styles.drawerPanelHeader}>
              <span className={styles.drawerPanelLabel}>Notifications</span>
              {data.notifications.length > 0 && (
                <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>
              )}
            </div>
            {loading && !data.notifications.length
              ? <div className={styles.empty}><span className={styles.emptyDots}>···</span></div>
              : !data.notifications.length ? emptyState : list
            }
          </div>
        )}
      </div>
    )
  }

  // ── Desktop rail variant ──────────────────────────────────────────────────
  return (
    <div className={styles.wrap} ref={wrapRef}>
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

      {open && (
        <div className={styles.bubble}>
          <div className={styles.tail} />
          <div className={styles.bubbleHeader}>
            <div className={styles.lumenLabel}>
              <LumenDot size={14} mood="idle" />
              <span>Lumen</span>
            </div>
            {data.notifications.length > 0 && (
              <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>
            )}
          </div>
          {loading && !data.notifications.length
            ? <div className={styles.empty}><span className={styles.emptyDots}>···</span></div>
            : !data.notifications.length ? emptyState : list
          }
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
