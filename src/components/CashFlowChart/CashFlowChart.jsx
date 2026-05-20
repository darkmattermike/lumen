import { useState, useEffect, useRef } from 'react'
import { api } from '../../data/api'
import styles from './CashFlowChart.module.css'

const DAY_OPTIONS = [
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
]

function fmt(n)  { return Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtD(n) { return Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function friendlyDate(str) {
  if (!str) return ''
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CashFlowChart() {
  const [days, setDays]           = useState(30)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [hoverIdx, setHoverIdx]   = useState(null)
  const svgRef                    = useRef(null)

  useEffect(() => {
    setLoading(true)
    api.forecastPoints(days)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  // ── Chart geometry ────────────────────────────────────────────
  const W = 560, H = 180
  const PAD = { top: 16, right: 12, bottom: 28, left: 52 }
  const CW  = W - PAD.left - PAD.right
  const CH  = H - PAD.top  - PAD.bottom

  function buildChart(points, crunches, threshold) {
    if (!points?.length) return null

    const balances = points.map(p => p.balance)
    const maxBal   = Math.max(...balances, 0)
    const minBal   = Math.min(...balances, 0)
    const range    = maxBal - minBal || 1

    const xScale = i  => PAD.left + (i / (points.length - 1)) * CW
    const yScale = b  => PAD.top  + CH - ((b - minBal) / range) * CH

    // SVG path
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.balance).toFixed(1)}`).join(' ')

    // Fill area
    const fillPath = `${path} L${xScale(points.length-1).toFixed(1)},${(PAD.top+CH).toFixed(1)} L${PAD.left},${(PAD.top+CH).toFixed(1)} Z`

    // Zero line Y position
    const zeroY = yScale(0)

    // Threshold line (crunch danger line)
    const threshY = threshold != null ? yScale(threshold) : null

    // Crunch shading zones
    const crunchRects = (crunches || []).map(crunch => {
      const si = points.findIndex(p => p.date >= crunch.startDate)
      const ei = points.findLastIndex(p => p.date <= crunch.endDate)
      if (si < 0 || ei < 0) return null
      return { x: xScale(si), w: xScale(Math.max(ei, si+1)) - xScale(si), crunch }
    }).filter(Boolean)

    // Event markers (income = green dot, bill = red dot) — only show on visible points
    const markers = points.map((p, i) => {
      if (!p.hasIncome && !p.hasBill) return null
      return { x: xScale(i), y: yScale(p.balance), hasIncome: p.hasIncome, hasBill: p.hasBill, idx: i }
    }).filter(Boolean)

    // X-axis labels — show ~5 evenly spaced dates
    const labelCount  = 5
    const labelStep   = Math.floor(points.length / labelCount)
    const xLabels = points
      .map((p, i) => ({ i, p }))
      .filter((_, i) => i === 0 || (i + 1) % labelStep === 0 || i === points.length - 1)
      .slice(0, labelCount + 1)
      .map(({ i, p }) => ({ x: xScale(i), label: friendlyDate(p.date) }))

    // Y-axis labels — 4 evenly spaced
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const val = minBal + t * range
      return { y: yScale(val), label: val >= 1000 ? `$${(val/1000).toFixed(0)}k` : `$${Math.round(val)}` }
    })

    return { path, fillPath, zeroY, threshY, crunchRects, markers, xLabels, yTicks, xScale, yScale, maxBal, minBal }
  }

  const chart = data ? buildChart(data.points, data.crunches, data.threshold) : null

  // Hover tooltip data
  const hoverPoint = (hoverIdx != null && data?.points) ? data.points[hoverIdx] : null

  function handleMouseMove(e) {
    if (!svgRef.current || !data?.points?.length) return
    const rect = svgRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const rel  = (x - PAD.left) / CW
    const idx  = Math.round(rel * (data.points.length - 1))
    setHoverIdx(Math.max(0, Math.min(idx, data.points.length - 1)))
  }

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Cash Flow Forecast</span>
          {data && (
            <span className={styles.paceTag}>
              ${fmt(data.dailyPace)}/day pace
            </span>
          )}
        </div>
        <div className={styles.dayTabs}>
          {DAY_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`${styles.dayTab} ${days === o.value ? styles.dayTabActive : ''}`}
              onClick={() => setDays(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartWrap}>
        {loading && <div className={styles.chartLoading}>Building forecast...</div>}

        {!loading && chart && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className={styles.svg}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="fg-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--calm)"  stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--calm)"  stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="crunch-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--debt)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--debt)" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Crunch shading zones */}
            {chart.crunchRects.map((cr, i) => (
              <rect
                key={i}
                x={cr.x} y={PAD.top}
                width={Math.max(cr.w, 2)} height={CH}
                fill="url(#crunch-fill)"
              />
            ))}

            {/* Y-axis gridlines + labels */}
            {chart.yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={PAD.left} y1={t.y} x2={PAD.left + CW} y2={t.y}
                  stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"
                />
                <text x={PAD.left - 4} y={t.y + 4} className={styles.axisLabel} textAnchor="end">
                  {t.label}
                </text>
              </g>
            ))}

            {/* Zero line */}
            {chart.minBal < 0 && (
              <line
                x1={PAD.left} y1={chart.zeroY} x2={PAD.left + CW} y2={chart.zeroY}
                stroke="var(--debt)" strokeWidth="1" strokeDasharray="4,2" opacity="0.5"
              />
            )}

            {/* Threshold danger line */}
            {chart.threshY != null && (
              <line
                x1={PAD.left} y1={chart.threshY} x2={PAD.left + CW} y2={chart.threshY}
                stroke="var(--warn)" strokeWidth="0.75" strokeDasharray="2,4" opacity="0.6"
              />
            )}

            {/* Fill area */}
            <path d={chart.fillPath} fill="url(#fg-fill)" />

            {/* Main line */}
            <path d={chart.path} fill="none" stroke="var(--calm)" strokeWidth="1.5" strokeLinejoin="round" />

            {/* Event markers */}
            {chart.markers.map((m, i) => (
              <circle
                key={i}
                cx={m.x} cy={m.y} r={3}
                fill={m.hasIncome ? 'var(--safe)' : 'var(--debt)'}
                opacity={0.8}
              />
            ))}

            {/* Hover crosshair */}
            {hoverIdx != null && chart.xScale && data?.points?.[hoverIdx] && (() => {
              const x = chart.xScale(hoverIdx)
              const y = chart.yScale(data.points[hoverIdx].balance)
              return (
                <g>
                  <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + CH}
                    stroke="var(--ink-3)" strokeWidth="0.75" strokeDasharray="3,3" />
                  <circle cx={x} cy={y} r={4} fill="var(--calm)" stroke="var(--surface-0)" strokeWidth="2" />
                </g>
              )
            })()}

            {/* X-axis labels */}
            {chart.xLabels.map((l, i) => (
              <text key={i} x={l.x} y={H - 6} className={styles.axisLabel} textAnchor="middle">
                {l.label}
              </text>
            ))}
          </svg>
        )}

        {/* Hover tooltip */}
        {hoverPoint && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipDate}>{friendlyDate(hoverPoint.date)}</div>
            <div className={styles.tooltipBal} style={{ color: hoverPoint.balance < 0 ? 'var(--debt)' : 'var(--safe)' }}>
              ${fmtD(hoverPoint.balance)}
            </div>
          </div>
        )}
      </div>

      {/* Crunch alerts */}
      {data?.crunches?.length > 0 && (
        <div className={styles.crunchSection}>
          {data.crunches.slice(0, 2).map((crunch, i) => (
            <div key={i} className={styles.crunchAlert}>
              <span className={styles.crunchIcon}>{crunch.minBalance < 0 ? '🚨' : '⚠️'}</span>
              <div className={styles.crunchBody}>
                <div className={styles.crunchTitle}>
                  {crunch.minBalance < 0 ? 'Overdraft risk' : 'Tight window'} around {friendlyDate(crunch.minDate)}
                </div>
                <div className={styles.crunchSub}>
                  Projected low: <strong style={{ color: 'var(--debt)' }}>${fmtD(crunch.minBalance)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary row */}
      {data && !loading && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Starting</span>
            <span className={styles.summaryVal}>${fmt(data.startBalance)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Projected low</span>
            <span className={styles.summaryVal} style={{ color: data.minBalance < 500 ? 'var(--warn)' : 'inherit' }}>
              ${fmt(data.minBalance)}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Low date</span>
            <span className={styles.summaryVal}>{friendlyDate(data.minDate)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Daily pace</span>
            <span className={styles.summaryVal}>${fmt(data.dailyPace)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
