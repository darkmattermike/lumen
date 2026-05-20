import { useState, useEffect } from 'react'
import { api } from '../../data/api'
import styles from './HealthScore.module.css'

const GRADE_COLOR = {
  A: 'var(--safe)',
  B: 'var(--calm)',
  C: 'var(--warn)',
  D: 'var(--warn)',
  F: 'var(--debt)',
}

const COMPONENT_ICONS = {
  savings_rate:    '💰',
  budget_adherence:'📊',
  cash_cushion:    '🛡️',
  debt_load:       '🔗',
  consistency:     '📈',
  bill_coverage:   '📅',
}

// Tiny SVG sparkline from an array of scores
function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null
  const W = 80, H = 28
  const min   = Math.min(...points)
  const max   = Math.max(...points)
  const range = max - min || 1
  const xs    = points.map((_, i) => (i / (points.length - 1)) * W)
  const ys    = points.map(v => H - ((v - min) / range) * H * 0.8 - H * 0.1)
  const path  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={styles.sparkline}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill={color} />
    </svg>
  )
}

export default function HealthScore() {
  const [data, setData]         = useState(null)
  const [insights, setInsights] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.healthScore().catch(() => null),
      api.behavioralInsights().catch(() => ({ insights: [] })),
    ]).then(([health, behavData]) => {
      setData(health)
      setInsights(behavData?.insights || [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className={styles.strip}>
      <div className={styles.loading}>Computing health score…</div>
    </div>
  )
  if (!data?.current) return null

  const { current, history } = data
  const { score, grade, label, components } = current
  const gradeColor = GRADE_COLOR[grade] || 'var(--calm)'

  // Trend: compare to prior week
  const historyScores = history.map(h => h.score)
  const priorScore    = history.length >= 2 ? history[history.length - 2].score : null
  const trend         = priorScore !== null ? score - priorScore : 0
  const trendLabel    = trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '—'
  const trendColor    = trend > 0 ? 'var(--safe)' : trend < 0 ? 'var(--debt)' : 'var(--ink-3)'

  return (
    <div className={styles.strip}>
      <div className={styles.main} onClick={() => setExpanded(e => !e)}>
        {/* Score dial */}
        <div className={styles.scoreCol}>
          <div className={styles.scoreCircle} style={{ '--sc': gradeColor }}>
            <div className={styles.scoreVal}>{score}</div>
            <div className={styles.scoreGrade} style={{ color: gradeColor }}>{grade}</div>
          </div>
          <div className={styles.scoreLabel}>{label}</div>
        </div>

        {/* Sparkline + trend */}
        <div className={styles.trendCol}>
          <div className={styles.trendLabel}>12-week trend</div>
          <Sparkline points={historyScores} color={gradeColor} />
          {priorScore !== null && (
            <div className={styles.trendChange} style={{ color: trendColor }}>
              {trendLabel} this week
            </div>
          )}
        </div>

        {/* Component bars */}
        <div className={styles.barsCol}>
          {Object.entries(components).slice(0, 4).map(([key, c]) => (
            <div key={key} className={styles.barRow}>
              <span className={styles.barIcon}>{COMPONENT_ICONS[key]}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(c.score / c.max) * 100}%`, background: c.score / c.max >= 0.7 ? 'var(--safe)' : c.score / c.max >= 0.4 ? 'var(--warn)' : 'var(--debt)' }}
                />
              </div>
              <span className={styles.barPts}>{c.score}/{c.max}</span>
            </div>
          ))}
        </div>

        <div className={styles.chevron} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>›</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className={styles.detail}>
          {/* All components */}
          <div className={styles.detailTitle}>Score Breakdown</div>
          <div className={styles.componentGrid}>
            {Object.entries(components).map(([key, c]) => {
              const pct   = c.max > 0 ? c.score / c.max : 0
              const color = pct >= 0.7 ? 'var(--safe)' : pct >= 0.4 ? 'var(--warn)' : 'var(--debt)'
              return (
                <div key={key} className={styles.componentCard}>
                  <div className={styles.compIcon}>{COMPONENT_ICONS[key]}</div>
                  <div className={styles.compBody}>
                    <div className={styles.compName}>{key.replace(/_/g, ' ')}</div>
                    <div className={styles.compValue}>{c.label}</div>
                  </div>
                  <div className={styles.compScore} style={{ color }}>
                    {c.score}<span>/{c.max}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Behavioral insights */}
          {insights.length > 0 && (
            <>
              <div className={styles.detailTitle} style={{ marginTop: 14 }}>Spending Patterns Lumen Noticed</div>
              {insights.map(ins => (
                <div key={ins.insight_key} className={styles.insightRow}>
                  <span className={styles.insightDot}>●</span>
                  <span className={styles.insightText}>{ins.insight_text}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
