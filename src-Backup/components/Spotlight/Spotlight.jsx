import LumenDot from '../LumenDot/LumenDot'
import styles from './Spotlight.module.css'

/**
 * Spotlight — the Lumen "glowing answer" block
 * @param {string} tag    — small label above text e.g. 'Responding to: Dinner tonight (~$65)'
 * @param {ReactNode} children — the response text (can include <strong>, <em>, etc.)
 * @param {ReactNode} footer   — optional result bar / input below the text
 * @param {number} dotSize
 */
export default function Spotlight({ tag, children, footer, dotSize = 44 }) {
  return (
    <div className={styles.spotlight}>
      <div className={styles.dotCol}>
        <LumenDot size={dotSize} rings />
        <div className={styles.dotLabel}>Lumen</div>
      </div>
      <div className={styles.content}>
        {tag && (
          <div className={styles.tag}>
            <span className="pdot" />
            {tag}
          </div>
        )}
        <div className={styles.text}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
