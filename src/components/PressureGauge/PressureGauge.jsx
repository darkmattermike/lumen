import styles from './PressureGauge.module.css'

/**
 * PressureGauge
 * @param {string} label — status word e.g. 'SAFE'
 * @param {string} sub — subtitle e.g. 'Good until May 24'
 * @param {number} dashOffset — SVG stroke-dashoffset (0 = full, 201 = empty). Default 70 = SAFE zone
 */
export default function PressureGauge({ label = 'SAFE', sub = '', dashOffset = 70 }) {
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
          stroke="rgba(93,202,165,0.1)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M16,85 A64,64 0 0,1 144,85"
          fill="none"
          stroke="url(#gg)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="201"
          strokeDashoffset={dashOffset}
        />
        {/* Needle */}
        <line x1="80" y1="85" x2="121" y2="38" stroke="var(--safe)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="80" cy="85" r="6" fill="var(--bg-3)" />
        <circle cx="80" cy="85" r="4" fill="var(--safe)" />
        <text x="10" y="100" fill="var(--ink-3)" fontSize="9" fontFamily="Space Mono">TIGHT</text>
        <text x="112" y="100" fill="var(--ink-3)" fontSize="9" fontFamily="Space Mono">AHEAD</text>
      </svg>
      <div className={styles.reading}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
