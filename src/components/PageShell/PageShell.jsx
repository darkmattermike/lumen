import styles from './PageShell.module.css'

export function LoadingShell() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      <div className={styles.orbWrap}>
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.orb} />
      </div>

      <div className={styles.shadow} />

      <div className={styles.tagline}>
        <span className={styles.white}>your money,</span>
        <span className={styles.teal}>told clearly.</span>
      </div>

      <div className={styles.scanTrack}>
        <div className={styles.scanFill} />
      </div>
    </div>
  )
}

export function ErrorShell({ message }) {
  return (
    <div className={styles.page}>
      <div className={styles.errorCard}>
        <div className={styles.errorOrb} />
        <div className={styles.errorLabel}>Connection Error</div>
        <div className={styles.errorText}>{message}</div>
        <button className={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  )
}
