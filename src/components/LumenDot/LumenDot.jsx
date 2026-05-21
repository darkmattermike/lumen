import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './LumenDot.module.css'

/**
 * LumenDot — the Lumen orb. A living financial spirit.
 *
 * Props:
 *   size     {number}  — diameter in px (default 44)
 *   rings    {boolean} — expanding ring pulses (default false)
 *   speed    {string}  — animation duration override
 *   mood     {string}  — 'idle' | 'thinking' | 'speaking' | 'excited' | 'happy' | 'alert' | 'loading' | 'unread'
 *   unread   {number}  — unread count → badge + wiggle
 *   onClick  {fn}      — tap handler
 *   tooltip  {string}  — hover quip
 *   spirit   {boolean} — if true, orb occasionally does spontaneous micro-animations (default true on larger sizes)
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
  const [spiritAnim,  setSpiritAnim]  = useState(null) // spontaneous micro-anim class
  const prevUnread  = useRef(unread)
  const prevMood    = useRef(mood)
  const tooltipTimer = useRef(null)
  const spiritTimer  = useRef(null)

  // Sync mood prop — animate transition
  useEffect(() => {
    if (mood !== prevMood.current) {
      prevMood.current = mood
    }
    setCurrentMood(mood)
  }, [mood])

  // Particle burst when unread count increases
  useEffect(() => {
    if (unread > prevUnread.current && unread > 0) {
      burstParticles(7)
    }
    prevUnread.current = unread
  }, [unread])

  // Unread wiggle
  useEffect(() => {
    if (unread > 0 && mood === 'idle') setCurrentMood('unread')
    else if (unread === 0 && currentMood === 'unread') setCurrentMood('idle')
  }, [unread, mood])

  // Spirit mode — occasional spontaneous expressions when idle
  useEffect(() => {
    if (!enableSpirit || currentMood !== 'idle') return
    function scheduleSpirit() {
      const delay = 6000 + Math.random() * 10000 // 6-16s between moments
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
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id:    Date.now() + i,
      angle: (360 / count) * i + Math.random() * 28 - 14,
      dist:  size * 0.65 + Math.random() * size * 0.45,
      scale: 0.25 + Math.random() * 0.55,
      dur:   380 + Math.random() * 320,
      hue:   Math.random() > 0.7 ? 40 : 0, // some particles shift hue slightly
    }))
    setParticles(p => [...p, ...newParticles])
    setTimeout(() => {
      setParticles(p => p.filter(x => !newParticles.find(n => n.id === x.id)))
    }, 900)
  }

  function handleClick(e) {
    if (!onClick) return
    setCurrentMood('excited')
    burstParticles(12)
    setTimeout(() => {
      setCurrentMood(unread > 0 ? 'unread' : mood)
    }, 700)
    onClick(e)
  }

  function handleMouseEnter() {
    setHovered(true)
    if (tooltip) {
      tooltipTimer.current = setTimeout(() => setShowTooltip(true), 500)
    }
    // Tiny curiosity bump on hover
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

  const spiritClass = spiritAnim ? styles[spiritAnim] : ''
  const hovClass    = hovered && !spiritAnim ? styles.orbHovered : ''

  const dot = (
    <span
      className={`dot ${moodClass} ${styles.orb} ${spiritClass} ${hovClass} ${styles.orbEnter}`}
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

      {/* Unread badge */}
      {unread > 0 && size >= 14 && (
        <span className={styles.badge} style={{ fontSize: Math.max(7, size * 0.22) }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  )

  const tooltipEl = showTooltip && tooltip ? (
    <span className={styles.tooltip}>{tooltip}</span>
  ) : null

  if (!rings) {
    return (
      <span className={styles.wrap} style={{ width: size, height: size, position: 'relative' }}>
        {dot}
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
          style={{
            width:          size + 24,
            height:         size + 24,
            animationDelay: `${delay}s`,
            opacity:        0.9 - i * 0.18,
          }}
        />
      ))}
      {dot}
      {tooltipEl}
    </div>
  )
}
