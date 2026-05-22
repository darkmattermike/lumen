import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import LumenDot from '../LumenDot/LumenDot'
import styles from './NotificationBell.module.css'

const TYPE_COLOR = {
  alert:            'var(--debt)',
  warning:          'var(--warn)',
  insight:          'var(--calm)',
  win:              'var(--safe)',
  duplicate:        'var(--warn)',
  recurring_change: 'var(--calm)',
  anomaly:          'var(--debt)',
  pattern:          'var(--calm)',
  subscription:     'var(--calm)',
  double_billing:   'var(--debt)',
}

// How many SMS-style "message bubbles" a notification type renders as
// opener → fact → question
function buildMessages(notif) {
  const color = TYPE_COLOR[notif.type] || 'var(--calm)'
  const isAlert   = notif.type === 'alert'   || notif.type === 'anomaly'
  const isDup     = notif.type === 'duplicate' || notif.type === 'double_billing'
  const isWin     = notif.type === 'win'
  const isWarning = notif.type === 'warning'

  // Opener bubble — short hook
  const opener = isWin
    ? 'Hey — good news.'
    : isDup
    ? 'Hey — I noticed something.'
    : isAlert
    ? 'Heads up.'
    : isWarning
    ? 'Something to watch.'
    : 'I found something.'

  // Fact bubble — the actual notification body
  const fact = notif.body

  // CTA bubble — question + reply buttons
  const cta = isDup
    ? { text: 'Should I flag it?', yes: 'Yes, flag it', no: 'Not a dup', isDanger: false }
    : isWin
    ? { text: null, yes: 'Got it ✓', no: 'Dismiss', isDanger: false }
    : isAlert
    ? { text: null, yes: 'Show me', no: 'Dismiss', isDanger: false }
    : { text: null, yes: 'Got it', no: 'Dismiss', isDanger: false }

  return { opener, fact, cta, color }
}

function relativeTime(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── SMS-style 3-bubble notification ──────────────────────────
function SmsNotif({ notif, onGotIt, onDismiss, animDelay = 0 }) {
  const { opener, fact, cta, color } = buildMessages(notif)
  const isDup = notif.type === 'duplicate' || notif.type === 'double_billing'
  const isDebt = color === 'var(--debt)'
  const isWin  = notif.type === 'win'

  return (
    <div className={styles.smsNotif} style={{ '--anim-delay': `${animDelay}ms` }}>

      {/* Bubble 1 — opener */}
      <div className={`${styles.smsBubble} ${styles.smsBubbleBase}`}
           style={{ animationDelay: `${animDelay}ms` }}>
        <span className={styles.smsText}>{opener}</span>
        <div className={styles.smsMeta}>
          <span className={styles.smsTime}>{relativeTime(notif.created_at)}</span>
          <span className={styles.smsRead}>✓✓</span>
        </div>
      </div>

      {/* Bubble 2 — fact, accent colored */}
      <div className={`${styles.smsBubble} ${styles.smsBubbleFact} ${isDebt ? styles.smsBubbleDebt : isWin ? styles.smsBubbleWin : styles.smsBubbleNeutral}`}
           style={{ animationDelay: `${animDelay + 60}ms` }}>
        <span className={styles.smsText}>{fact}</span>
      </div>

      {/* Bubble 3 — CTA */}
      <div className={`${styles.smsBubble} ${styles.smsBubbleCta}`}
           style={{ animationDelay: `${animDelay + 120}ms` }}>
        {cta.text && <span className={styles.smsTextCta}>{cta.text}</span>}
        <div className={styles.smsReplies}>
          <button
            className={`${styles.smsReply} ${isDup ? styles.smsReplyDanger : styles.smsReplyPrimary}`}
            onClick={() => isDup ? onDismiss(notif.id, true) : onGotIt(notif.id)}
          >
            {cta.yes}
          </button>
          <button
            className={`${styles.smsReply} ${styles.smsReplyNeutral}`}
            onClick={() => isDup ? onGotIt(notif.id) : onDismiss(notif.id)}
          >
            {cta.no}
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Empty state — single calm SMS bubble ─────────────────────
function EmptyBubble({ onClose }) {
  return (
    <div className={styles.smsNotif}>
      <div className={`${styles.smsBubble} ${styles.smsBubbleBase}`}>
        <span className={styles.smsText}>You're all caught up.</span>
        <div className={styles.smsMeta}>
          <span className={styles.smsTime}>just now</span>
          <span className={styles.smsRead}>✓✓</span>
        </div>
      </div>
      <div className={`${styles.smsBubble} ${styles.smsBubbleWin}`}
           style={{ animationDelay: '60ms' }}>
        <span className={styles.smsText}>I'll let you know when something needs attention.</span>
      </div>
      <div className={`${styles.smsBubble} ${styles.smsBubbleCta}`}
           style={{ animationDelay: '120ms' }}>
        <div className={styles.smsReplies}>
          <button className={`${styles.smsReply} ${styles.smsReplyPrimary}`} onClick={onClose}>
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell({ mobileDrawer = false }) {
  const [data, setData]       = useState({ notifications: [], unread_count: 0 })
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef               = useRef(null)
  const triggerRef            = useRef(null)

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

  // Close on outside click
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

  async function handleGotIt(id, confirmDup = false) {
    try {
      if (confirmDup) await api.confirmDuplicate(id).catch(() => {})
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id)
      }))
    } catch {}
  }

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

  // ── Mobile drawer ──────────────────────────────────────────
  if (mobileDrawer) {
    return (
      <div className={styles.drawerWrap} ref={wrapRef}>
        <button className={styles.drawerTrigger} onClick={handleOpen}>
          <LumenDot size={18} rings={open} mood={open ? 'excited' : data.unread_count > 0 ? 'unread' : 'idle'} unread={data.unread_count} />
          <span className={styles.drawerTriggerLabel}>
            Lumen
            {data.unread_count > 0 && <span className={styles.drawerBadge}>{data.unread_count}</span>}
          </span>
          <span className={styles.drawerChevron} style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
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
                <EmptyBubble onClose={() => setOpen(false)} />
              ) : (
                notifs.map((n, i) => (
                  <SmsNotif
                    key={n.id} notif={n} animDelay={i * 40}
                    onGotIt={handleGotIt} onDismiss={handleDismiss}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Desktop rail ───────────────────────────────────────────
  // Stack is position:fixed so it always appears to the right of the rail
  // regardless of where in the rail the trigger sits
  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
        aria-label="Lumen notifications"
      >
        <LumenDot
          size={22}
          rings={open}
          mood={open ? 'excited' : data.unread_count > 0 ? 'unread' : 'idle'}
          unread={data.unread_count}
        />
      </button>

      {open && (
        <div className={styles.stack}>
          {/* Header row */}
          <div className={styles.stackHeader}>
            <div className={styles.stackHeaderOrb}><LumenDot size={16} mood="idle" /></div>
            <span className={styles.stackHeaderName}>Lumen</span>
            {notifs.length > 1 && (
              <button className={styles.clearAllBtn} onClick={clearAll}>Clear all</button>
            )}
          </div>

          {/* Bubbles */}
          <div className={styles.stackScroll}>
            {!notifs.length ? (
              <EmptyBubble onClose={() => setOpen(false)} />
            ) : (
              notifs.map((n, i) => (
                <SmsNotif
                  key={n.id} notif={n} animDelay={i * 50}
                  onGotIt={handleGotIt} onDismiss={handleDismiss}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
