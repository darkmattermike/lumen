/**
 * SpendingPaceCard
 * Inspired by the reference design — cumulative spend curve,
 * projected endpoint, last month reference line, day markers.
 * Styled to match Lumen's design language.
 */
import { useRef, useEffect, useState } from 'react'
import styles from './SpendingPaceCard.module.css'

const fmt  = n => Number(n||0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtK = n => {
  const v = Number(n||0)
  return v >= 1000 ? `$${(v/1000).toFixed(1).replace(/\.0$/,'')}k` : `$${fmt(v)}`
}

export default function SpendingPaceCard({ spending = 0, income = 0, dailyCumulative = [], lastMonthSpend = 0 }) {
  const svgRef   = useRef(null)
  const [dims, setDims] = useState({ w: 400, h: 140 })
  const today        = new Date()
  const dayOfMonth   = today.getDate()
  const daysInMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const monthName    = today.toLocaleString('en-US', { month: 'long' })

  // Projected: linear extrapolation from current pace
  const projected = dayOfMonth > 0
    ? Math.round((spending / dayOfMonth) * daysInMonth)
    : 0

  const paceStatus = projected > lastMonthSpend * 1.1 ? 'over'
    : projected > lastMonthSpend * 0.9 ? 'similar'
    : 'under'

  const statusColor = paceStatus === 'over' ? 'var(--debt)'
    : paceStatus === 'similar' ? 'var(--warn)'
    : 'var(--safe)'

  // Responsive SVG sizing
  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setDims({ w: width, h: 150 })
    })
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [])

  // Build SVG paths
  const { w, h } = dims
  const PAD = { top: 18, right: 20, bottom: 28, left: 40 }
  const chartW = w - PAD.left - PAD.right
  const chartH = h - PAD.top  - PAD.bottom

  const maxVal = Math.max(spending, projected, lastMonthSpend) * 1.1 || 1
  const xPos = (day) => PAD.left + ((day - 1) / (daysInMonth - 1)) * chartW
  const yPos = (val) => PAD.top  + chartH - (val / maxVal) * chartH

  // Current month cumulative line
  const actualPoints = dailyCumulative.length > 0
    ? dailyCumulative
    : [{ day: dayOfMonth, cumSpend: spending }]

  const actualPath = actualPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(p.day).toFixed(1)},${yPos(p.cumSpend).toFixed(1)}`
  ).join(' ')

  // Area fill under actual line
  const areaPath = actualPoints.length > 0
    ? `${actualPath} L${xPos(actualPoints[actualPoints.length-1].day).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${xPos(actualPoints[0].day).toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`
    : ''

  // Projected dashed line from today to end of month
  const lastActual = actualPoints[actualPoints.length - 1]
  const projPath = lastActual
    ? `M${xPos(lastActual.day).toFixed(1)},${yPos(lastActual.cumSpend).toFixed(1)} L${xPos(daysInMonth).toFixed(1)},${yPos(projected).toFixed(1)}`
    : ''

  // Last month reference line (flat, full width — represents last month's total as a horizontal guide)
  const lastMonthY = yPos(lastMonthSpend).toFixed(1)
  const lastMonthLinePath = `M${PAD.left},${lastMonthY} L${(PAD.left + chartW).toFixed(1)},${lastMonthY}`

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: maxVal * t,
    y:   PAD.top + chartH - t * chartH,
  }))

  // X-axis day markers
  const xTicks = [1, 6, 11, 16, 21, 26, daysInMonth]

  // Today dot (end of actual line)
  const todayDot = lastActual
    ? { cx: xPos(lastActual.day), cy: yPos(lastActual.cumSpend) }
    : null

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.titleMain}>Spending</span>
          <span className={styles.titleSub}>pace</span>
        </div>
        <div className={styles.periodChip}>
          <span className={styles.dayChip}>day {dayOfMonth} / {daysInMonth}</span>
          <span className={styles.monthChip}>{monthName}</span>
        </div>
      </div>

      {/* Big numbers */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>So Far</div>
          <div className={styles.statVal} style={{ color: statusColor }}>${fmt(spending)}</div>
          <div className={styles.statSub}>day {dayOfMonth}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Projected</div>
          <div className={styles.statVal} style={{ color: 'var(--warn)' }}>${fmt(projected)}</div>
          <div className={styles.statSub}>linear est.</div>
        </div>
        {lastMonthSpend > 0 && (
          <div className={styles.stat}>
            <div className={styles.statLabel}>Last Month</div>
            <div className={styles.statVal} style={{ color: 'var(--ink-2)' }}>${fmt(lastMonthSpend)}</div>
            <div className={styles.statSub}>reference</div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className={styles.chartWrap} ref={svgRef}>
        <svg width="100%" height={h} className={styles.svg}>
          <defs>
            <linearGradient id="pace-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--safe)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--safe)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines + labels */}
          {yTicks.map((t, i) => t.val > 0 && (
            <g key={i}>
              <line
                x1={PAD.left} y1={t.y.toFixed(1)}
                x2={PAD.left + chartW} y2={t.y.toFixed(1)}
                stroke="rgba(255,255,255,.05)" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={t.y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,.25)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {fmtK(t.val)}
              </text>
            </g>
          ))}

          {/* Last month dashed reference line */}
          {lastMonthSpend > 0 && (
            <path
              d={lastMonthLinePath}
              fill="none"
              stroke="rgba(255,255,255,.2)"
              strokeWidth="1"
              strokeDasharray="3,4"
            />
          )}

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#pace-area-grad)" />
          )}

          {/* Actual spend line */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="var(--safe)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className={styles.actualLine}
            />
          )}

          {/* Today vertical marker */}
          {todayDot && (
            <line
              x1={todayDot.cx.toFixed(1)} y1={PAD.top}
              x2={todayDot.cx.toFixed(1)} y2={PAD.top + chartH}
              stroke="rgba(255,255,255,.12)"
              strokeWidth="1"
              strokeDasharray="2,3"
            />
          )}

          {/* Projected dashed line */}
          {projPath && (
            <path
              d={projPath}
              fill="none"
              stroke="var(--warn)"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              strokeLinecap="round"
            />
          )}

          {/* Today dot */}
          {todayDot && (
            <>
              <circle cx={todayDot.cx} cy={todayDot.cy} r="5" fill="var(--bg-2)" stroke="var(--safe)" strokeWidth="2" />
              <circle cx={todayDot.cx} cy={todayDot.cy} r="2" fill="var(--safe)" />
            </>
          )}

          {/* X-axis labels */}
          {xTicks.map(d => (
            <text
              key={d}
              x={xPos(d).toFixed(1)}
              y={PAD.top + chartH + 16}
              textAnchor="middle"
              fill={d === dayOfMonth ? 'var(--safe)' : 'rgba(255,255,255,.25)'}
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              {d === dayOfMonth ? `${d}↑` : d}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="var(--safe)" strokeWidth="2" /></svg>
          <span>This month</span>
        </div>
        {lastMonthSpend > 0 && (
          <div className={styles.legendItem}>
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeDasharray="3,3" /></svg>
            <span>Last month</span>
          </div>
        )}
        <div className={styles.legendItem}>
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="3,3" /></svg>
          <span>Projected</span>
        </div>
      </div>
    </div>
  )
}
