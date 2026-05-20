import { usePushPrompt } from '../../hooks/usePushPrompt'
import LumenDot from '../LumenDot/LumenDot'
import styles from './PushPromptBanner.module.css'

export default function PushPromptBanner() {
  const { show, enabling, enable, dismiss } = usePushPrompt()
  if (!show) return null

  return (
    <div className={styles.banner}>
      <LumenDot size={22} mood="idle" />
      <div className={styles.body}>
        <div className={styles.title}>Stay in the loop</div>
        <div className={styles.sub}>Get alerts when something needs your attention — cash crunches, duplicate charges, wins.</div>
      </div>
      <div className={styles.actions}>
        <button className={styles.enableBtn} onClick={enable} disabled={enabling}>
          {enabling ? '…' : 'Enable'}
        </button>
        <button className={styles.dismissBtn} onClick={dismiss}>Not now</button>
      </div>
    </div>
  )
}
