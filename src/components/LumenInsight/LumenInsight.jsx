import { useState, useEffect } from 'react'
import LumenDot from '../LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './LumenInsight.module.css'

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCacheKey(prompt, contextType) {
  // Simple djb2 hash — safe with any characters
  let hash = 5381
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) + hash) + prompt.charCodeAt(i)
    hash = hash & hash // convert to 32-bit int
  }
  return `lumen_insight_${contextType}_${Math.abs(hash)}`
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { text, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null }
    return text
  } catch { return null }
}

function writeCache(key, text) {
  try { sessionStorage.setItem(key, JSON.stringify({ text, ts: Date.now() })) } catch {}
}

export default function LumenInsight({ prompt, contextType = 'insight', label = 'Lumen', color = 'green', showWhenNoKey = false }) {
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [noKey, setNoKey]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const cacheKey = getCacheKey(prompt, contextType)

  function fetchInsight(bust = false) {
    if (!bust) {
      const cached = readCache(cacheKey)
      if (cached) { setText(cached); setLoading(false); return }
    }
    setLoading(true)
    setNoKey(false)
    setText('')

    api.lumenInsight({ prompt, context_type: contextType })
      .then(data => {
        const insight = data.insight || ''
        setText(insight)
        writeCache(cacheKey, insight)
      })
      .catch(err => {
        if (err.message?.includes('402') || err.message === 'NO_KEY') setNoKey(true)
      })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { fetchInsight() }, [prompt, contextType])

  function handleRefresh() {
    setRefreshing(true)
    fetchInsight(true)
  }

  if (!loading && noKey) {
    if (!showWhenNoKey) return null
    return (
      <div className={`${styles.card} ${styles[color]}`}>
        <div className={styles.tag}>
          <div className={styles.dotWrap}><LumenDot size={8} /></div>
          {label}
        </div>
        <div className={styles.text} style={{ opacity: 0.5 }}>
          Add an Anthropic API key in Settings to unlock AI insights.
        </div>
      </div>
    )
  }

  if (!loading && !text) return null

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
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh insight"
            >
              {refreshing ? '…' : '↻'}
            </button>
          </>
        )}
      </div>
      {!loading && text && (
        <div className={styles.text}>{text}</div>
      )}
    </div>
  )
}

