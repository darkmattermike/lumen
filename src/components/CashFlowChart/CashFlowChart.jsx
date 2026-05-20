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
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CashFlowChart() {
  const [days, setDays]         = useState(30)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [drawn, setDrawn]       = useState(false)
  const svgRef                  = useRef(null)
  const pathRef                 = useRef(null)
  const animFrameRef            = useRef(null)

  useEffect(() => {
    setLoading(true)
    setDrawn(false)
    api.forecastPoints(days)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  // Draw animation: animate SVG path strokeDashoffset from full length → 0
  useEffect(() => {
    if (!pathRef.current || drawn) return
    const path = pathRef.current
    const len  = path.getTotalLength()
    path.style.strokeDasharray  = len
    path.style.strokeDashoffset = len

    let start = null
    const duration = 900

    function tick(ts) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      path.style.strokeDashoffset = len * (1 - eased)
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        setDrawn(true)
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [data, drawn])

  const W = 560, H = 180
  const PAD = { top: 16, right: 12, bottom: 28, left: 52 }
  const CW  = W - PAD.left - PAD.right
  const CH  = H - PAD.top  - PAD.bottom

  function buildChart(points, crunches, threshold) {
    if (!points?.length) return null
    const today   = new Date().toISOString().split('T')[0]
    const todayIdx = points.findIndex(p => p.date >= today)

    const balances = points.map(p => p.balance)
    const maxBal   = Math.max(...balances, 0)
    const minBal   = Math.min(...balances, 0)
    const range    = maxBal - minBal || 1

    const xScale = i => PAD.left + (i / (points.length - 1)) * CW
    const yScale = b => PAD.top  + CH - ((b - minBal) / range) * CH

    const pastPoints   = todayIdx > 0 ? points.slice(0, todayIdx + 1) : points
    const futurePoints = todayIdx > 0 ? points.slice(todayIdx) : []

    const makePath = pts => pts.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${xScale(todayIdx > 0 && i > 0 ? todayIdx + i : i).toFixed(1)},${yScale(p.balance).toFixed(1)}`
    ).join(' ')

    const allPath   = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.balance).toFixed(1)}`).join(' ')
    const fillPath  = `${allPath} L${xScale(points.length-1).toFixed(1)},${(PAD.top+CH).toFixed(1)} L${PAD.left},${(PAD.top+CH).toFixed(1)} Z`

    // Uncertainty band for future section (widens as it goes further out)
    const uncertaintyBand = futurePoints.length > 1 ? (() => {
      const futurePts = futurePoints.map((p, i) => ({
        x: xScale(todayIdx + i),
        y: yScale(p.balance),
        spread: (i / futurePoints.length) * CH * 0.12,
      }))
      const upper = futurePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${Math.max(PAD.top, p.y - p.spread).toFixed(1)}`).join(' ')
      const lower = [...futurePts].reverse().map((p, i) => `L${p.x.toFixed(1)},${Math.min(PAD.top + CH, p.y + p.spread).toFixed(1)}`).join(' ')
      return `${upper} ${lower} Z`
    })() : null

    const todayX = todayIdx > 0 ? xScale(todayIdx) : null

    const crunchRects = (crunches || []).map(crunch => {
      const si = points.findIndex(p => p.date >= crunch.startDate)
      const ei = points.findLastIndex(p => p.date <= crunch.endDate)
      if (si < 0 || ei < 0) return null
      return { x: xScale(si), w: xScale(Math.max(ei, si+1)) - xScale(si), crunch }
    }).filter(Boolean)

    const markers = points.map((p, i) => {
      if (!p.hasIncome && !p.hasBill) return null
      return { x: xScale(i), y: yScale(p.balance), hasIncome: p.hasIncome, hasBill: p.hasBill, idx: i }
    }).filter(Boolean)

    const labelCount = 5
    const labelStep  = Math.floor(points.length / labelCount)
    const xLabels = points
      .map((p, i) => ({ i, p }))
      .filter((_, i) => i === 0 || (i + 1) % labelStep === 0 || i === points.length - 1)
      .slice(0, labelCount + 1)
      .map(({ i, p }) => ({ x: xScale(i), label: friendlyDate(p.date) }))

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const val = minBal + t * range
      return { y: yScale(val), label: val >= 1000 ? `$${(val/1000).toFixed(0)}k` : `$${Math.round(val)}` }
    })

    const threshY = threshold != null ? yScale(threshold) : null
    const zeroY   = yScale(0)

    return { allPath, fillPath, uncertaintyBand, zeroY, threshY, crunchRects, markers, xLabels, yTicks, xScale, yScale, maxBal, minBal, todayX }
  }

  const chart = data ? buildChart(data.points, data.crunches, data.threshold) : null
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
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Cash Flow Forecast</span>
          {data && <span className={styles.paceTag}>${fmt(data.dailyPace)}/day pace</span>}
        </div>
        <div className={styles.dayTabs}>
          {DAY_OPTIONS.map(o => (
            <button key={o.value}
              className={`${styles.dayTab} ${days === o.value ? styles.dayTabActive : ''}`}
              onClick={() => setDays(o.value)}>{o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chartWrap}>
        {loading && <div className={styles.chartLoading}>Building forecast…</div>}

        {!loading && chart && (
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.svg}
            onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
            <defs>
              <linearGradient id="cf-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--calm)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--calm)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="cf-crunch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--debt)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--debt)" stopOpacity="0.03" />
              </linearGradient>
              <linearGradient id="cf-uncertainty" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="var(--calm)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--calm)" stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Crunch zones */}
            {chart.crunchRects.map((cr, i) => (
              <rect key={i} x={cr.x} y={PAD.top} width={Math.max(cr.w,2)} height={CH} fill="url(#cf-crunch)" />
            ))}

            {/* Y-axis grid */}
            {chart.yTicks.map((t, i) => (
              <g key={i}>
                <line x1={PAD.left} y1={t.y} x2={PAD.left+CW} y2={t.y} stroke="var(--ink-5)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={PAD.left-4} y={t.y+4} className={styles.axisLabel} textAnchor="end">{t.label}</text>
              </g>
            ))}

            {/* Zero line */}
            {chart.minBal < 0 && (
              <line x1={PAD.left} y1={chart.zeroY} x2={PAD.left+CW} y2={chart.zeroY}
                stroke="var(--debt)" strokeWidth="1" strokeDasharray="4,2" opacity="0.5" />
            )}

            {/* Threshold line */}
            {chart.threshY != null && (
              <line x1={PAD.left} y1={chart.threshY} x2={PAD.left+CW} y2={chart.threshY}
                stroke="var(--warn)" strokeWidth="0.75" strokeDasharray="2,4" opacity="0.6" />
            )}

            {/* Today divider */}
            {chart.todayX != null && (
              <line x1={chart.todayX} y1={PAD.top} x2={chart.todayX} y2={PAD.top+CH}
                stroke="var(--ink-3)" strokeWidth="0.75" strokeDasharray="2,3" />
            )}

            {/* Uncertainty band for future */}
            {chart.uncertaintyBand && (
              <path d={chart.uncertaintyBand} fill="url(#cf-uncertainty)" />
            )}

            {/* Fill area */}
            <path d={chart.fillPath} fill="url(#cf-fill)" />

            {/* Main line — animated draw */}
            <path
              ref={pathRef}
              d={chart.allPath}
              fill="none"
              stroke="var(--calm)"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Event markers — fade in after draw */}
            {drawn && chart.markers.map((m, i) => (
              <circle key={i} cx={m.x} cy={m.y} r={3}
                fill={m.hasIncome ? 'var(--safe)' : 'var(--debt)'}
                opacity={0.85}
                style={{ animation: `cf-dot-in 0.3s ease ${i * 20}ms both` }}
              />
            ))}

            {/* Hover crosshair */}
            {hoverIdx != null && data?.points?.[hoverIdx] && (() => {
              const x = chart.xScale(hoverIdx)
              const y = chart.yScale(data.points[hoverIdx].balance)
              return (
                <g>
                  <line x1={x} y1={PAD.top} x2={x} y2={PAD.top+CH}
                    stroke="var(--ink-3)" strokeWidth="0.75" strokeDasharray="3,3" />
                  <circle cx={x} cy={y} r={4.5} fill="var(--calm)" stroke="var(--bg-1)" strokeWidth="2" />
                </g>
              )
            })()}

            {/* X labels */}
            {chart.xLabels.map((l, i) => (
              <text key={i} x={l.x} y={H-6} className={styles.axisLabel} textAnchor="middle">{l.label}</text>
            ))}
          </svg>
        )}

        {hoverPoint && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipDate}>{friendlyDate(hoverPoint.date)}</div>
            <div className={styles.tooltipBal} style={{ color: hoverPoint.balance < 0 ? 'var(--debt)' : 'var(--safe)' }}>
              ${fmtD(hoverPoint.balance)}
            </div>
          </div>
        )}
      </div>

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
