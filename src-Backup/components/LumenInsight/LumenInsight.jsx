import { useState, useEffect, useRef } from 'react'
import LumenDot from '../LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './LumenInsight.module.css'

const CACHE_TTL = 24 * 60 * 60 * 1000

// Lumen's quippy thinking messages — cycles while loading
const THINKING_QUIPS = [
  'crunching numbers…',
  'being nosy about your spending…',
  'consulting the spreadsheet gods…',
  'judging your dining budget…',
  'doing math (ew)…',
  'reading between the transactions…',
  'finding the interesting bit…',
  'pretending to think…',
  'connecting the dots…',
  'checking receipts…',
]

function getCacheKey(prompt, contextType) {
  let hash = 5381
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) + hash) + prompt.charCodeAt(i)
    hash = hash & hash
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

export default function LumenInsight({
  prompt,
  contextType = 'insight',
  label       = 'Lumen',
  color       = 'green',
  showWhenNoKey = false,
}) {
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [noKey, setNoKey]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [quipIdx, setQuipIdx]   = useState(() => Math.floor(Math.random() * THINKING_QUIPS.length))
  const [justLoaded, setJustLoaded] = useState(false)
  const quipTimer = useRef(null)
  const cacheKey  = getCacheKey(prompt, contextType)

  // Cycle quips while loading
  useEffect(() => {
    if (!loading) {
      clearInterval(quipTimer.current)
      return
    }
    quipTimer.current = setInterval(() => {
      setQuipIdx(i => (i + 1) % THINKING_QUIPS.length)
    }, 1800)
    return () => clearInterval(quipTimer.current)
  }, [loading])

  function fetchInsight(bust = false) {
    if (!bust) {
      const cached = readCache(cacheKey)
      if (cached) { setText(cached); setLoading(false); return }
    }
    setLoading(true); setNoKey(false); setText('')
    api.lumenInsight({ prompt, context_type: contextType })
      .then(data => {
        const insight = data.insight || ''
        setText(insight)
        writeCache(cacheKey, insight)
        setJustLoaded(true)
        setTimeout(() => setJustLoaded(false), 1000)
      })
      .catch(err => {
        if (err.message?.includes('402') || err.message === 'NO_KEY') setNoKey(true)
      })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { fetchInsight() }, [prompt, contextType])

  function handleRefresh() { setRefreshing(true); fetchInsight(true) }

  if (!loading && noKey) {
    if (!showWhenNoKey) return null
    return (
      <div className={`${styles.card} ${styles[color]}`}>
        <div className={styles.tag}>
          <LumenDot size={8} mood="idle" />
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
    <div className={`${styles.card} ${styles[color]} ${justLoaded ? styles.justLoaded : ''}`}>
      <div className={styles.tag}>
        {loading ? (
          <div className={styles.tagLoading}>
            {/* Orb thinks while loading */}
            <LumenDot size={10} mood="thinking" />
            <span className={styles.quip}>{THINKING_QUIPS[quipIdx]}</span>
          </div>
        ) : (
          <>
            <LumenDot
              size={8}
              mood={justLoaded ? 'happy' : 'idle'}
            />
            {label}
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Ask Lumen again"
            >
              {refreshing ? <LumenDot size={8} mood="loading" /> : '↻'}
            </button>
          </>
        )}
      </div>
      {!loading && text && (
        <div className={`${styles.text} ${justLoaded ? styles.textPop : ''}`}>
          {text}
        </div>
      )}
    </div>
  )
}
