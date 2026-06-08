/**
 * AnimatedBar
 * Progress bar that:
 *   - Animates from 0% → pct on mount (with spring overshoot)
 *   - Pulses gently when pct > 80% (warning pace)
 *   - Flashes red when pct > 100% (over budget)
 *   - Re-animates when pct changes
 */
import { useEffect, useRef, useState } from 'react'
import styles from './AnimatedBar.module.css'

export default function AnimatedBar({
  pct,               // 0-100+ (can exceed 100 for over-budget)
  color  = 'var(--safe)',
  height = 3,
  delay  = 0,        // stagger delay in ms
  className,
}) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef   = useRef(null)
  const startRef = useRef(null)
  const prevPct  = useRef(0)

  useEffect(() => {
    const from    = prevPct.current
    const to      = Math.min(pct, 100)
    prevPct.current = to

    cancelAnimationFrame(rafRef.current)

    const delayTimeout = setTimeout(() => {
      startRef.current = null

      function tick(ts) {
        if (!startRef.current) startRef.current = ts
        const elapsed  = ts - startRef.current
        const duration = 700
        const progress = Math.min(elapsed / duration, 1)
        // Spring-like: overshoot slightly then settle
        const eased = progress < 0.7
          ? easeOutCubic(progress / 0.7) * 1.04
          : 1 + (1.04 - 1) * easeOutCubic(1 - (progress - 0.7) / 0.3)
        const val = from + (to - from) * Math.min(eased, 1)
        setDisplayed(Math.max(0, val))
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setDisplayed(to)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(delayTimeout)
      cancelAnimationFrame(rafRef.current)
    }
  }, [pct, delay])

  const isOver    = pct > 100
  const isWarning = pct > 80 && !isOver
  const fillColor = isOver ? 'var(--debt)' : color

  return (
    <div
      className={`${styles.track} ${className || ''}`}
      style={{ height }}
    >
      <div
        className={`${styles.fill} ${isWarning ? styles.pulse : ''} ${isOver ? styles.flash : ''}`}
        style={{
          width:      `${displayed}%`,
          background: fillColor,
          height,
        }}
      />
    </div>
  )
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
