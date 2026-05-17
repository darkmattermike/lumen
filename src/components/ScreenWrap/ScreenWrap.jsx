import styles from './ScreenWrap.module.css'

export default function ScreenWrap({ children }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.screen}>
        {children}
      </div>
    </div>
  )
}
