import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import LumenDot from '../LumenDot/LumenDot'
import styles from './NotificationBell.module.css'

const TYPE_COLOR = {
  alert:'var(--debt)', warning:'var(--warn)', insight:'var(--calm)',
  win:'var(--safe)', duplicate:'var(--warn)', recurring_change:'var(--calm)',
  anomaly:'var(--debt)', pattern:'var(--calm)', subscription:'var(--calm)',
  double_billing:'var(--debt)',
}

function relativeTime(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Single speech bubble notification ────────────────────────
function NotifBubble({ notif, onGotIt, onDismiss, index, total }) {
  const color = TYPE_COLOR[notif.type] || 'var(--calm)'
  const offset = (total - 1 - index) * 8  // stack offset — newest on top

  return (
    <div
      className={styles.bubble}
      style={{
        '--accent': color,
        transform: `translateY(${-offset}px) scale(${1 - (total - 1 - index) * 0.02})`,
        zIndex: index + 1,
        opacity: index === total - 1 ? 1 : Math.max(0.5, 1 - (total - 1 - index) * 0.15),
      }}
    >
      {/* Tail */}
      <div className={styles.bubbleTail} />

      {/* Header */}
      <div className={styles.bubbleHeader}>
        <div className={styles.bubbleOrb}><LumenDot size={14} mood="idle" /></div>
        <span className={styles.bubbleLumen}>Lumen</span>
        <span className={styles.bubbleType} style={{ color }}>{notif.title}</span>
        <span className={styles.bubbleTime}>{relativeTime(notif.created_at)}</span>
      </div>

      {/* Body — Lumen voice */}
      <p className={styles.bubbleBody}>{notif.body}</p>

      {/* Duplicate actions */}
      {notif.type === 'duplicate' && (
        <div className={styles.bubbleActions}>
          <button className={styles.actionDanger} onClick={() => onDismiss(notif.id, true)}>Remove duplicate</button>
          <button className={styles.actionNeutral} onClick={() => onGotIt(notif.id)}>Not a duplicate</button>
        </div>
      )}

      {/* Got it / Dismiss */}
      {notif.type !== 'duplicate' && (
        <div className={styles.bubbleActions}>
          <button className={styles.gotItBtn} onClick={() => onGotIt(notif.id)}>
            Got it
          </button>
          <button className={styles.dismissBtn} onClick={() => onDismiss(notif.id)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

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
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

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
      await api.markAllNotificationsRead().catch(() => {})
      setData(prev => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }))
    }
  }

  // "Got it" — closes the bubble but keeps badge count as-is (already marked read)
  async function handleGotIt(id, confirmDup = false) {
    try {
      if (confirmDup) await api.confirmDuplicate(id).catch(() => {})
      // Just remove from visible stack, don't dismiss from DB
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id)
      }))
    } catch {}
  }

  // "Dismiss" — removes from stack AND marks dismissed in DB (clears badge)
  async function handleDismiss(id, isDup = false) {
    try {
      if (isDup) await api.dismissDuplicate(id).catch(() => {})
      else await api.dismissNotification(id).catch(() => {})
      setData(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
        notifications: prev.notifications.filter(n => n.id !== id)
      }))
    } catch {}
  }

  async function clearAll() {
    for (const n of data.notifications) {
      await api.dismissNotification(n.id).catch(() => {})
    }
    setData({ notifications: [], unread_count: 0 })
  }

  const notifs = data.notifications

  // ── Mobile drawer ─────────────────────────────────────────
  if (mobileDrawer) {
    return (
      <div className={styles.drawerWrap} ref={wrapRef}>
        <button className={styles.drawerTrigger} onClick={handleOpen}>
          <LumenDot size={18} rings={open} mood={open ? 'excited' : data.unread_count > 0 ? 'unread' : 'idle'} unread={data.unread_count} />
          <span className={styles.drawerTriggerLabel}>
            Lumen
            {data.unread_count > 0 && <span className={styles.drawerBadge}>{data.unread_count}</span>}
          </span>
          <span className={styles.drawerChevron} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </button>

        {open && (
          <div className={styles.drawerPanel}>
            <div className={styles.drawerPanelHeader}>
              <span className={styles.drawerPanelLabel}>Notifications</span>
              {notifs.length > 0 && <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>}
            </div>
            {!notifs.length ? (
              <div className={styles.empty}>
                <p className={styles.emptyMsg}>You're all caught up ✓</p>
                <p className={styles.emptySub}>I'll let you know when something needs attention.</p>
              </div>
            ) : (
              <div className={styles.drawerBubbles}>
                {notifs.map((n, i) => (
                  <NotifBubble
                    key={n.id} notif={n} index={i} total={notifs.length}
                    onGotIt={handleGotIt} onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Desktop rail ──────────────────────────────────────────
  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
        aria-label="Lumen notifications"
      >
        <LumenDot size={22} rings={open} />
        {data.unread_count > 0 && (
          <span className={styles.badge}>{data.unread_count > 9 ? '9+' : data.unread_count}</span>
        )}
      </button>

      {/* Speech bubble stack */}
      {open && (
        <div className={styles.stack}>
          {!notifs.length ? (
            <div className={styles.bubble} style={{ '--accent': 'var(--safe)', zIndex: 1 }}>
              <div className={styles.bubbleTail} />
              <div className={styles.bubbleHeader}>
                <div className={styles.bubbleOrb}><LumenDot size={14} mood="idle" /></div>
                <span className={styles.bubbleLumen}>Lumen</span>
              </div>
              <p className={styles.bubbleBody} style={{ color: 'var(--ink-2)' }}>
                You're all caught up. I'll let you know when something needs attention.
              </p>
              <div className={styles.bubbleActions}>
                <button className={styles.gotItBtn} onClick={() => setOpen(false)}>Got it</button>
              </div>
            </div>
          ) : (
            notifs.map((n, i) => (
              <NotifBubble
                key={n.id} notif={n} index={i} total={notifs.length}
                onGotIt={handleGotIt} onDismiss={handleDismiss}
              />
            ))
          )}
          {notifs.length > 1 && (
            <button className={styles.clearAllBtn} onClick={clearAll}>Dismiss all</button>
          )}
        </div>
      )}
    </div>
  )
}
