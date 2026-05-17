import styles from './LumenDot.module.css'

/**
 * LumenDot
 * @param {number} size — pixel diameter (default 44)
 * @param {boolean} rings — show expanding rings
 * @param {string} speed — animation duration override e.g. '3.5s'
 */
export default function LumenDot({ size = 44, rings = false, speed }) {
  const dotStyle = {
    width: size,
    height: size,
    animationDuration: speed || undefined,
  }

  if (!rings) {
    return <span className="dot" style={dotStyle} />
  }

  return (
    <div className={styles.ringWrap} style={{ width: size + 16, height: size + 16 }}>
      <span className={styles.ring} style={{ width: size + 16, height: size + 16 }} />
      <span className={styles.ring} style={{ width: size + 16, height: size + 16 }} />
      <span className={styles.ring} style={{ width: size + 16, height: size + 16 }} />
      <span className="dot" style={dotStyle} />
    </div>
  )
}
