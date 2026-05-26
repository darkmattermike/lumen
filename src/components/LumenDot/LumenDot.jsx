import { useState, useEffect, useRef } from 'react'
import styles from './LumenDot.module.css'

/**
 * LumenDot — the Lumen orb character.
 * Renders the photo-realistic orb image (/lumen_orb.png) with the
 * teal/mint CSS filter from the concept design:
 *   hue-rotate(-15deg) saturate(1.12) brightness(1.05)
 *
 * Props:
 *   size     {number}  — diameter in px (default 44)
 *   rings    {boolean} — expanding ring pulses (default false)
 *   speed    {string}  — animation duration override
 *   mood     {string}  — 'idle'|'thinking'|'speaking'|'excited'|'happy'|'alert'|'loading'|'unread'
 *   unread   {number}  — unread count → badge + wiggle
 *   onClick  {fn}      — tap handler
 *   tooltip  {string}  — hover quip
 *   spirit   {boolean} — spontaneous micro-animations (default true on larger sizes)
 */
export default function LumenDot({
  size     = 44,
  rings    = false,
  speed,
  mood     = 'idle',
  unread   = 0,
  onClick,
  tooltip,
  spirit,
}) {
  const enableSpirit = spirit !== undefined ? spirit : size >= 28
  const [particles,   setParticles]   = useState([])
  const [currentMood, setCurrentMood] = useState(mood)
  const [showTooltip, setShowTooltip] = useState(false)
  const [hovered,     setHovered]     = useState(false)
  const [spiritAnim,  setSpiritAnim]  = useState(null)
  const prevUnread   = useRef(unread)
  const prevMood     = useRef(mood)
  const tooltipTimer = useRef(null)
  const spiritTimer  = useRef(null)

  useEffect(() => {
    if (mood !== prevMood.current) prevMood.current = mood
    setCurrentMood(mood)
  }, [mood])

  useEffect(() => {
    if (unread > prevUnread.current && unread > 0) burstParticles(7)
    prevUnread.current = unread
  }, [unread])

  useEffect(() => {
    if (unread > 0 && mood === 'idle') setCurrentMood('unread')
    else if (unread === 0 && currentMood === 'unread') setCurrentMood('idle')
  }, [unread, mood])

  useEffect(() => {
    if (!enableSpirit || currentMood !== 'idle') return
    function scheduleSpirit() {
      const delay = 6000 + Math.random() * 10000
      spiritTimer.current = setTimeout(() => {
        const anims = ['spirit-curiosity', 'spirit-nudge', 'spirit-shimmy', 'spirit-peek']
        const pick  = anims[Math.floor(Math.random() * anims.length)]
        setSpiritAnim(pick)
        setTimeout(() => { setSpiritAnim(null); scheduleSpirit() }, 800)
      }, delay)
    }
    scheduleSpirit()
    return () => clearTimeout(spiritTimer.current)
  }, [currentMood, enableSpirit])

  function burstParticles(count = 8) {
    const ps = Array.from({ length: count }, (_, i) => ({
      id:    Date.now() + i,
      angle: (360 / count) * i + Math.random() * 28 - 14,
      dist:  size * 0.65 + Math.random() * size * 0.45,
      scale: 0.25 + Math.random() * 0.55,
      dur:   380 + Math.random() * 320,
      hue:   Math.random() > 0.7 ? 40 : 0,
    }))
    setParticles(p => [...p, ...ps])
    setTimeout(() => setParticles(p => p.filter(x => !ps.find(n => n.id === x.id))), 900)
  }

  function handleClick(e) {
    if (!onClick) return
    setCurrentMood('excited')
    burstParticles(12)
    setTimeout(() => setCurrentMood(unread > 0 ? 'unread' : mood), 700)
    onClick(e)
  }

  function handleMouseEnter() {
    setHovered(true)
    if (tooltip) tooltipTimer.current = setTimeout(() => setShowTooltip(true), 500)
    if (currentMood === 'idle' && enableSpirit) {
      setSpiritAnim('spirit-hover')
      setTimeout(() => setSpiritAnim(null), 300)
    }
  }

  function handleMouseLeave() {
    setHovered(false)
    clearTimeout(tooltipTimer.current)
    setShowTooltip(false)
  }

  const moodClass = {
    idle:     '',
    thinking: styles.dotThinking,
    speaking: styles.dotSpeaking,
    excited:  styles.dotExcited,
    happy:    styles.dotHappy,
    alert:    styles.dotAlert,
    unread:   styles.dotUnread,
    loading:  styles.dotLoading,
  }[currentMood] || ''

  const spiritClass = spiritAnim ? styles[spiritAnim] : ''
  const hovClass    = hovered && !spiritAnim ? styles.orbHovered : ''

  const glowColor = {
    alert:   '0 0 0 1px rgba(255,128,111,.3), 0 0 18px rgba(255,128,111,.55), 0 0 40px rgba(255,128,111,.2)',
    excited: '0 0 0 1px rgba(93,202,165,.4), 0 0 22px rgba(93,202,165,.8), 0 0 55px rgba(93,202,165,.35)',
    happy:   '0 0 0 1px rgba(93,202,165,.3), 0 0 18px rgba(93,202,165,.65), 0 0 45px rgba(93,202,165,.25)',
  }[currentMood] || '0 0 0 1px rgba(93,202,165,.18), 0 0 14px rgba(93,202,165,.50), 0 0 36px rgba(93,202,165,.18), 0 0 70px rgba(93,202,165,.07)'

  const orbEl = (
    <span
      className={`${styles.orb} ${moodClass} ${spiritClass} ${hovClass} ${styles.orbEnter}`}
      style={{
        width:             size,
        height:            size,
        cursor:            onClick ? 'pointer' : 'default',
        animationDuration: speed || undefined,
        boxShadow:         glowColor,
      }}
      onClick={onClick ? handleClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Orb image — the concept design photo-realistic sphere with Lumen's mint teal filter */}
      <img
        src="/lumen_orb.png"
        alt=""
        aria-hidden="true"
        className={styles.orbImg}
        draggable={false}
      />

      {particles.map(p => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            '--angle': `${p.angle}deg`,
            '--dist':  `${p.dist}px`,
            '--scale': p.scale,
            '--dur':   `${p.dur}ms`,
            '--hue':   `${p.hue}deg`,
            width:  Math.max(2, size * 0.11),
            height: Math.max(2, size * 0.11),
          }}
        />
      ))}

      {unread > 0 && size >= 14 && (
        <span className={styles.badge} style={{ fontSize: Math.max(7, size * 0.22) }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  )

  const tooltipEl = showTooltip && tooltip
    ? <span className={styles.tooltip}>{tooltip}</span>
    : null

  if (!rings) {
    return (
      <span className={styles.wrap} style={{ width: size, height: size, position: 'relative' }}>
        {orbEl}
        {tooltipEl}
      </span>
    )
  }

  return (
    <div className={styles.ringWrap} style={{ width: size + 24, height: size + 24 }}>
      {[0, 0.65, 1.3, 2.0].map((delay, i) => (
        <span
          key={i}
          className={styles.ring}
          style={{ '--orb-size': `${size}px`, animationDelay: `${delay}s` }}
        />
      ))}
      {orbEl}
      {tooltipEl}
    </div>
  )
}
