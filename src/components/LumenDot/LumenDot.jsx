import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './LumenDot.module.css'

/**
 * LumenDot — the Lumen orb. Alive, reactive, opinionated about its own animations.
 *
 * Props:
 *   size     {number}  — diameter in px (default 44)
 *   rings    {boolean} — expanding ring pulses (default false)
 *   speed    {string}  — animation duration override e.g. '2.5s'
 *   mood     {string}  — 'idle' | 'thinking' | 'speaking' | 'excited' | 'happy' | 'alert' | 'loading'
 *   unread   {number}  — unread count, triggers wiggle + particle burst
 *   onClick  {fn}      — tap handler, triggers excited burst
 *   tooltip  {string}  — hover quip from Lumen
 */
export default function LumenDot({
  size     = 44,
  rings    = false,
  speed,
  mood     = 'idle',
  unread   = 0,
  onClick,
  tooltip,
}) {
  const [particles,    setParticles]    = useState([])
  const [currentMood,  setCurrentMood]  = useState(mood)
  const [showTooltip,  setShowTooltip]  = useState(false)
  const [tooltipText,  setTooltipText]  = useState(tooltip || '')
  const prevUnread = useRef(unread)
  const orbRef     = useRef(null)
  const tooltipTimer = useRef(null)

  // Sync mood prop
  useEffect(() => { setCurrentMood(mood) }, [mood])

  // Particle burst when unread count increases
  useEffect(() => {
    if (unread > prevUnread.current && unread > 0) {
      burstParticles(6)
      setCurrentMood('alert')
    }
    prevUnread.current = unread
  }, [unread])

  // Wiggle mood if there are unreads
  useEffect(() => {
    if (unread > 0 && mood === 'idle') setCurrentMood('unread')
    else if (unread === 0 && currentMood === 'unread') setCurrentMood('idle')
  }, [unread, mood])

  function burstParticles(count = 8) {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id:    Date.now() + i,
      angle: (360 / count) * i + Math.random() * 30 - 15,
      dist:  size * 0.6 + Math.random() * size * 0.4,
      scale: 0.3 + Math.random() * 0.5,
      dur:   400 + Math.random() * 300,
    }))
    setParticles(p => [...p, ...newParticles])
    setTimeout(() => {
      setParticles(p => p.filter(x => !newParticles.find(n => n.id === x.id)))
    }, 800)
  }

  function handleClick(e) {
    setCurrentMood('excited')
    burstParticles(10)
    setTimeout(() => setCurrentMood(mood === 'idle' && unread > 0 ? 'unread' : mood), 600)
    onClick?.(e)
  }

  function handleMouseEnter() {
    if (!tooltip && !tooltipText) return
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 600)
  }
  function handleMouseLeave() {
    clearTimeout(tooltipTimer.current)
    setShowTooltip(false)
  }

  const moodClass = {
    idle:     '',
    thinking: 'dot-thinking',
    speaking: 'dot-speaking',
    excited:  'dot-excited',
    happy:    'dot-happy',
    alert:    'dot-alert',
    unread:   'dot-unread',
    loading:  'dot-loading',
  }[currentMood] || ''

  const dotStyle = {
    width:  size,
    height: size,
    animationDuration: speed || undefined,
    cursor: onClick ? 'pointer' : 'default',
  }

  const dot = (
    <span
      ref={orbRef}
      className={`dot ${moodClass} ${styles.orb}`}
      style={dotStyle}
      onClick={onClick ? handleClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            '--angle':  `${p.angle}deg`,
            '--dist':   `${p.dist}px`,
            '--scale':  p.scale,
            '--dur':    `${p.dur}ms`,
            width:  Math.max(2, size * 0.1),
            height: Math.max(2, size * 0.1),
          }}
        />
      ))}

      {/* Unread badge */}
      {unread > 0 && size >= 16 && (
        <span className={styles.badge} style={{ fontSize: Math.max(7, size * 0.22) }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  )

  // Tooltip quip
  const tooltipEl = showTooltip && tooltipText ? (
    <span className={styles.tooltip}>{tooltipText}</span>
  ) : null

  if (!rings) {
    return (
      <span className={styles.wrap} style={{ width: size, height: size }}>
        {dot}
        {tooltipEl}
      </span>
    )
  }

  return (
    <div className={styles.ringWrap} style={{ width: size + 20, height: size + 20 }}>
      {/* Rings — more of them, staggered */}
      {[0, 0.7, 1.4, 2.1].map((delay, i) => (
        <span
          key={i}
          className={styles.ring}
          style={{
            width:          size + 20,
            height:         size + 20,
            animationDelay: `${delay}s`,
            opacity:        1 - i * 0.15,
          }}
        />
      ))}
      {dot}
      {tooltipEl}
    </div>
  )
}
