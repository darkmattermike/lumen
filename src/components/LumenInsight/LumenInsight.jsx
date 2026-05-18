import { useState, useEffect } from 'react'
import LumenDot from '../LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './LumenInsight.module.css'

/**
 * LumenInsight
 * Renders a Lumen-branded card that fetches a real AI insight on mount.
 *
 * @param {string} prompt      — the specific question to ask Lumen
 * @param {string} contextType — e.g. 'dashboard', 'analytics', 'transactions'
 * @param {string} label       — the tag shown above the insight e.g. 'Lumen Noticed'
 * @param {string} color       — 'green' | 'blue' | 'purple' | 'amber' (default green)
 */
export default function LumenInsight({ prompt, contextType = 'insight', label = 'Lumen', color = 'green' }) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(true)
  const [noKey, setNoKey]     = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNoKey(false)
    setText('')

    api.lumenInsight({ prompt, context_type: contextType })
      .then(data => {
        if (cancelled) return
        setText(data.insight || '')
      })
      .catch(err => {
        if (cancelled) return
        if (err.message?.includes('402') || err.message === 'NO_KEY') {
          setNoKey(true)
        } else {
          setText('') // silent fail — card just won't show
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [prompt, contextType])

  // Don't render if no key and not loading
  if (!loading && noKey) return null
  if (!loading && !text)  return null

  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.tag}>
        {loading ? (
          <div className={styles.tagLoading}>
            <div className={styles.tagDot} />
            <div className={styles.tagDot} style={{ animationDelay: '.2s' }} />
            <div className={styles.tagDot} style={{ animationDelay: '.4s' }} />
          </div>
        ) : (
          <>
            <div className={styles.dotWrap}><LumenDot size={8} /></div>
            {label}
          </>
        )}
      </div>
      {!loading && text && (
        <div className={styles.text}>{text}</div>
      )}
    </div>
  )
}
