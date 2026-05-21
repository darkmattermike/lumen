import styles from './BillRow.module.css'

/**
 * BillRow
 * @param {string} name
 * @param {string} when  — e.g. 'May 17 · Today'
 * @param {string} amount — e.g. '$94' or '+$2,840'
 * @param {'debt'|'warn'|'safe'} variant
 * @param {boolean} highlight — green background (income row)
 */
export default function BillRow({ name, when, amount, variant = 'warn', highlight = false, style }) {
  const colorMap = {
    debt: 'var(--debt)',
    warn: 'var(--warn)',
    safe: 'var(--safe)',
  }
  const color = colorMap[variant] || colorMap.warn

  return (
    <div className={`${styles.row} ${highlight ? styles.highlight : ''}`} style={style}>
      <div className={styles.bar} style={{ background: color }} />
      <div className={styles.info}>
        <div className={styles.name} style={highlight ? { color: 'rgba(93,202,165,0.8)' } : {}}>
          {name}
        </div>
        <div className={styles.when} style={highlight ? { color: 'rgba(93,202,165,0.4)' } : {}}>
          {when}
        </div>
      </div>
      <div className={styles.amount} style={{ color }}>
        {amount}
      </div>
    </div>
  )
}
