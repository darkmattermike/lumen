import styles from './LumenDot.module.css'

/* The Lumen mark — a small living point of light. */
export default function LumenDot({ size = 26 }) {
  return <span className={styles.dot} style={{ width: size, height: size }} aria-hidden="true" />
}
