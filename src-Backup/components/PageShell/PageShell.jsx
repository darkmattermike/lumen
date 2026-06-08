import styles from './PageShell.module.css'

export function LoadingShell() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      {/* Orb + rings + bounce */}
      <div className={styles.orbWrap}>
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.orb} />
      </div>

      {/* Shadow */}
      <div className={styles.shadow} />

      {/* Text block */}
      <div className={styles.textBlock}>
        <div className={styles.tagline}>
          your <em className={styles.teal}>money</em>, told plainly.
        </div>
        <div className={styles.brand}>Lumen Finance</div>
      </div>

      {/* Single-segment loading bar */}
      <div className={styles.barWrap}>
        <div className={styles.barTrack}>
          <div className={styles.barFill} />
        </div>
      </div>

      {/* Sub label */}
      <div className={styles.loadingLabel}>loading your data...</div>
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
