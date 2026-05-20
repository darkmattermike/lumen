import { useState, useEffect, useRef } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './Insights.module.css'

const fmt  = n => Number(n||0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtD = n => Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const friendlyDate = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const shortDate    = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'

const TABS = [
  { id: 'dna',       label: '🧬 DNA',        title: 'Spending DNA' },
  { id: 'decisions', label: '📝 Decisions',  title: 'Decision Memory' },
  { id: 'networth',  label: '📈 Net Worth',  title: 'Net Worth Trajectory' },
  { id: 'bills',     label: '🧾 Bills',      title: 'Bill History' },
  { id: 'lifetime',  label: '⏳ Lifetime',   title: 'All-Time Stats' },
  { id: 'notifs',    label: '🔔 Alerts',     title: 'Alert Intelligence' },
]

// ── Spending DNA Tab ──────────────────────────────────────────────────────────
function DnaTab() {
  const [dnas, setDnas]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState(null)

  useEffect(() => {
    api.spendingDna().then(r => { setDnas(r.dnas); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function generate(force = false) {
    setGenerating(true)
    setGenError(null)
    try {
      const result = await api.generateDna(force)
      if (result?.error === 'NO_KEY') {
        setGenError('No API key configured. Add your Anthropic key in Settings.')
      } else {
        const r = await api.spendingDna()
        setDnas(r.dnas)
      }
    } catch (err) {
      setGenError(err.message || 'Generation failed. Check your API key in Settings.')
    }
    setGenerating(false)
  }

  const latest = dnas?.[0]
  const dna    = latest?.dna

  return (
    <div>
      {loading ? <div className={styles.loading}>Loading DNA…</div> : !latest ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyOrb}><LumenDot size={44} rings mood="thinking" /></div>
          <div className={styles.emptyTitle}>No DNA generated yet</div>
          <div className={styles.emptySub}>Lumen needs at least a month of transactions to build your financial personality profile.</div>
          <button className={styles.actionBtn} onClick={() => generate(false)} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Now'}
          </button>
          {genError && <div className={styles.dnaError}>{genError}</div>}
        </div>
      ) : (
        <>
          <div className={styles.dnaCard}>
            <div className={styles.dnaHeader}>
              <LumenDot size={22} mood="happy" />
              <div>
                <div className={styles.dnaTitle}>Your Spending DNA</div>
                <div className={styles.dnaSub}>{shortDate(latest.month_key + '-01')}</div>
              </div>
              <button className={styles.refreshSmall} onClick={() => generate(true)} disabled={generating} title="Regenerate">
                {generating ? <LumenDot size={10} mood="loading" /> : '↻'}
              </button>
            </div>
            <p className={styles.dnaNarrative}>{latest.narrative}</p>
          </div>

          {dna && (
            <div className={styles.dnaStats}>
              <div className={styles.statGrid}>
                {[
                  { label: 'Total Spent',    val: `$${fmt(dna.total_spend)}` },
                  { label: 'Top Category',   val: `${dna.top_category?.name} (${dna.top_category?.pct}%)` },
                  { label: 'Loyal To',       val: `${dna.top_merchant?.name} × ${dna.top_merchant?.visits}` },
                  { label: 'Busiest Day',    val: dna.most_expensive_day },
                  { label: 'Weekend Spend',  val: `${dna.weekend_ratio}% of total` },
                  { label: 'Subscriptions',  val: `${dna.subscription_count} active` },
                ].map(s => (
                  <div key={s.label} className={styles.statCell}>
                    <div className={styles.statVal}>{s.val}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              {dna.top_merchants?.length > 0 && (
                <div className={styles.dnaSection}>
                  <div className={styles.dnaSectionTitle}>Where your money actually goes</div>
                  {dna.top_merchants.map((m, i) => (
                    <div key={i} className={styles.merchantRow}>
                      <span className={styles.merchantRank}>#{i+1}</span>
                      <span className={styles.merchantName}>{m.name}</span>
                      <span className={styles.merchantVisits}>{m.visits}×</span>
                      <span className={styles.merchantTotal}>${fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {dnas.length > 1 && (
            <div className={styles.dnaPastList}>
              <div className={styles.dnaSectionTitle}>Previous months</div>
              {dnas.slice(1).map((d, i) => (
                <div key={i} className={styles.pastDnaRow}>
                  <span className={styles.pastDnaMonth}>{shortDate(d.month_key + '-01')}</span>
                  <span className={styles.pastDnaNarrative}>{d.narrative?.slice(0, 100)}…</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Decision Memory Tab ───────────────────────────────────────────────────────
function DecisionsTab() {
  const [data, setData]             = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [form, setForm]             = useState({ title: '', body: '', category: 'other', amount: '' })
  const [saving, setSaving]         = useState(false)
  const [outcomeId, setOutcomeId]   = useState(null)
  const [outcomeText, setOutcomeText] = useState('')

  useEffect(() => {
    api.decisions().then(setData).catch(() => {})
  }, [])

  async function addDecision() {
    setSaving(true)
    await api.createDecision({ ...form, amount: form.amount ? Number(form.amount) : null })
    const d = await api.decisions()
    setData(d); setShowAdd(false); setForm({ title: '', body: '', category: 'other', amount: '' })
    setSaving(false)
  }

  async function recordOutcome(id) {
    await api.decisionOutcome(id, { outcome: outcomeText })
    const d = await api.decisions(); setData(d); setOutcomeId(null); setOutcomeText('')
  }

  async function del(id) {
    await api.deleteDecision(id)
    const d = await api.decisions(); setData(d)
  }

  const CATS = ['debt', 'savings', 'spending', 'investment', 'other']
  const ICONS = { debt: '🔗', savings: '💰', spending: '🛒', investment: '📈', other: '📝' }

  if (!data) return <div className={styles.loading}>Loading…</div>

  const followUps = data.pending_followups || []

  return (
    <div>
      {followUps.length > 0 && (
        <div className={styles.followUpBanner}>
          <LumenDot size={14} mood="alert" />
          <div>
            <div className={styles.followUpTitle}>{followUps.length} decision{followUps.length > 1 ? 's' : ''} ready for follow-up</div>
            <div className={styles.followUpSub}>How did these actually play out?</div>
          </div>
        </div>
      )}

      <div className={styles.decisionToolbar}>
        <div className={styles.sectionLabel}>All Decisions</div>
        <button className={styles.actionBtn} onClick={() => setShowAdd(v => !v)}>
          {showAdd ? 'Cancel' : '+ Log Decision'}
        </button>
      </div>

      {showAdd && (
        <div className={styles.addCard}>
          <input className={styles.addInput} placeholder="What did you decide?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className={styles.addTextarea} placeholder="Context or reasoning (optional)" rows={2} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          <div className={styles.addRow}>
            <select className={styles.addSelect} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" className={styles.addInput} placeholder="$ amount (optional)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ maxWidth: 140 }} />
            <button className={styles.actionBtn} onClick={addDecision} disabled={saving || !form.title}>Save</button>
          </div>
        </div>
      )}

      {data.decisions.length === 0 ? (
        <div className={styles.emptyInline}>No decisions logged yet. Use this to track significant financial choices — paying off a debt, changing a budget, taking a new job.</div>
      ) : (
        <div className={styles.decisionList}>
          {data.decisions.map(d => (
            <div key={d.id} className={`${styles.decisionCard} ${!d.followed_up && d.follow_up_at && new Date(d.follow_up_at) <= new Date() ? styles.decisionFollowUp : ''}`}>
              <div className={styles.decisionHeader}>
                <span className={styles.decisionIcon}>{ICONS[d.category] || '📝'}</span>
                <div className={styles.decisionMeta}>
                  <div className={styles.decisionTitle}>{d.title}</div>
                  <div className={styles.decisionDate}>{friendlyDate(String(d.decided_at).slice(0,10))}</div>
                </div>
                {d.amount && <div className={styles.decisionAmount}>${fmt(d.amount)}</div>}
                <button className={styles.deleteBtn} onClick={() => del(d.id)}>×</button>
              </div>
              {d.body && <div className={styles.decisionBody}>{d.body}</div>}
              {d.outcome && <div className={styles.decisionOutcome}>📊 {d.outcome}</div>}
              {!d.followed_up && d.follow_up_at && new Date(d.follow_up_at) <= new Date() && (
                outcomeId === d.id ? (
                  <div className={styles.outcomeRow}>
                    <input className={styles.addInput} placeholder="How did this turn out?" value={outcomeText} onChange={e => setOutcomeText(e.target.value)} />
                    <button className={styles.actionBtnSm} onClick={() => recordOutcome(d.id)}>Save</button>
                    <button className={styles.cancelBtnSm} onClick={() => setOutcomeId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className={styles.followUpBtn} onClick={() => setOutcomeId(d.id)}>
                    Follow-up due — how did this go?
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Net Worth Tab ─────────────────────────────────────────────────────────────
function NetWorthTab() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.netWorth(12).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Building trajectory…</div>
  if (!data)   return null

  const { history, projection } = data
  const current = projection.currentNetWorth
  const isNeg   = current < 0
  const allPoints = [
    ...history.map(h => ({ date: String(h.snapshot_date).slice(0,7), val: Number(h.net_worth), projected: false })),
    ...projection.projectionPoints.slice(1, 13).map(p => ({ date: p.date, val: p.netWorth, projected: true })),
  ]

  // SVG mini chart
  const W = 500, H = 120, PAD = { t: 12, r: 12, b: 20, l: 52 }
  const vals = allPoints.map(p => p.val)
  const minV = Math.min(...vals, 0)
  const maxV = Math.max(...vals, 0)
  const rangeV = maxV - minV || 1
  const xs = allPoints.map((_, i) => PAD.l + (i / Math.max(allPoints.length - 1, 1)) * (W - PAD.l - PAD.r))
  const ys = allPoints.map(p => PAD.t + (H - PAD.t - PAD.b) - ((p.val - minV) / rangeV) * (H - PAD.t - PAD.b))
  const histLen = history.length
  const histPath = allPoints.slice(0, histLen).map((_, i) => `${i===0?'M':'L'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const projPath = allPoints.slice(Math.max(0, histLen - 1)).map((_, i) => {
    const idx = i + Math.max(0, histLen - 1)
    return `${i===0?'M':'L'}${xs[idx].toFixed(1)},${ys[idx].toFixed(1)}`
  }).join(' ')
  const zeroY = PAD.t + (H - PAD.t - PAD.b) - ((0 - minV) / rangeV) * (H - PAD.t - PAD.b)

  return (
    <div>
      <div className={styles.nwSummary}>
        <div className={styles.nwBig} style={{ color: isNeg ? 'var(--debt)' : 'var(--safe)' }}>
          {isNeg ? '−' : ''}${fmt(Math.abs(current))}
        </div>
        <div className={styles.nwLabel}>Current net worth</div>
        {projection.monthlyImprovement > 0 && (
          <div className={styles.nwRate}>+${fmt(projection.monthlyImprovement)}/month pace</div>
        )}
      </div>

      {allPoints.length > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.nwChart}>
          {minV < 0 && <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="var(--border)" strokeDasharray="3,3" strokeWidth="0.5" />}
          {history.length > 0 && <path d={histPath} fill="none" stroke="var(--safe)" strokeWidth="2" />}
          <path d={projPath} fill="none" stroke="var(--calm)" strokeWidth="1.5" strokeDasharray="4,3" />
          {xs.slice(0, histLen).map((x, i) => (
            <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="var(--safe)" />
          ))}
          <text x={PAD.l - 4} y={ys[0] + 4} fontSize="8" fill="var(--ink-3)" textAnchor="end">
            {isNeg ? '−' : ''}${fmt(Math.abs(allPoints[0]?.val || 0))}
          </text>
        </svg>
      )}

      {projection.milestones?.length > 0 && (
        <div className={styles.milestones}>
          <div className={styles.sectionLabel}>Upcoming Milestones</div>
          {projection.milestones.map((m, i) => (
            <div key={i} className={styles.milestoneRow}>
              <span className={styles.milestoneAmt}>${m.amount === 0 ? 'Zero' : fmt(m.amount)}</span>
              <div className={styles.milestoneLine} />
              <span className={styles.milestoneDate}>{m.label}</span>
              <span className={styles.milestoneMo}>{m.monthsNeeded}mo</span>
            </div>
          ))}
        </div>
      )}

      {projection.crossesZeroAt && (
        <div className={styles.crossZero}>
          📍 Net worth turns positive in <strong>{projection.crossesZeroAt} months</strong>
        </div>
      )}
    </div>
  )
}

// ── Bill History Tab ──────────────────────────────────────────────────────────
function BillsTab() {
  const [data, setData]     = useState(null)
  const [view, setView]     = useState('annual')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fn = view === 'annual' ? api.billHistoryAnnual : api.billHistory
    fn().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [view])

  if (loading) return <div className={styles.loading}>Scanning bills…</div>

  return (
    <div>
      <div className={styles.viewToggle}>
        <button className={`${styles.toggleBtn} ${view==='annual'?styles.toggleBtnOn:''}`} onClick={() => { setData(null); setLoading(true); setView('annual') }}>Year-over-Year</button>
        <button className={`${styles.toggleBtn} ${view==='history'?styles.toggleBtnOn:''}`} onClick={() => { setData(null); setLoading(true); setView('history') }}>Full History</button>
      </div>

      {view === 'annual' && data && (
        <>
          {data.summary && (
            <div className={styles.billSummary}>
              <div className={styles.statCell}>
                <div className={styles.statVal} style={{ color: data.summary.yoy_change > 0 ? 'var(--debt)' : 'var(--safe)' }}>
                  {data.summary.yoy_change > 0 ? '+' : ''}${fmt(data.summary.yoy_change)}
                </div>
                <div className={styles.statLabel}>YoY change</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statVal}>{data.summary.bills_increased}</div>
                <div className={styles.statLabel}>Bills went up</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statVal} style={{ color: 'var(--debt)' }}>+${fmt(data.summary.total_increase)}</div>
                <div className={styles.statLabel}>Total increase</div>
              </div>
            </div>
          )}
          <div className={styles.billList}>
            {(data.bills || []).map((b, i) => {
              const diff = Number(b.latest_this_year || 0) - Number(b.latest_last_year || 0)
              const pct  = Number(b.latest_last_year) > 0 ? Math.round((diff / Number(b.latest_last_year)) * 100) : 0
              return (
                <div key={i} className={styles.billRow}>
                  <div className={styles.billName}>{b.bill_name}</div>
                  <div className={styles.billAmts}>
                    <span className={styles.billLast}>${fmtD(b.latest_last_year)}</span>
                    <span className={styles.billArrow}>→</span>
                    <span className={styles.billCurrent} style={{ color: diff > 0.5 ? 'var(--debt)' : diff < -0.5 ? 'var(--safe)' : 'inherit' }}>
                      ${fmtD(b.latest_this_year)}
                    </span>
                    {Math.abs(diff) > 0.5 && (
                      <span className={styles.billDiff} style={{ color: diff > 0 ? 'var(--debt)' : 'var(--safe)' }}>
                        {diff > 0 ? '+' : ''}{pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {view === 'history' && data && (
        <div className={styles.billList}>
          {(data.bills || []).map((b, i) => (
            <div key={i} className={styles.billCard}>
              <div className={styles.billCardName}>{b.bill_name}</div>
              <div className={styles.billCardStats}>
                <span>${fmtD(b.avg_amount)} avg</span>
                <span>{b.occurrence_count}× recorded</span>
                <span>last {shortDate(String(b.last_seen).slice(0,10))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Lifetime Stats Tab ────────────────────────────────────────────────────────
function LifetimeTab() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.lifetimeStats().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Calculating lifetime stats…</div>
  if (!data)   return null

  const yearsTracked = data.days_tracked > 0 ? (data.days_tracked / 365).toFixed(1) : 0

  return (
    <div>
      <div className={styles.statGrid}>
        {[
          { label: 'Total Spent',      val: `$${fmt(data.total_spent)}`,    sub: 'all time' },
          { label: 'Total Income',     val: `$${fmt(data.total_income)}`,   sub: 'recorded' },
          { label: 'Transactions',     val: fmt(data.transaction_count),    sub: 'total' },
          { label: 'Years Tracked',    val: yearsTracked,                   sub: 'on Lumen' },
          { label: 'Daily Average',    val: `$${fmt(data.daily_avg)}`,      sub: 'spent/day' },
          { label: 'First Transaction',val: friendlyDate(String(data.first_date).slice(0,10)), sub: '' },
        ].map(s => (
          <div key={s.label} className={styles.statCell}>
            <div className={styles.statVal}>{s.val}</div>
            <div className={styles.statLabel}>{s.label}</div>
            {s.sub && <div className={styles.statSub}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className={styles.lifetimeSection}>
        <div className={styles.sectionLabel}>All-Time Top Merchants</div>
        {data.top_merchants.map((m, i) => (
          <div key={i} className={styles.lifetimeRow}>
            <span className={styles.lifeRank}>#{i+1}</span>
            <span className={styles.lifeName}>{m.name}</span>
            <span className={styles.lifeVisits}>{fmt(m.visits)}×</span>
            <span className={styles.lifeAmt}>${fmt(m.total)}</span>
          </div>
        ))}
      </div>

      <div className={styles.lifetimeSection}>
        <div className={styles.sectionLabel}>All-Time By Category</div>
        {data.top_categories.map((c, i) => {
          const pct = data.total_spent > 0 ? Math.round((c.total / data.total_spent) * 100) : 0
          return (
            <div key={i} className={styles.lifetimeRow}>
              <span className={styles.lifeName}>{c.name}</span>
              <div className={styles.lifeBar}>
                <div className={styles.lifeBarFill} style={{ width: `${pct}%` }} />
              </div>
              <span className={styles.lifeAmt}>${fmt(c.total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Notification Intelligence Tab ─────────────────────────────────────────────
function NotifsTab() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.notifSuppression().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function unsuppress(type) {
    await api.unsuppressNotif(type)
    const d = await api.notifSuppression(); setData(d)
  }

  if (loading) return <div className={styles.loading}>Analyzing alert patterns…</div>
  if (!data)   return null

  const { suppressed = [], stats = [] } = data

  const statMap = {}
  for (const s of stats) statMap[s.notification_type] = s

  return (
    <div>
      <p className={styles.notifExplain}>
        Lumen tracks which alerts you open vs dismiss and quietly stops sending types you never engage with. You can always re-enable them here.
      </p>

      {suppressed.length > 0 && (
        <div className={styles.suppressedList}>
          <div className={styles.sectionLabel}>Currently Muted</div>
          {suppressed.map(s => (
            <div key={s.notification_type} className={styles.suppressedRow}>
              <div>
                <div className={styles.suppressedType}>{s.notification_type.replace(/_/g, ' ')}</div>
                <div className={styles.suppressedReason}>{
                  s.suppress_reason === 'always_dismissed' ? 'You always dismiss these' :
                  s.suppress_reason === 'low_open_rate'    ? 'You never open these' :
                  s.suppress_reason
                }</div>
              </div>
              <button className={styles.unsuppressBtn} onClick={() => unsuppress(s.notification_type)}>
                Re-enable
              </button>
            </div>
          ))}
        </div>
      )}

      {stats.length > 0 && (
        <div className={styles.statsList}>
          <div className={styles.sectionLabel}>Your Alert Engagement (last 60 days)</div>
          {stats.map(s => {
            const openRate = Number(s.total) > 0 ? Math.round((Number(s.opened) + Number(s.acted)) / Number(s.total) * 100) : 0
            return (
              <div key={s.notification_type} className={styles.statsRow}>
                <div className={styles.statsType}>{s.notification_type.replace(/_/g, ' ')}</div>
                <div className={styles.statsBar}>
                  <div className={styles.statsBarFill} style={{ width: `${openRate}%`, background: openRate >= 50 ? 'var(--safe)' : openRate >= 25 ? 'var(--warn)' : 'var(--debt)' }} />
                </div>
                <div className={styles.statsPct}>{openRate}% engaged</div>
                <div className={styles.statsCount}>{s.total} sent</div>
              </div>
            )
          })}
        </div>
      )}

      {stats.length === 0 && suppressed.length === 0 && (
        <div className={styles.emptyInline}>No engagement data yet. Lumen will start learning your preferences after a few weeks of notifications.</div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const [activeTab, setActiveTab] = useState('dna')
  const current = TABS.find(t => t.id === activeTab)

  return (
    <ScreenWrap>
      <div className={styles.page}>
        <div className={styles.header}>
          <LumenDot size={28} mood="happy" />
          <div>
            <div className={styles.pageTitle}>{current.title}</div>
            <div className={styles.pageSub}>Long-term financial intelligence</div>
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === 'dna'       && <DnaTab />}
          {activeTab === 'decisions' && <DecisionsTab />}
          {activeTab === 'networth'  && <NetWorthTab />}
          {activeTab === 'bills'     && <BillsTab />}
          {activeTab === 'lifetime'  && <LifetimeTab />}
          {activeTab === 'notifs'    && <NotifsTab />}
        </div>
      </div>
    </ScreenWrap>
  )
}
