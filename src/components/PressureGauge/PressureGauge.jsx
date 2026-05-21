import { useEffect, useRef, useState } from 'react'
import styles from './PressureGauge.module.css'

/**
 * PressureGauge
 * @param {string} label — status word e.g. 'SAFE'
 * @param {string} sub — subtitle
 * @param {number} score — 0–100 pressure score (0 = no pressure = SAFE, 100 = CRITICAL)
 */
export default function PressureGauge({ label = 'SAFE', sub = '', score = 0 }) {
  const clampedScore = Math.min(100, Math.max(0, score))
  const targetOffset = Math.round((clampedScore / 100) * 201)

  // Animate dashoffset from 201 (empty) → targetOffset on mount, then transition on change
  const [displayOffset, setDisplayOffset] = useState(201)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      // First render: start empty, then animate to target after a frame
      mounted.current = true
      const id = requestAnimationFrame(() => {
        setTimeout(() => setDisplayOffset(targetOffset), 60)
      })
      return () => cancelAnimationFrame(id)
    }
    // Subsequent updates (score prop changes): just transition
    setDisplayOffset(targetOffset)
  }, [targetOffset])

  // Needle angle: score 0 = ~-10° (right/safe), score 100 = ~-170° (left/critical)
  const angleDeg  = -10 - (clampedScore / 100) * 160
  const angleRad  = (angleDeg * Math.PI) / 180
  const needleLen = 48
  const nx2 = 80 + needleLen * Math.cos(angleRad)
  const ny2 = 85 + needleLen * Math.sin(angleRad)

  const labelColor =
    label === 'SAFE'     ? 'var(--safe)' :
    label === 'WATCH'    ? 'var(--warn)' :
    label === 'TIGHT'    ? 'var(--warn)' : 'var(--debt)'

  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeLabel}>Pressure Gauge</div>
      <svg viewBox="0 0 160 100" className={styles.svg}>
        <defs>
          <linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#e87363" />
            <stop offset="38%"  stopColor="#f0b04c" />
            <stop offset="75%"  stopColor="#5dcaa5" />
            <stop offset="100%" stopColor="#0f6e56" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d="M16,85 A64,64 0 0,1 144,85"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Fill arc — animates from empty on mount, transitions on score change */}
        <path
          className={styles.gaugeFill}
          d="M16,85 A64,64 0 0,1 144,85"
          fill="none"
          stroke="url(#gg)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="201"
          strokeDashoffset={displayOffset}
        />

        {/* Needle — rotates smoothly */}
        <line
          className={styles.needle}
          x1="80" y1="85"
          x2={nx2.toFixed(1)} y2={ny2.toFixed(1)}
          stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9"
        />
        <circle cx="80" cy="85" r="5" fill="var(--bg-3)" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        <circle cx="80" cy="85" r="3" fill="white" opacity="0.8" />
        <text x="10"  y="100" fill="var(--ink-3)" fontSize="9" fontFamily="Space Mono">CRITICAL</text>
        <text x="116" y="100" fill="var(--ink-3)" fontSize="9" fontFamily="Space Mono">SAFE</text>
      </svg>
      <div className={styles.reading} style={{ color: labelColor }}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
