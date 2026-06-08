import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import LumenDot from '../LumenDot/LumenDot'
import styles from './NotificationBell.module.css'

// ── Type metadata ─────────────────────────────────────────────
const TYPE_META = {
  alert:            { color: 'var(--debt)', bg: 'rgba(232,115,99,.1)',  border: 'rgba(232,115,99,.22)',  emoji: '🚨', label: 'Alert'     },
  anomaly:          { color: 'var(--debt)', bg: 'rgba(232,115,99,.1)',  border: 'rgba(232,115,99,.22)',  emoji: '🚨', label: 'Anomaly'   },
  duplicate:        { color: 'var(--debt)', bg: 'rgba(232,115,99,.1)',  border: 'rgba(232,115,99,.22)',  emoji: '🚨', label: 'Duplicate' },
  double_billing:   { color: 'var(--debt)', bg: 'rgba(232,115,99,.1)',  border: 'rgba(232,115,99,.22)',  emoji: '🚨', label: 'Duplicate' },
  warning:          { color: 'var(--warn)', bg: 'rgba(240,176,76,.1)',  border: 'rgba(240,176,76,.22)',  emoji: '⚠️', label: 'Warning'   },
  subscription:     { color: 'var(--warn)', bg: 'rgba(240,176,76,.1)',  border: 'rgba(240,176,76,.22)',  emoji: '📋', label: 'Sub'       },
  recurring_change: { color: 'var(--warn)', bg: 'rgba(240,176,76,.1)',  border: 'rgba(240,176,76,.22)',  emoji: '🔄', label: 'Change'    },
  win:              { color: 'var(--safe)', bg: 'rgba(93,202,165,.1)',  border: 'rgba(93,202,165,.22)',  emoji: '🎉', label: 'Win'       },
  insight:          { color: 'var(--calm)', bg: 'rgba(108,140,255,.1)', border: 'rgba(108,140,255,.22)', emoji: '💡', label: 'Insight'   },
  pattern:          { color: 'var(--calm)', bg: 'rgba(108,140,255,.1)', border: 'rgba(108,140,255,.22)', emoji: '📊', label: 'Pattern'   },
}
const getMeta = (type) =>
  TYPE_META[type] || { color: 'var(--calm)', bg: 'rgba(108,140,255,.1)', border: 'rgba(108,140,255,.22)', emoji: '◈', label: 'Notice' }

function relativeTime(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Single thought cloud ──────────────────────────────────────
function NotifCloud({ notif, onGotIt, onDismiss, animDelay = 0 }) {
  const meta  = getMeta(notif.type)
  const isDup = notif.type === 'duplicate' || notif.type === 'double_billing'

  return (
    <div
      className={styles.cloud}
      style={{
        '--accent':        meta.color,
        '--accent-bg':     meta.bg,
        '--accent-border': meta.border,
        animationDelay:    `${animDelay}ms`,
      }}
    >
      <div className={styles.cloudBadge}>
        <span className={styles.cloudBadgeEmoji}>{meta.emoji}</span>
        <span className={styles.cloudBadgeLabel} style={{ color: meta.color }}>{meta.label}</span>
        <span className={styles.cloudBadgeTime}>{relativeTime(notif.created_at)}</span>
      </div>

      <p className={styles.cloudMsg}>{notif.body}</p>

      <div className={styles.cloudActions}>
        {isDup ? (
          <>
            <button className={`${styles.cloudBtn} ${styles.cloudBtnPrimary}`} onClick={() => onDismiss(notif.id, true)}>Yes, flag it</button>
            <button className={`${styles.cloudBtn} ${styles.cloudBtnGhost}`}   onClick={() => onGotIt(notif.id)}>Not a dup</button>
          </>
        ) : (
          <>
            <button className={`${styles.cloudBtn} ${styles.cloudBtnPrimary}`} onClick={() => onGotIt(notif.id)}>Got it</button>
            <button className={`${styles.cloudBtn} ${styles.cloudBtnGhost}`}   onClick={() => onDismiss(notif.id)}>Dismiss</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Empty cloud ───────────────────────────────────────────────
function EmptyCloud({ onClose }) {
  return (
    <div className={`${styles.cloud} ${styles.cloudEmpty}`}>
      <div className={styles.cloudEmptyHeader}>
        <LumenDot size={16} mood="idle" />
        <span className={styles.cloudEmptyLumen}>Lumen</span>
      </div>
      <p className={styles.cloudMsg}>
        You're all caught up. I'll float back when something needs attention.
      </p>
      <div className={styles.cloudActions}>
        <button className={`${styles.cloudBtn} ${styles.cloudBtnGhost}`} onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

// ── Trail dots (3 rising bubbles from orb to cloud) ───────────
function Trail() {
  return (
    <div className={styles.trail}>
      <div className={styles.trailDot} />
      <div className={styles.trailDot} />
      <div className={styles.trailDot} />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function NotificationBell({ mobileDrawer = false, startOpen = false }) {
  const [data, setData]         = useState({ notifications: [], unread_count: 0 })
  const [open, setOpen]         = useState(startOpen)
  const [cloudPos, setCloudPos] = useState(null)
  const wrapRef                 = useRef(null)
  const triggerRef              = useRef(null)

  // Anchor to orb: dots sit at orb Y, cloud grows upward above them
  const cloudRef = useRef(null)

  useEffect(() => {
    if (!open || !triggerRef.current) { setCloudPos(null); return }
    const rect = triggerRef.current.getBoundingClientRect()
    // Read --rail-w from CSS variables (set to 48px on desktop)
    const railW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--rail-w')) || 48
    setCloudPos({
      orbCenterY: rect.top + rect.height / 2,
      left:       railW + 14,
    })
  }, [open])

  useEffect(() => {
    async function load() {
      try { const d = await api.notifications(); setData(d) } catch {}
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  // Close on outside click — desktop only
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
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
      }))
    }
  }

  async function handleGotIt(id) {
    await api.dismissNotification(id).catch(() => {})
    setData(prev => ({
      ...prev,
      unread_count: Math.max(0, prev.unread_count - 1),
      notifications: prev.notifications.filter(n => n.id !== id),
    }))
  }

  async function handleDismiss(id, isDup = false) {
    try {
      if (isDup) await api.dismissDuplicate(id).catch(() => {})
      else       await api.dismissNotification(id).catch(() => {})
      setData(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
        notifications: prev.notifications.filter(n => n.id !== id),
      }))
    } catch {}
  }

  async function clearAll() {
    for (const n of data.notifications) await api.dismissNotification(n.id).catch(() => {})
    setData({ notifications: [], unread_count: 0 })
    setOpen(false)
  }

  const notifs    = data.notifications
  const hasUnread = data.unread_count > 0

  // ── Mobile: startOpen = rendered inside MobileOrbPanel ───
  // Just render the clouds directly; Rail provides positioning
  if (mobileDrawer && startOpen) {
    return (
      <div className={styles.mobileCloudWrap}>
        {/* Cloud on top */}
        {!notifs.length ? (
          <EmptyCloud onClose={() => {}} />
        ) : (
          <>
            {notifs.map((n, i) => (
              <NotifCloud key={n.id} notif={n} animDelay={i * 60} onGotIt={handleGotIt} onDismiss={handleDismiss} />
            ))}
            {notifs.length > 1 && (
              <button className={styles.clearAllBtn} onClick={clearAll}>Dismiss all</button>
            )}
          </>
        )}
        {/* Trail dots below cloud, right-aligned pointing toward orb */}
        <Trail />
      </div>
    )
  }

  // ── Mobile: drawer in More menu ───────────────────────────
  if (mobileDrawer) {
    return (
      <div className={styles.drawerWrap} ref={wrapRef}>
        <button className={styles.drawerTrigger} onClick={handleOpen}>
          <LumenDot size={18} rings={open} mood={open ? 'excited' : hasUnread ? 'unread' : 'idle'} />
          <span className={styles.drawerTriggerLabel}>
            Lumen
            {hasUnread && <span className={styles.drawerBadge}>{data.unread_count}</span>}
          </span>
          <span className={styles.drawerChevron} style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </button>

        {open && (
          <div className={styles.drawerPanel}>
            <div className={styles.drawerPanelHeader}>
              <span className={styles.drawerPanelLabel}>Notifications</span>
              {notifs.length > 0 && <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>}
            </div>
            <div className={styles.drawerScroll}>
              {!notifs.length ? (
                <EmptyCloud onClose={() => setOpen(false)} />
              ) : (
                notifs.map((n, i) => (
                  <NotifCloud key={n.id} notif={n} animDelay={i * 50} onGotIt={handleGotIt} onDismiss={handleDismiss} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Desktop: pixel notification panel ──────
  return (
    <div className={styles.wrap} ref={wrapRef}>

      <button
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" shapeRendering="crispEdges" style={{ color: (hasUnread || open) ? 'var(--safe)' : 'var(--ink-2)' }} aria-hidden="true">
          <path d="M5 3h6v1h1v4h1v2h1v1H2v-1h1V8h1V4h1V3z" />
          <path d="M6 12h4v1H6z" />
        </svg>
        {hasUnread && !open && (
          <span className={styles.badge}>{data.unread_count > 9 ? '9+' : data.unread_count}</span>
        )}
      </button>

      {open && (
        <div className={styles.notifPanel}>
          <div className={styles.notifHead}>
            <span>Notifications</span>
            {notifs.length > 0 && <button className={styles.notifClear} onClick={clearAll}>Clear all</button>}
          </div>
          <div className={styles.notifScroll}>
            {!notifs.length ? (
              <div className={styles.notifEmpty}>No notifications.</div>
            ) : (
              notifs.map(n => {
                const meta = getMeta(n.type)
                return (
                  <div key={n.id} className={styles.notifItem}>
                    <span className={styles.notifDot} style={{ background: meta.color }} />
                    <div className={styles.notifBody}>
                      <div className={styles.notifTop}>
                        <span className={styles.notifLabel} style={{ color: meta.color }}>{meta.label}</span>
                        <span className={styles.notifTime}>{relativeTime(n.created_at)}</span>
                      </div>
                      <div className={styles.notifMsg}>{n.body}</div>
                    </div>
                    <button className={styles.notifX} onClick={() => handleDismiss(n.id)} aria-label="Dismiss">✕</button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
