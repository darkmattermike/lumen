import { useState, useEffect } from 'react'
import { api } from '../../data/api'
import styles from './RecurringSuggestions.module.css'

const TYPE_COLOR = {
  bill:         'var(--debt)',
  subscription: 'var(--warn)',
  income:       'var(--safe)',
}

export default function RecurringSuggestions({ onAccepted }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [scanning,    setScanning]    = useState(false)
  const [acting,      setActing]      = useState(null)
  const [open,        setOpen]        = useState(true)

  async function load() {
    try {
      const r = await api.recurringSuggestions()
      setSuggestions(r.suggestions || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  async function scan() {
    setScanning(true)
    try {
      const r = await api.scanRecurring()
      setSuggestions(r.suggestions || [])
    } catch { /* silent */ }
    finally { setScanning(false) }
  }

  useEffect(() => { load() }, [])

  async function accept(id) {
    setActing(id)
    try {
      await api.acceptRecurringSuggestion(id)
      setSuggestions(prev => prev.filter(s => s.id !== id))
      onAccepted?.()
    } catch (err) { alert(err.message) }
    finally { setActing(null) }
  }

  async function dismiss(id) {
    setActing(id)
    try {
      await api.dismissRecurringSuggestion(id)
      setSuggestions(prev => prev.filter(s => s.id !== id))
    } catch { /* silent */ }
    finally { setActing(null) }
  }

  const fmt = n => `$${Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Don't render anything if no suggestions and not loading
  if (!loading && !suggestions.length) {
    return (
      <div className={styles.scanWrap}>
        <button className={styles.scanBtn} onClick={scan} disabled={scanning}>
          {scanning ? '🔍 Scanning…' : '🔍 Detect recurring items'}
        </button>
        <span className={styles.scanHint}>Lumen will scan your transactions for repeating charges</span>
      </div>
    )
  }

  if (loading) return null

  return (
    <div className={styles.wrap}>
      <button className={styles.headerRow} onClick={() => setOpen(v => !v)}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} />
          <span className={styles.headerTitle}>
            {suggestions.length} recurring item{suggestions.length !== 1 ? 's' : ''} detected
          </span>
          <span className={styles.headerSub}>
            Lumen found repeating charges — add them to your calendar or dismiss
          </span>
        </div>
        <span className={styles.chevron} style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className={styles.list}>
          {suggestions.map(s => {
            const color = TYPE_COLOR[s.type] || 'var(--calm)'
            const isActing = acting === s.id
            return (
              <div key={s.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <span className={styles.icon}>{s.icon}</span>
                  <div>
                    <div className={styles.name}>{s.name}</div>
                    <div className={styles.meta}>
                      <span className={styles.type} style={{ color }}>{s.type}</span>
                      {s.day_of_month && <span className={styles.day}>· day {s.day_of_month}</span>}
                      <span className={styles.seen}>· seen {s.occurrences}×</span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <span className={styles.amount} style={{ color }}>{fmt(s.amount)}</span>
                  <div className={styles.actions}>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => accept(s.id)}
                      disabled={!!acting}
                    >
                      {isActing ? '…' : '+ Add'}
                    </button>
                    <button
                      className={styles.dismissBtn}
                      onClick={() => dismiss(s.id)}
                      disabled={!!acting}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
