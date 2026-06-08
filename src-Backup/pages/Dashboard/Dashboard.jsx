import { useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useCountUp } from '../../hooks/useCountUp'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../data/api'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import styles from './Dashboard.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Nocturne dashboard
   Aurora hero ("safe to spend today") + cash-flow runway +
   upcoming horizon + recent activity, wired to the live backend.
   ────────────────────────────────────────────────────────────── */

const PAST_DAYS   = 8       // actual days shown left of "now"
const FUTURE_DAYS = 22      // projected days shown right of "now"
const SPAN        = PAST_DAYS + FUTURE_DAYS          // 30-day window
const PADX = 4, TOP = 10, BOT = 82                   // chart % insets

/* ---- formatting helpers ---- */
const n0   = (n) => Math.round(Number(n) || 0).toLocaleString('en-US')
const n2   = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dayStr = (d) => {                              // local YYYY-MM-DD
  const z = new Date(d)
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`
}
const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d }
const shortDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const weekday   = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })

// split a money value into animated integer dollars + static cents
function centsPair(v) {
  let dollars = Math.floor(Math.abs(Number(v) || 0))
  let cents   = Math.round((Math.abs(Number(v) || 0) - dollars) * 100)
  if (cents === 100) { dollars += 1; cents = 0 }
  return { dollars, cc: String(cents).padStart(2, '0') }
}

// deterministic gradient avatar from a merchant name
const AV_GRADS = [
  'linear-gradient(150deg,#3a8f5e,#1f6b3e)', 'linear-gradient(150deg,#3f6bd8,#2746a0)',
  'linear-gradient(150deg,#c0407a,#8a2856)', 'linear-gradient(150deg,#3aa089,#1f6f5e)',
  'linear-gradient(150deg,#8a6bd8,#5a3aa0)', 'linear-gradient(150deg,#c98a3a,#8a5a1f)',
]
const avGrad = (s) => AV_GRADS[[...String(s || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_GRADS.length]

/* ---- greeting ---- */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, error } = useApi(api.dashboard)
  const { data: txData }         = useApi(() => api.transactions('?limit=40'))
  const { data: forecast }       = useApi(() => api.forecast(FUTURE_DAYS + 4))

  /* ── derive hero figures from live data (safe-to-spend = plug point) ── */
  const hero = useMemo(() => {
    const d = data || {}
    const windows  = d.windows || []
    const w0       = windows[0] || null
    const nextPay  = w0?.nextPay || d.nextPaycheck || null
    const daysToPay = nextPay?.daysUntil ?? null
    const heroBalance = (Array.isArray(d.activePlans) && d.activePlans.length)
      ? (d.balanceAfterPlans ?? d.freeToSpend ?? 0)
      : (d.freeToSpend ?? 0)
    const daysLeft = Math.max(1, daysToPay ?? 14)
    const dailyAllowance = Math.max(0, heroBalance / daysLeft)

    // spent today (today's expenses)
    const all = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
    const todayKey = dayStr(new Date())
    const spentToday = all.reduce((s, t) => {
      const amt = Number(t.amount) || 0
      const isExpense = (t.tx_type !== 'income') && amt < 0
      return (String(t.date).slice(0, 10) === todayKey && isExpense) ? s + Math.abs(amt) : s
    }, 0)

    // ▶▶ FUTURE CUSTOM ALGORITHM PLUGS IN HERE ◀◀
    // For now: a day's slice of remaining free-to-spend, minus what's already spent today.
    const safeToday = Math.max(0, dailyAllowance - spentToday)

    const label = d.pressureLabel || 'SAFE'
    const tag = label === 'CRITICAL' ? 'Pressure is high'
      : label === 'TIGHT' ? 'Spending is tight'
      : label === 'WATCH' ? 'On track'
      : "You're ahead of plan"

    return {
      safeToday, dailyAllowance, spentToday, heroBalance,
      daysToPay, nextPay, balance: d.balance ?? 0, tag, label,
      monthSpent: d.monthSpent ?? 0, monthIncome: d.monthIncome ?? 0,
    }
  }, [data, txData])

  /* ── upcoming horizon (already curated by the API) ── */
  const upcoming = useMemo(() => {
    const bills = (data?.upcomingBills || []).slice(0, 4)
    return bills.map(b => {
      const when = b.daysUntil === 0 ? 'Today' : `In ${b.daysUntil} day${b.daysUntil === 1 ? '' : 's'}`
      const dt   = addDays(new Date(), b.daysUntil || 0)
      const income = b.type === 'income'
      return {
        id: b.id, name: b.name, income,
        when: `${when} · ${weekday(dt)}`,
        cat: income ? 'Income' : (b.category || 'Bill'),
        amt: `${income ? '+' : '−'}$${n2(b.amount)}`,
      }
    })
  }, [data])

  const netBeforePay = useMemo(() => {
    const dtp = hero.daysToPay
    if (dtp == null) return null
    const bills = (data?.upcomingBills || []).filter(b => (b.daysUntil ?? 99) <= dtp)
    return bills.reduce((s, b) => s + (b.type === 'income' ? Number(b.amount) : -Number(b.amount)), 0)
  }, [data, hero.daysToPay])

  /* ── recent activity ── */
  const recent = useMemo(() => {
    const all = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
    const seen = new Set()
    return all
      .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 4)
      .map(t => {
        const amt = Number(t.amount) || 0
        const income = t.tx_type === 'income' || amt > 0
        const nm = t.cleaned_name || t.name || 'Transaction'
        return {
          id: t.id, nm, income,
          cat: `${t.category || (income ? 'Income' : 'Spending')} · ${shortDate(t.date)}`,
          amt: `${income ? '+' : '−'}$${n2(Math.abs(amt))}`,
          grad: avGrad(nm), initial: nm[0]?.toUpperCase() || '•',
        }
      })
  }, [txData])

  /* ── cash-flow runway: reconstruct past actual + projected future ── */
  const runway = useMemo(() => {
    const today = new Date()
    const startBalance = (forecast?.startBalance != null ? forecast.startBalance : (data?.balance ?? 0))

    // net change per day from transactions (signed)
    const all = [...(txData?.currentMonth || []), ...(txData?.historical || [])]
    const netByDay = {}
    for (const t of all) {
      const k = String(t.date).slice(0, 10)
      netByDay[k] = (netByDay[k] || 0) + (Number(t.amount) || 0)
    }
    // projected balance per future date
    const fcByDay = {}
    for (const p of (forecast?.points || [])) fcByDay[String(p.date).slice(0, 10)] = Number(p.balance)

    // walk past: value(today)=startBalance, value(d-1)=value(d)-net(d)
    const valueAt = {}
    valueAt[dayStr(today)] = startBalance
    let bal = startBalance
    for (let i = 1; i <= PAST_DAYS; i++) {
      const laterKey = dayStr(addDays(today, -(i - 1)))
      bal = bal - (netByDay[laterKey] || 0)
      valueAt[dayStr(addDays(today, -i))] = bal
    }
    // future from forecast (carry forward if a day is missing)
    let last = startBalance
    for (let i = 1; i <= FUTURE_DAYS; i++) {
      const k = dayStr(addDays(today, i))
      last = (fcByDay[k] != null) ? fcByDay[k] : last
      valueAt[k] = last
    }

    // assemble series index 0..SPAN  (index PAST_DAYS = today)
    const series = []
    for (let i = 0; i <= SPAN; i++) {
      const dt = addDays(today, i - PAST_DAYS)
      series.push({ i, key: dayStr(dt), date: dt, value: valueAt[dayStr(dt)] ?? startBalance, future: i > PAST_DAYS })
    }
    const vals = series.map(s => s.value)
    const min = Math.min(...vals), max = Math.max(...vals), rng = (max - min) || 1
    const X = (i) => PADX + (i / SPAN) * (100 - 2 * PADX)
    const Y = (v) => TOP + (1 - (v - min) / rng) * (BOT - TOP)

    // markers — recent (past) + upcoming (future)
    const markers = []
    const past = all
      .filter(t => { const amt = Number(t.amount) || 0; return (t.tx_type !== 'income') && amt < 0 })
      .filter(t => { const k = String(t.date).slice(0, 10); return k <= dayStr(today) && k > dayStr(addDays(today, -PAST_DAYS)) })
      .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
    const usedDays = new Set()
    for (const t of past) {
      const k = String(t.date).slice(0, 10)
      if (usedDays.has(k)) continue
      const idx = series.findIndex(s => s.key === k)
      if (idx < 0) continue
      usedDays.add(k)
      const nm = t.cleaned_name || t.name || 'Spend'
      markers.push({ x: X(idx), y: Y(series[idx].value), name: nm, amt: `−$${n2(Math.abs(Number(t.amount)))}`, cls: '', below: true })
      if (markers.length >= 2) break
    }
    for (const b of (data?.upcomingBills || []).slice(0, 4)) {
      const di = b.daysUntil ?? -1
      if (di < 1 || di > FUTURE_DAYS) continue
      const idx = PAST_DAYS + di
      const income = b.type === 'income'
      markers.push({
        x: X(idx), y: Y(series[idx]?.value ?? startBalance),
        name: b.name, amt: `${income ? '+' : '−'}$${n0(b.amount)}`,
        cls: income ? 'pos' : 'bill', below: !income,
      })
    }

    // axis ticks
    const tickIdx = [0, PAST_DAYS, Math.min(SPAN, PAST_DAYS + 7), Math.min(SPAN, PAST_DAYS + 14), SPAN]
    const ticks = [...new Set(tickIdx)].map(i => ({
      x: X(i), label: i === PAST_DAYS ? shortDate(today) : shortDate(series[i].date), now: i === PAST_DAYS,
    }))

    return {
      series, markers, ticks,
      nowX: X(PAST_DAYS), nowY: Y(series[PAST_DAYS].value),
      min, max, X, Y,
    }
  }, [data, txData, forecast])

  /* ── aurora canvas + parallax ── */
  const heroRef = useRef(null)
  const auroraRef = useRef(null)
  const bloomRef = useRef(null)
  useEffect(() => {
    const cv = auroraRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let raf, w = 0, h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = () => { const r = cv.getBoundingClientRect(); w = cv.width = Math.max(1, r.width * dpr); h = cv.height = Math.max(1, r.height * dpr) }
    size()
    const ro = new ResizeObserver(size); ro.observe(cv)
    const ribbons = [
      { base: .46, amp: .10, wl: .0042, sp: .00020, ph: 0,   th: .34, c: ['rgba(94,240,214,0)', 'rgba(94,240,214,.9)', 'rgba(70,180,230,0)'] },
      { base: .52, amp: .13, wl: .0031, sp: -.00015, ph: 2.1, th: .40, c: ['rgba(120,150,255,0)', 'rgba(140,150,255,.8)', 'rgba(90,200,255,0)'] },
      { base: .50, amp: .085, wl: .0055, sp: .00027, ph: 4.0, th: .26, c: ['rgba(167,139,255,0)', 'rgba(180,150,255,.75)', 'rgba(255,150,210,0)'] },
      { base: .58, amp: .16, wl: .0024, sp: .00012, ph: 1.0, th: .30, c: ['rgba(60,200,180,0)', 'rgba(70,210,200,.55)', 'rgba(120,160,255,0)'] },
    ]
    const wave = (r, x, t) => (r.base + Math.sin(x * r.wl + t * r.sp + r.ph) * r.amp + Math.sin(x * r.wl * .5 + t * r.sp * 1.7 + r.ph * 1.3) * r.amp * .45) * h
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'
      for (const r of ribbons) {
        const th = r.th * h, step = Math.max(8, w / 120)
        ctx.beginPath(); ctx.moveTo(0, wave(r, 0, t) - th / 2)
        for (let x = 0; x <= w; x += step) ctx.lineTo(x, wave(r, x, t) - th / 2)
        for (let x = w; x >= 0; x -= step) ctx.lineTo(x, wave(r, x, t) + th / 2)
        ctx.closePath()
        const g = ctx.createLinearGradient(0, 0, w, 0)
        g.addColorStop(0, r.c[0]); g.addColorStop(.5, r.c[1]); g.addColorStop(1, r.c[2])
        ctx.fillStyle = g; ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  useEffect(() => {
    const hero = heroRef.current, cv = auroraRef.current, bl = bloomRef.current
    if (!hero) return
    const move = (e) => {
      const r = hero.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5
      if (cv) cv.style.transform = `translate(${x * 18}px,${y * 14}px) scale(1.06)`
      if (bl) bl.style.transform = `translate(${-50 + x * 4}%,${-54 + y * 4}%)`
    }
    const leave = () => { if (cv) cv.style.transform = ''; if (bl) bl.style.transform = '' }
    hero.addEventListener('mousemove', move); hero.addEventListener('mouseleave', leave)
    return () => { hero.removeEventListener('mousemove', move); hero.removeEventListener('mouseleave', leave) }
  }, [])

  /* ── runway SVG paths in true pixel space (round strokes, no distortion) ── */
  const chartBoxRef = useRef(null)
  const svgRef = useRef(null)
  const pastRef = useRef(null)
  const futRef = useRef(null)
  const areaRef = useRef(null)
  const gridRef = useRef(null)
  const cursorRef = useRef(null)
  const cursorDotRef = useRef(null)
  const tipRef = useRef(null)
  const tipDRef = useRef(null)
  const tipVRef = useRef(null)
  const drawnRef = useRef(false)

  useEffect(() => {
    const box = chartBoxRef.current, svg = svgRef.current
    if (!box || !svg || !runway.series.length) return
    drawnRef.current = false
    const smooth = (p) => {
      if (p.length < 2) return ''
      let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c
        const c1x = b.x + (c.x - a.x) / 6, c1y = b.y + (c.y - a.y) / 6
        const c2x = c.x - (e.x - b.x) / 6, c2y = c.y - (e.y - b.y) / 6
        d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
      }
      return d
    }
    const layout = () => {
      const W = box.clientWidth, H = box.clientHeight
      if (!W || !H) return
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      const padX = W * .04, top = H * .10, bot = H * .82
      const vals = runway.series.map(s => s.value)
      const min = Math.min(...vals), max = Math.max(...vals), rng = (max - min) || 1
      const X = (i) => padX + (i / SPAN) * (W - 2 * padX)
      const Y = (v) => top + (1 - (v - min) / rng) * (bot - top)
      const pts = runway.series.map(s => ({ x: X(s.i), y: Y(s.value) }))
      const pastP = pts.slice(0, PAST_DAYS + 1), futureP = pts.slice(PAST_DAYS)
      pastRef.current.setAttribute('d', smooth(pastP))
      futRef.current.setAttribute('d', smooth(futureP))
      areaRef.current.setAttribute('d', `${smooth(pastP)} L ${X(PAST_DAYS).toFixed(1)} ${(bot + 10).toFixed(1)} L ${X(0).toFixed(1)} ${(bot + 10).toFixed(1)} Z`)
      let g = ''
      for (let k = 0; k <= 3; k++) { const y = (top + (bot - top) * k / 3).toFixed(1); g += `<line x1="${padX.toFixed(1)}" y1="${y}" x2="${(W - padX).toFixed(1)}" y2="${y}" stroke="rgba(170,185,255,.06)" stroke-width="1"/>` }
      gridRef.current.innerHTML = g
      if (!drawnRef.current) {
        drawnRef.current = true
        const len = pastRef.current.getTotalLength()
        pastRef.current.style.strokeDasharray = len
        pastRef.current.style.strokeDashoffset = len
        pastRef.current.getBoundingClientRect()
        pastRef.current.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.3,.7,.2,1)'
        pastRef.current.style.strokeDashoffset = 0
      } else {
        pastRef.current.style.strokeDasharray = 'none'
        pastRef.current.style.strokeDashoffset = 0
      }
    }
    layout()
    const ro = new ResizeObserver(layout); ro.observe(box)
    return () => ro.disconnect()
  }, [runway])

  /* hover scrub */
  const onChartMove = (e) => {
    const box = chartBoxRef.current
    if (!box || !runway.series.length) return
    const r = box.getBoundingClientRect()
    let p = ((e.clientX - r.left) / r.width) * 100
    p = Math.max(PADX, Math.min(100 - PADX, p))
    let idx = Math.round(((p - PADX) / (100 - 2 * PADX)) * SPAN)
    idx = Math.max(0, Math.min(SPAN, idx))
    const s = runway.series[idx]
    const x = runway.X(idx) + '%', y = runway.Y(s.value) + '%'
    if (cursorRef.current) { cursorRef.current.style.left = x; cursorRef.current.style.opacity = 1 }
    if (cursorDotRef.current) { cursorDotRef.current.style.left = x; cursorDotRef.current.style.top = y; cursorDotRef.current.style.opacity = 1 }
    if (tipRef.current) { tipRef.current.style.left = x; tipRef.current.style.top = y; tipRef.current.style.opacity = 1 }
    if (tipDRef.current) tipDRef.current.textContent = (idx === PAST_DAYS ? 'TODAY' : shortDate(s.date).toUpperCase()) + (idx > PAST_DAYS ? ' · PROJECTED' : '')
    if (tipVRef.current) tipVRef.current.textContent = '$' + n0(s.value)
  }
  const onChartLeave = () => {
    for (const r of [cursorRef, cursorDotRef, tipRef]) if (r.current) r.current.style.opacity = 0
  }

  /* hero count-up (animate integer dollars, static cents) */
  const { dollars, cc } = centsPair(hero.safeToday)
  const heroDollars = useCountUp(dollars, { duration: 1200, easing: 'cubic' }).display
  const meterFill = hero.dailyAllowance > 0 ? Math.min(100, Math.round((hero.spentToday / hero.dailyAllowance) * 100)) : 0

  if (loading && !data) return <LoadingShell />
  if (error) return <ErrorShell message={error} />

  const firstName = (user?.name || '').trim().split(' ')[0]

  return (
    <div className={styles.dash}>
      <div className={styles.grain} />
      <div className={styles.vignette} />

      {/* ── top bar ── */}
      <div className={styles.topbar}>
        <div className={styles.greet}>
          <div className={styles.hi}>{greeting()}{firstName ? `, ${firstName}.` : '.'}</div>
          <div className={styles.sub}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className={styles.topright}>
          <div className={styles.bal}>
            <div className={styles.balL}>Available balance</div>
            <div className={styles.balV}>${n2(hero.balance)}</div>
          </div>
          <button className={styles.search} aria-label="Search" onClick={() => navigate('/transactions')}>
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          </button>
        </div>
      </div>

      {/* ── 2×2 grid: hero / runway (left) · upcoming / recent (right) ── */}
      <div className={styles.grid}>

        {/* HERO */}
        <section className={styles.hero} ref={heroRef}>
          <canvas className={styles.heroCanvas} ref={auroraRef} />
          <div className={styles.bloom} ref={bloomRef} />
          <div className={styles.edge} />
          <div className={styles.textscrim} />
          <div className={styles.hcontent}>
            <div className={styles.htop}>
              <span className={styles.htag}><span className={styles.htagDot} />{hero.tag}</span>
              <span className={styles.hdate}>
                Daily allowance{hero.daysToPay != null ? ` · ${hero.daysToPay}d to payday` : ''}
              </span>
            </div>
            <div className={styles.hcenter}>
              <div className={styles.hkick}>Safe to spend today</div>
              <div className={styles.amount}>
                <span className={styles.cur}>$</span>
                <span className={styles.int}>{heroDollars}</span>
                <span className={styles.dec}>.{cc}</span>
              </div>
              <div className={styles.hsub}>After rent, bills and your savings pace — this is genuinely yours.</div>
              <div className={styles.meter}>
                <div className={styles.meterRow}>
                  <span>Spent today <b>${n2(hero.spentToday)}</b></span>
                  <span><b>${n2(hero.safeToday)}</b> of ${n0(hero.dailyAllowance)} left</span>
                </div>
                <div className={styles.bar}><div className={styles.fill} style={{ '--fill': `${meterFill}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        {/* RUNWAY */}
        <section className={styles.runway}>
          <div className={styles.chead}>
            <h3>Cash flow runway</h3>
            <div className={styles.leg}>
              <span><i className={styles.legLine} />Actual</span>
              <span><i className={`${styles.legLine} ${styles.legProj}`} />Projected</span>
            </div>
          </div>
          <div className={styles.chartbox} ref={chartBoxRef} onMouseMove={onChartMove} onMouseLeave={onChartLeave}>
            <svg className={styles.svg} ref={svgRef} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="lumLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#6ff4dd" /><stop offset=".55" stopColor="#5aa6ff" /><stop offset="1" stopColor="#a78bff" />
                </linearGradient>
                <linearGradient id="lumFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(94,240,214,.26)" /><stop offset="1" stopColor="rgba(94,240,214,0)" />
                </linearGradient>
              </defs>
              <g ref={gridRef} />
              <path ref={areaRef} fill="url(#lumFillGrad)" stroke="none" />
              <path ref={futRef} fill="none" stroke="#a78bff" strokeWidth="1.6" strokeDasharray="1 7" strokeLinecap="round" opacity=".6" />
              <path ref={pastRef} fill="none" stroke="url(#lumLineGrad)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>

            <div className={styles.overlay}>
              <div className={styles.nowline} style={{ left: `${runway.nowX}%` }} />
              <div className={styles.nowtag} style={{ left: `${runway.nowX}%`, top: `${runway.nowY}%` }}>Now</div>
              {runway.markers.map((m, i) => (
                <div key={i}>
                  <div
                    className={`${styles.dot} ${m.cls === 'bill' ? styles.bill : ''} ${m.cls === 'pos' ? styles.pos : ''}`}
                    style={{ left: `${m.x}%`, top: `${m.y}%`, animationDelay: `${.7 + i * .1}s` }}
                  />
                  <div
                    className={`${styles.lab} ${m.cls === 'pos' ? styles.labPos : ''}`}
                    style={{ left: `${m.x}%`, top: `${m.below ? m.y + 5 : m.y - 15}%`, animationDelay: `${.8 + i * .1}s` }}
                  >
                    <div className={styles.labLine}>{m.name}</div>
                    <div className={styles.labVal}>{m.amt}</div>
                  </div>
                </div>
              ))}
              <div className={`${styles.dot} ${styles.now}`} style={{ left: `${runway.nowX}%`, top: `${runway.nowY}%`, animationDelay: '.6s' }} />
              <div className={styles.axis}>
                {runway.ticks.map((t, i) => (
                  <div key={i} className={`${styles.axtick} ${t.now ? styles.axtickNow : ''}`} style={{ left: `${t.x}%` }}>{t.label}</div>
                ))}
              </div>
            </div>

            <div className={styles.cursor} ref={cursorRef} />
            <div className={styles.cursordot} ref={cursorDotRef} />
            <div className={styles.tip} ref={tipRef}>
              <div className={styles.tipD} ref={tipDRef} />
              <div className={styles.tipV} ref={tipVRef} />
            </div>
          </div>
        </section>

        {/* UPCOMING */}
        <aside className={styles.up}>
          <div className={styles.phead}>
            <h3>On the horizon</h3>
            <span className={styles.more} onClick={() => navigate('/calendar')}>Calendar →</span>
          </div>
          <div className={styles.tl}>
            {upcoming.length ? upcoming.map(ev => (
              <div key={ev.id} className={`${styles.ev} ${ev.income ? styles.pay : ''}`}>
                <span className={styles.node} />
                <div className={styles.when}>{ev.when}</div>
                <div className={styles.line}>
                  <span className={styles.nm}>{ev.name}</span>
                  <span className={styles.evAmt}>{ev.amt}</span>
                </div>
                <div className={styles.cat}>{ev.cat}</div>
              </div>
            )) : <div className={styles.empty}>Nothing scheduled.</div>}
          </div>
          {netBeforePay != null && (
            <div className={styles.upfoot}>
              <span>Net before payday</span>
              <b>{netBeforePay >= 0 ? '+' : '−'}${n2(Math.abs(netBeforePay))}</b>
            </div>
          )}
        </aside>

        {/* RECENT */}
        <section className={styles.recent}>
          <div className={`${styles.phead} ${styles.pheadR}`}>
            <h3>Recent activity</h3>
            <span className={styles.more} onClick={() => navigate('/transactions')}>View ledger →</span>
          </div>
          <div className={styles.feed}>
            {recent.length ? recent.map((t, i) => (
              <div key={t.id} className={styles.fi} style={{ animationDelay: `${.55 + i * .11}s` }}>
                <div className={styles.av} style={{ background: t.grad }}>{t.initial}</div>
                <div>
                  <div className={styles.fnm}>{t.nm}</div>
                  <div className={styles.fcat}>{t.cat}</div>
                </div>
                <div className={styles.famt} style={t.income ? { color: 'var(--lum-mint)' } : undefined}>{t.amt}</div>
              </div>
            )) : <div className={styles.empty}>No recent transactions.</div>}
          </div>
        </section>

      </div>
    </div>
  )
}
