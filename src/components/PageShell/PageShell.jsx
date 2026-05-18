import styles from './PageShell.module.css'

export function LoadingShell() {
  return (
    <div className={styles.center}>
      <div className="dot d-32" style={{ animation: 'dot-breathe 3s ease-in-out infinite' }} />
      <div className={styles.loadingText}>Loading...</div>
    </div>
  )
}

export function ErrorShell({ message }) {
  return (
    <div className={styles.center}>
      <div className={styles.errorText}>Failed to load: {message}</div>
    </div>
  )
}
