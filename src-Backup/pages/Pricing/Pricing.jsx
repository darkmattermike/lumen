import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../data/api'
import styles from './Pricing.module.css'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'var(--ink-2)',
    tagline: 'Get started with manual tracking',
    features: [
      'Unlimited budget categories',
      'Calendar & recurring items',
      'Lumen AI insights & chat',
      'Manual transaction entry',
      'CSV import',
      'Goals & debt tracking',
      'Gmail intelligence',
    ],
    missing: ['Live bank sync (Plaid)', 'Family plan'],
    cta: 'Current Plan',
  },
  {
    id: 'plus',
    name: 'Lumen Plus',
    price: '$4.99',
    period: '/month',
    color: 'var(--calm)',
    tagline: 'Live bank sync + everything in Free',
    features: [
      'Everything in Free',
      'Live bank sync via Plaid',
      'Auto transaction import',
      'Real-time balance updates',
      'Transaction enrichment',
      'Subscription detection',
    ],
    missing: ['Family plan'],
    cta: 'Upgrade to Plus',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Lumen Pro',
    price: '$9.99',
    period: '/month',
    color: 'var(--goal)',
    tagline: 'Everything in Plus + family sharing',
    features: [
      'Everything in Plus',
      'Family plan (up to 3 members)',
      'Shared account visibility',
      'Per-transaction privacy controls',
      'Blur or hide private transactions',
      'Family financial overview',
    ],
    missing: [],
    cta: 'Upgrade to Pro',
    popular: true,
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState('')
  const currentTier = user?.tier || 'free'

  async function handleUpgrade(plan) {
    if (plan === 'free') return
    if (plan === currentTier) return navigate('/settings')
    setLoading(plan)
    setError('')
    try {
      const { url } = await api.billingCheckout(plan)
      window.location.href = url
    } catch (err) {
      setError(err.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
        <div className={styles.pre}>Choose your plan</div>
        <h1 className={styles.title}>Simple, honest pricing</h1>
        <p className={styles.sub}>
          Start free. Upgrade when you're ready for live bank sync or family sharing.
          Cancel anytime — no questions asked.
        </p>
      </div>

      <div className={styles.grid}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentTier
          const isUpgrade = plan.id !== 'free' && plan.id !== currentTier
          return (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.popular ? styles.popular : ''} ${isCurrent ? styles.current : ''}`}
              style={{ '--plan-color': plan.color }}
            >
              {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
              {isCurrent && <div className={styles.currentBadge}>Your Plan</div>}

              <div className={styles.cardTop}>
                <div className={styles.planName} style={{ color: plan.color }}>{plan.name}</div>
                <div className={styles.planPrice}>
                  <span className={styles.priceAmt}>{plan.price}</span>
                  <span className={styles.pricePeriod}>{plan.period}</span>
                </div>
                <div className={styles.planTagline}>{plan.tagline}</div>
              </div>

              <div className={styles.divider} />

              <ul className={styles.features}>
                {plan.features.map(f => (
                  <li key={f} className={styles.feature}>
                    <span className={styles.check} style={{ color: plan.color }}>✓</span>
                    {f}
                  </li>
                ))}
                {plan.missing.map(f => (
                  <li key={f} className={`${styles.feature} ${styles.featureMissing}`}>
                    <span className={styles.cross}>✕</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`${styles.cta} ${isCurrent ? styles.ctaCurrent : isUpgrade ? styles.ctaUpgrade : ''}`}
                style={isUpgrade ? { '--plan-color': plan.color } : {}}
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id || isCurrent}
              >
                {loading === plan.id ? 'Redirecting…' : isCurrent ? 'Current Plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.footer}>
        <div className={styles.footerItem}>
          <span>🔒</span> Payments secured by Stripe
        </div>
        <div className={styles.footerItem}>
          <span>↩</span> Cancel anytime, no lock-in
        </div>
        <div className={styles.footerItem}>
          <span>✉</span> Questions? support@lumenfinance.com
        </div>
      </div>
    </div>
  )
}
