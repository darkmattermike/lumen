import { useState, useEffect } from 'react'
import { api } from '../../data/api'
import styles from './MergeReview.module.css'

/**
 * MergeReview
 * Shows a collapsible panel above the transaction list when there are
 * pending merge candidates waiting for user decision.
 * Each card shows the pending (email-sourced) tx alongside the posted (Plaid) tx
 * and lets the user confirm merge or keep separate.
 */
export default function MergeReview({ onResolved }) {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [open,       setOpen]       = useState(true)
  const [acting,     setActing]     = useState(null) // id being actioned

  async function load() {
    try {
      const r = await api.mergeCandidates()
      setCandidates(r.candidates || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function merge(id) {
    setActing(id)
    try {
      await api.mergeCandidate(id)
      setCandidates(prev => prev.filter(c => c.id !== id))
      onResolved?.()
    } catch (err) { alert(err.message) }
    finally { setActing(null) }
  }

  async function separate(id) {
    setActing(id)
    try {
      await api.keepSeparate(id)
      setCandidates(prev => prev.filter(c => c.id !== id))
    } catch (err) { alert(err.message) }
    finally { setActing(null) }
  }

  if (loading || !candidates.length) return null

  const fmt = n => `$${Math.abs(Number(n)).toFixed(2)}`
  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

  return (
    <div className={styles.wrap}>
      <button className={styles.headerRow} onClick={() => setOpen(v => !v)}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} />
          <span className={styles.headerTitle}>
            {candidates.length} pending match{candidates.length !== 1 ? 'es' : ''} need your review
          </span>
          <span className={styles.headerSub}>
            Lumen found transactions from bank alerts that may match posted transactions — confirm or keep separate
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
          {candidates.map(c => {
            const pendingName  = c.pending_cleaned || c.pending_name
            const postedName   = c.posted_cleaned  || c.posted_name
            const isActing     = acting === c.id
            const confColor    = c.confidence === 'high' ? 'var(--safe)' : 'var(--warn)'

            return (
              <div key={c.id} className={styles.card}>
                {/* Confidence badge */}
                <div className={styles.cardBadge} style={{ color: confColor, borderColor: confColor }}>
                  {c.confidence === 'high' ? '↑ High match' : '~ Medium match'}
                </div>

                {/* Side-by-side comparison */}
                <div className={styles.comparison}>
                  <div className={styles.txSide}>
                    <div className={styles.txSideLabel}>📧 From email alert</div>
                    <div className={styles.txSideName}>{pendingName}</div>
                    <div className={styles.txSideAmount}>{fmt(c.pending_amount)}</div>
                    <div className={styles.txSideDate}>{fmtDate(c.pending_date)}</div>
                    {c.pending_email_subject && (
                      <div className={styles.txSideEmail} title={c.pending_email_subject}>
                        {c.pending_email_subject.slice(0, 48)}{c.pending_email_subject.length > 48 ? '…' : ''}
                      </div>
                    )}
                  </div>

                  <div className={styles.arrow}>→</div>

                  <div className={styles.txSide}>
                    <div className={styles.txSideLabel}>🏦 From Plaid</div>
                    <div className={styles.txSideName}>{postedName}</div>
                    <div className={styles.txSideAmount}>{fmt(c.posted_amount)}</div>
                    <div className={styles.txSideDate}>{fmtDate(c.posted_date)}</div>
                    {c.posted_category && (
                      <div className={styles.txSideCat}>{c.posted_category}</div>
                    )}
                  </div>
                </div>

                {c.match_reason && (
                  <div className={styles.matchReason}>Matched on: {c.match_reason}</div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                  <button
                    className={styles.mergeBtn}
                    onClick={() => merge(c.id)}
                    disabled={!!acting}
                  >
                    {isActing ? '…' : '✓ Same transaction — merge'}
                  </button>
                  <button
                    className={styles.separateBtn}
                    onClick={() => separate(c.id)}
                    disabled={!!acting}
                  >
                    {isActing ? '…' : 'Keep both separate'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
