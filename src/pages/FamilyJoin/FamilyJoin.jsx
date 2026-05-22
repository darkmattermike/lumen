import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../data/api'
import LumenDot from '../../components/LumenDot/LumenDot'
import styles from './FamilyJoin.module.css'

export default function FamilyJoin() {
  const { code }   = useParams()
  const navigate   = useNavigate()
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError]     = useState('')
  const [joined, setJoined]   = useState(false)

  useEffect(() => {
    api.familyJoinInfo(code)
      .then(d => { setInfo(d.group); setLoading(false) })
      .catch(err => { setError(err.message || 'Invalid invite link'); setLoading(false) })
  }, [code])

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      await api.familyJoin(code)
      setJoined(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.message || 'Failed to join')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.card}>
        <div className={styles.orbRow}>
          <LumenDot size={48} rings mood={joined ? 'happy' : 'idle'} />
        </div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.dots}>···</div>
            <div className={styles.loadingText}>Checking invite link…</div>
          </div>
        )}

        {!loading && error && (
          <>
            <div className={styles.title}>Invalid Invite</div>
            <p className={styles.sub}>{error}</p>
            <button className={styles.btn} onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          </>
        )}

        {!loading && !error && !joined && info && (
          <>
            <div className={styles.title}>You've been invited</div>
            <p className={styles.sub}>
              <strong>{info.owner_name || 'Someone'}</strong> has invited you to join their
              Lumen family plan. You'll share financial data and can set individual
              transactions as private.
            </p>
            <div className={styles.features}>
              <div className={styles.feature}><span>👁</span> See shared accounts & transactions</div>
              <div className={styles.feature}><span>🔒</span> Mark any transaction private to yourself</div>
              <div className={styles.feature}><span>💰</span> Your own budgets stay separate</div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.btn} onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining…' : 'Accept Invite'}
              </button>
              <button className={styles.cancel} onClick={() => navigate('/dashboard')}>
                Decline
              </button>
            </div>
          </>
        )}

        {joined && (
          <>
            <div className={styles.title} style={{ color: 'var(--safe)' }}>You're in!</div>
            <p className={styles.sub}>You've joined the family plan. Redirecting to your dashboard…</p>
          </>
        )}
      </div>
    </div>
  )
}
