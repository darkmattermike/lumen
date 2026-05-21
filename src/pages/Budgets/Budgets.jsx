import { useState, useEffect } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import AnimatedBar from '../../components/AnimatedBar/AnimatedBar'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Budgets.module.css'

function fmt(n)  { return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtK(n) { return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}) }

const COLOR_MAP = {
  debt:'var(--debt)', warn:'var(--warn)', safe:'var(--safe)',
  calm:'var(--calm)', goal:'var(--goal)', pink:'#e87fa3',
  orange:'#f07a3a', sky:'#5bc4e8', lime:'#8ecf4a', gold:'#d4a017',
}
const COLOR_OPTS = [
  {value:'safe',  label:'Green',  swatch:'var(--safe)'},
  {value:'calm',  label:'Blue',   swatch:'var(--calm)'},
  {value:'goal',  label:'Purple', swatch:'var(--goal)'},
  {value:'warn',  label:'Amber',  swatch:'var(--warn)'},
  {value:'debt',  label:'Red',    swatch:'var(--debt)'},
  {value:'pink',  label:'Pink',   swatch:'#e87fa3'},
  {value:'orange',label:'Orange', swatch:'#f07a3a'},
  {value:'sky',   label:'Sky',    swatch:'#5bc4e8'},
  {value:'lime',  label:'Lime',   swatch:'#8ecf4a'},
  {value:'gold',  label:'Gold',   swatch:'#d4a017'},
]
const ICON_OPTS = ['🏠','🍽️','🛒','🚗','📱','🎮','🏋️','✈️','💊','🐾','👗','📚','🎵','☕','🍺','💅','🔧','🎁','📦','🎓','💒','🌿','🎬','🏥','⚡']

const today       = new Date()
const daysInMonth = new Date(today.getFullYear(),today.getMonth()+1,0).getDate()
const daysLeft    = daysInMonth - today.getDate()
const monthName   = today.toLocaleString('en-US',{month:'long'})

// ── Spending pace sparkline (SVG) ────────────────────────────
function SparkLine({ history, cap, color, id }) {
  if (!history || history.length < 2) return null
  const W = 280, H = 80, pad = 12
  const max    = Math.max(cap, ...history.map(h => h.spent)) * 1.1 || 1
  const pts    = history.map((h, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2)
    const y = H - pad - (h.spent / max) * (H - pad * 2)
    return `${x},${y}`
  })
  const capY   = H - pad - (cap / max) * (H - pad * 2)
  const path   = `M ${pts.join(' L ')}`
  const fill   = `M ${pts[0]} L ${pts.join(' L ')} L ${pts[pts.length-1].split(',')[0]},${H-pad} L ${pad},${H-pad} Z`
  const gradId = `sg-${id}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.sparkSvg} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Cap line */}
      <line x1={pad} y1={capY} x2={W-pad} y2={capY} stroke="rgba(255,255,255,.15)" strokeWidth="1" strokeDasharray="4,4"/>
      <text x={pad+2} y={capY-3} fill="rgba(255,255,255,.3)" fontSize="7" fontFamily="monospace">cap</text>
      {/* Fill */}
      <path d={fill} fill={`url(#${gradId})`}/>
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots */}
      {history.map((h, i) => {
        const [x, y] = pts[i].split(',')
        return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="var(--bg-2)" strokeWidth="1.5"/>
      })}
      {/* Month labels */}
      {history.map((h, i) => {
        const x = pad + (i / (history.length - 1)) * (W - pad * 2)
        return <text key={i} x={x} y={H-1} fill="rgba(255,255,255,.3)" fontSize="7" fontFamily="monospace" textAnchor="middle">{h.month}</text>
      })}
    </svg>
  )
}

// ── Stats panel (shared mobile sheet + desktop drawer) ────────
function CategoryStats({ cat, color, isOver, txs, loadingTx, history, loadingHistory, editForm, setEF, editing, setEditing, saving, handleSaveEdit, onDelete, handleComplete, isDone, toggling }) {
  const pct      = Math.min(cat.pct, 100)
  const daysInMo = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()
  const daysPassed = today.getDate()
  const idealPace = cat.cap ? (daysPassed / daysInMo) * cat.cap : 0
  const paceVsIdeal = cat.spent - idealPace
  const dailyAvg  = cat.spent / Math.max(daysPassed, 1)
  const projectedEOM = dailyAvg * daysInMo

  return (
    <div className={styles.statsPanel}>
      {/* Progress bar */}
      <div className={styles.statBarRow}>
        <div className={styles.statBarLabel}>
          <span>{cat.pct}% used</span>
          <span style={{color: isOver ? 'var(--debt)' : 'var(--ink-3)'}}>
            {isOver ? `$${fmt(cat.spent - cat.cap)} over cap` : `$${fmt(cat.cap - cat.spent)} remaining`}
          </span>
        </div>
        <div className={styles.statBarTrack}>
          <div className={styles.statBarFill} style={{width:`${pct}%`, background: color}}/>
          {/* Ideal pace marker */}
          <div className={styles.paceMark} style={{left:`${Math.min((daysPassed/daysInMo)*100,100)}%`}}/>
        </div>
        <div className={styles.statBarSub}>
          <span style={{color:'rgba(255,255,255,.3)'}}>▲ ideal pace</span>
        </div>
      </div>

      {/* Key stats row */}
      <div className={styles.statKpis}>
        <div className={styles.statKpi}>
          <div className={styles.statKpiVal} style={{color}}>${fmt(cat.spent)}</div>
          <div className={styles.statKpiLabel}>Spent</div>
        </div>
        <div className={styles.statKpi}>
          <div className={styles.statKpiVal}>${fmtK(cat.cap)}</div>
          <div className={styles.statKpiLabel}>Cap</div>
        </div>
        <div className={styles.statKpi}>
          <div className={styles.statKpiVal} style={{color: paceVsIdeal > 0 ? 'var(--debt)' : 'var(--safe)'}}>
            {paceVsIdeal > 0 ? '+' : ''}${fmt(Math.abs(paceVsIdeal))}
          </div>
          <div className={styles.statKpiLabel}>{paceVsIdeal > 0 ? 'Ahead of pace' : 'Under pace'}</div>
        </div>
        <div className={styles.statKpi}>
          <div className={styles.statKpiVal} style={{color: projectedEOM > cat.cap ? 'var(--debt)' : 'var(--safe)'}}>
            ${fmtK(projectedEOM)}
          </div>
          <div className={styles.statKpiLabel}>Proj. EOM</div>
        </div>
      </div>

      {/* 6-month sparkline */}
      <div className={styles.sparkSection}>
        <div className={styles.sparkLabel}>6-Month Spending</div>
        {loadingHistory ? (
          <div className={styles.sparkLoading}>Loading...</div>
        ) : (
          <SparkLine history={history} cap={cat.cap} color={color} id={cat.id}/>
        )}
        {history && history.length > 1 && (
          <div className={styles.sparkAvg}>
            {monthName} avg: ${fmt(history.slice(0,-1).reduce((s,h)=>s+h.spent,0)/Math.max(history.slice(0,-1).length,1))} / mo
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.statTabs}>
        <button className={`${styles.statTab} ${!editing ? styles.statTabOn : ''}`} onClick={() => setEditing(false)}>Transactions</button>
        <button className={`${styles.statTab} ${editing ? styles.statTabOn : ''}`} onClick={() => setEditing(true)}>Edit</button>
      </div>

      {!editing ? (
        <div className={styles.statTxList}>
          {loadingTx && <div className={styles.statTxEmpty}>Loading...</div>}
          {!loadingTx && txs?.length === 0 && <div className={styles.statTxEmpty}>No transactions this month.</div>}
          {txs?.map(tx => (
            <div key={tx.id} className={styles.statTxRow}>
              <div className={styles.statTxDate}>{new Date(tx.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
              <div className={styles.statTxName}>{tx.name}</div>
              <div className={styles.statTxAmt}>−${fmt(Math.abs(tx.amount))}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.catEditForm} onClick={e => e.stopPropagation()}>
          <div className={styles.catEditGrid}>
            <div className={styles.catEditField}>
              <div className={styles.catEditLabel}>Name</div>
              <input className={styles.catEditInput} value={editForm.name} onChange={e => setEF('name', e.target.value)} />
            </div>
            <div className={styles.catEditField}>
              <div className={styles.catEditLabel}>Monthly Cap ($)</div>
              <input className={styles.catEditInput} type="number" min="0" step="1" value={editForm.cap} onChange={e => setEF('cap', e.target.value)} />
            </div>
            <div className={styles.catEditField}>
              <div className={styles.catEditLabel}>Icon</div>
              <select className={styles.catEditInput} value={editForm.icon} onChange={e => setEF('icon', e.target.value)} style={{colorScheme:'dark'}}>
                {ICON_OPTS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
            <div className={styles.catEditField}>
              <div className={styles.catEditLabel}>Color</div>
              <select className={styles.catEditInput} value={editForm.color} onChange={e => setEF('color', e.target.value)} style={{colorScheme:'dark'}}>
                {COLOR_OPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.catEditFooter}>
            <button className={styles.catEditCancel} onClick={() => setEditing(false)}>Cancel</button>
            <button className={styles.catEditSave} onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Category card ─────────────────────────────────────────────
function CategoryCard({ cat, onDelete, onToggleComplete, onRefresh }) {
  const [open, setOpen]           = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState(false)
  const [txs, setTxs]             = useState(null)
  const [history, setHistory]     = useState(null)
  const [loadingTx, setLoadingTx]       = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [toggling, setToggling]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [editForm, setEditForm]   = useState({ name: cat.name, cap: cat.cap, icon: cat.icon || '📦', color: cat.color || 'safe' })

  const color  = COLOR_MAP[cat.color] || 'var(--safe)'
  const pct    = Math.min(cat.pct, 100)
  const isOver = cat.pct > 100
  const isDone = cat.completed

  function setEF(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  async function loadData() {
    if (txs === null) {
      setLoadingTx(true)
      try { const d = await api.budgetTransactions(cat.id); setTxs(d.transactions || []) }
      catch { setTxs([]) } finally { setLoadingTx(false) }
    }
    if (history === null) {
      setLoadingHistory(true)
      try { const d = await api.budgetHistory(cat.id); setHistory(d.history || []) }
      catch { setHistory([]) } finally { setLoadingHistory(false) }
    }
  }

  async function toggle() {
    await loadData()
    if (window.innerWidth <= 768) {
      setSheetOpen(true)
      document.body.style.overflow = 'hidden'
    } else {
      setEditing(false)
      setOpen(o => !o)
    }
  }

  function closeSheet() {
    setSheetOpen(false)
    document.body.style.overflow = ''
  }

  // Swipe-to-close: track touch on the drag handle
  function onHandleTouchStart(e) {
    const startY = e.touches[0].clientY
    const sheet  = e.currentTarget.closest('[data-sheet]')
    function onMove(e2) {
      const dy = e2.touches[0].clientY - startY
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`
    }
    function onEnd(e2) {
      const dy = e2.changedTouches[0].clientY - startY
      sheet.style.transform = ''
      if (dy > 80) closeSheet()
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
  }

  async function handleComplete() {
    setToggling(true)
    try { await api.completeBudget(cat.id, !isDone); onRefresh() }
    catch (err) { console.error(err) } finally { setToggling(false) }
  }

  async function handleSaveEdit(e) {
    e?.stopPropagation()
    setSaving(true)
    try {
      await api.updateBudget(cat.id, { name: editForm.name, cap: Number(editForm.cap), icon: editForm.icon, color: editForm.color })
      onRefresh(); setEditing(false)
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const statsProps = { cat, color, isOver, txs, loadingTx, history, loadingHistory, editForm, setEF, editing, setEditing, saving, handleSaveEdit, onDelete, handleComplete, isDone, toggling }

  return (
    <div className={[styles.catCard, open ? styles.catCardOpen : '', isDone ? styles.catCardDone : '', isOver ? styles.catCardOver : ''].join(' ')}>
      {/* ── Header row ── */}
      <div className={styles.catHeader} onClick={toggle}>
        <div className={styles.catIcon} style={isDone ? {opacity:.5} : {}}>{cat.icon || '📦'}</div>
        <div className={styles.catInfo}>
          <div className={styles.catName} style={isDone ? {color:'var(--ink-3)',textDecoration:'line-through'} : {}}>{cat.name}</div>
          <div className={styles.catPeriod}>{isDone ? '✓ Completed' : `${cat.period} · ${cat.pct}% used`}</div>
        </div>
        <div className={styles.catNums}>
          <div className={styles.catSpent} style={{color: isDone ? 'var(--ink-3)' : isOver ? 'var(--debt)' : color}}>${fmt(cat.spent)}</div>
          <div className={styles.catCap}>of ${fmtK(cat.cap)}</div>
        </div>
        <div className={styles.catChevron} style={{transform: open ? 'rotate(180deg)' : 'rotate(0deg)'}}>›</div>
        <div className={styles.catActions} onClick={e => e.stopPropagation()}>
          <button className={`${styles.completeBtn} ${isDone ? styles.completeBtnOn : ''}`} onClick={handleComplete} disabled={toggling} title={isDone ? 'Mark incomplete' : 'Mark complete'}>✓</button>
          <button className={styles.deleteBtn} onClick={() => onDelete(cat.id)} title="Delete">✕</button>
        </div>
      </div>

      {/* Progress bar */}
      {!isDone && <AnimatedBar pct={pct} color={color} height={2}/>}
      {isDone  && <div className={styles.doneBar}/>}
      {!isDone && isOver && <div className={styles.catWarn}><span className="pdot" style={{background:'var(--debt)'}}/>Over budget by ${fmt(cat.spent - cat.cap)}</div>}
      {!isDone && !isOver && cat.pct > 80 && <div className={styles.catWarn}><span className="pdot" style={{background:'var(--warn)'}}/>{cat.pct}% used — {daysLeft} days remain.</div>}

      {/* Desktop: inline expansion */}
      {open && (
        <div className={styles.desktopDrawer}>
          <CategoryStats {...statsProps}/>
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {sheetOpen && (
        <div className={styles.sheetOverlay} onClick={e => { if (e.target === e.currentTarget) closeSheet() }}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} onTouchStart={onHandleTouchStart} style={{cursor:"grab"}}/>
            <div className={styles.sheetHeader}>
              <div>
                <div className={styles.sheetTitle}>{cat.icon} {cat.name}</div>
                <div className={styles.sheetSub}>{monthName.toUpperCase()} {today.getFullYear()}</div>
              </div>
              <button className={styles.sheetClose} onClick={closeSheet}>✕</button>
            </div>
            <CategoryStats {...statsProps}/>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────
function SectionHead({ label, count, color }) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionDot} style={{background: color}} />
      <div className={styles.sectionLabel}>{label}</div>
      <div className={styles.sectionCount}>{count}</div>
    </div>
  )
}

// ── Add Budget Modal ──────────────────────────────────────────
function AddBudgetModal({ onClose, onSaved }) {
  const [form, setForm]     = useState({name:'',cap:'',icon:'📦',color:'safe'})
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k,v) { setForm(f=>({...f,[k]:v})); setError('') }

  async function handleSave() {
    if (!form.name.trim()) return setError('Category name is required')
    if (!form.cap || isNaN(form.cap) || Number(form.cap) <= 0) return setError('Enter a valid monthly cap')
    setSaving(true)
    try {
      await api.createBudget({...form, cap:Number(form.cap)})
      onSaved(); onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>New Budget Category</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.fieldLabel}>Icon</div>
          <div className={styles.iconGrid}>
            {ICON_OPTS.map(ic=>(
              <button key={ic}
                className={`${styles.iconBtn} ${form.icon===ic?styles.iconBtnOn:''}`}
                onClick={()=>set('icon',ic)}>{ic}</button>
            ))}
          </div>
          <div className={styles.fieldLabel}>Category Name</div>
          <input className={styles.input} placeholder="e.g. Dining, Groceries, Rent"
            value={form.name} onChange={e=>set('name',e.target.value)} />
          <div className={styles.fieldLabel}>Monthly Cap ($)</div>
          <input className={styles.input} type="number" placeholder="200"
            value={form.cap} onChange={e=>set('cap',e.target.value)} />
          <div className={styles.fieldLabel}>Color</div>
          <div className={styles.colorGrid}>
            {COLOR_OPTS.map(c=>(
              <button key={c.value}
                className={`${styles.colorBtn} ${form.color===c.value?styles.colorBtnOn:''}`}
                onClick={()=>set('color',c.value)}>
                <div className={styles.colorSwatch} style={{background:c.swatch}}/>
                {c.label}
              </button>
            ))}
          </div>
          <div className={styles.preview}>
            <div className={styles.previewIcon}>{form.icon}</div>
            <div>
              <div className={styles.previewName}>{form.name||'Category Name'}</div>
              <div className={styles.previewCap}>${form.cap?fmtK(form.cap):'0'} / month cap</div>
            </div>
            <div className={styles.previewBar}>
              <div className={styles.previewFill} style={{background:COLOR_MAP[form.color]}}/>
            </div>
          </div>
          {error && <div className={styles.modalError}>{error}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving?'Saving...':'Add Category'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ── AI Budget Limits Modal ────────────────────────────────────
function AiBudgetLimitsModal({ onClose, onApplied }) {
  const [loading, setLoading]   = useState(true)
  const [suggestions, setSugg]  = useState([])
  const [applied, setApplied]   = useState(new Set())
  const [applying, setApplying] = useState(null) // id of the one being applied
  const [error, setError]       = useState('')

  useEffect(() => {
    api.aiBudgetLimits()
      .then(data => { setSugg(data.suggestions || []); setLoading(false) })
      .catch(err  => {
        setError(err.message === 'NO_KEY'
          ? 'Add an Anthropic API key in Settings to use AI features.'
          : err.message)
        setLoading(false)
      })
  }, [])

  async function applyOne(s) {
    setApplying(s.id)
    try {
      await api.updateBudget(s.id, { cap: s.suggested_cap })
      setApplied(prev => new Set([...prev, s.id]))
      onApplied()
    } catch (err) { setError(err.message) }
    finally { setApplying(null) }
  }

  async function applyAll() {
    setApplying('all')
    for (const s of suggestions) {
      if (!applied.has(s.id)) {
        try {
          await api.updateBudget(s.id, { cap: s.suggested_cap })
          setApplied(prev => new Set([...prev, s.id]))
        } catch {}
      }
    }
    setApplying(null)
    onApplied()
  }

  const unapplied = suggestions.filter(s => !applied.has(s.id))
  const changed   = suggestions.filter(s => s.suggested_cap !== s.current_cap)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>✦ AI Budget Limits</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {loading && (
            <div className={styles.aiLimitsLoading}>
              <div className={styles.aiLimitsDot}/>
              Analyzing your last 6 months of spending...
            </div>
          )}

          {!loading && error && (
            <div className={styles.modalError}>{error}</div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div style={{fontSize:13,color:'var(--ink-3)',padding:'16px 0'}}>
              Not enough spending history to make recommendations yet.
            </div>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <>
              <div className={styles.aiLimitsDesc}>
                Based on your last 6 months of spending, here are AI-recommended monthly caps. Changes you haven't applied yet are highlighted.
              </div>

              <div className={styles.aiLimitsTable}>
                <div className={styles.aiLimitsHead}>
                  <span>Category</span>
                  <span>Avg / Month</span>
                  <span>Current Cap</span>
                  <span>Suggested</span>
                  <span></span>
                </div>
                {suggestions.map(s => {
                  const isUp      = s.suggested_cap > s.current_cap
                  const isDown    = s.suggested_cap < s.current_cap
                  const isApplied = applied.has(s.id)
                  const color     = isUp ? 'var(--warn)' : isDown ? 'var(--safe)' : 'var(--ink-2)'
                  return (
                    <div key={s.id} className={`${styles.aiLimitsRow} ${isApplied ? styles.aiLimitsApplied : ''}`}>
                      <span className={styles.aiLimitsCat}>
                        <span>{s.icon}</span> {s.name}
                      </span>
                      <span className={styles.aiLimitsMono}>${(s.avg_monthly||0).toFixed(0)}</span>
                      <span className={styles.aiLimitsMono}>${s.current_cap}</span>
                      <span className={styles.aiLimitsMono} style={{color}}>
                        {isUp ? '↑' : isDown ? '↓' : '='} ${s.suggested_cap}
                      </span>
                      <span>
                        {isApplied ? (
                          <span className={styles.aiLimitsDone}>✓ Applied</span>
                        ) : (
                          <button
                            className={styles.aiLimitsApplyBtn}
                            onClick={() => applyOne(s)}
                            disabled={applying !== null}
                          >
                            {applying === s.id ? '...' : 'Apply'}
                          </button>
                        )}
                      </span>
                      {s.reasoning && (
                        <div className={styles.aiLimitsReason}>{s.reasoning}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {applied.size > 0 ? 'Done' : 'Cancel'}
          </button>
          {unapplied.length > 0 && !loading && !error && (
            <button
              className={styles.saveBtn}
              onClick={applyAll}
              disabled={applying !== null}
            >
              {applying === 'all' ? 'Applying...' : `Apply All ${changed.length > 0 ? `(${changed.length} changes)` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Budgets() {
  const {data, loading, error, refresh} = useApi(api.budgets)
  const [showModal, setShowModal]           = useState(false)
  const [showAiLimits, setShowAiLimits]     = useState(false)
  const [adaptiveSuggestions, setAdaptiveSuggestions] = useState([])

  useEffect(() => {
    api.adaptiveSuggestions()
      .then(r => setAdaptiveSuggestions(r.suggestions || []))
      .catch(() => {})
  }, [])

  async function applyAdaptive(id) {
    await api.applyAdaptive(id).catch(() => {})
    setAdaptiveSuggestions(prev => prev.filter(s => s.id !== id))
    refresh()
  }

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const {budgets=[],totalBudgeted=0,totalSpent=0} = data
  const totalPct = totalBudgeted>0 ? Math.round((totalSpent/totalBudgeted)*100) : 0

  // Partition into three sections
  const overspent   = budgets.filter(b => !b.completed && b.pct > 100)
  const inProgress  = budgets.filter(b => !b.completed && b.pct <= 100)
  const completed   = budgets.filter(b => b.completed)

  // Lumen insights
  const insights = [
    ...overspent.map(b => ({
      head: `${b.name} over budget`,
      body: `$${fmt(b.spent)} spent vs $${fmtK(b.cap)} cap — over by $${fmt(b.spent-b.cap)}.`,
      tagType:'warn', tag:'⚠ Overspent',
    })),
    ...inProgress.filter(b=>b.pct>80).map(b => ({
      head: `${b.name} approaching cap`,
      body: `${b.pct}% used with ${daysLeft} days left. $${fmt(b.cap-b.spent)} remaining.`,
      tagType:'warn', tag:'⚠ Watch This',
    })),
    ...inProgress.filter(b=>b.pct<40&&b.cap>0).map(b => ({
      head: `${b.name} well under budget`,
      body: `Only $${fmt(b.spent)} of $${fmtK(b.cap)} used (${b.pct}%).`,
      tagType:'save', tag:'↓ On Track',
    })),
  ]

  async function handleDelete(id) {
    if (!window.confirm('Remove this budget category?')) return
    await api.deleteBudget(id); refresh()
  }

  function renderSection(label, cats, color) {
    if (cats.length === 0) return null
    return (
      <>
        <SectionHead label={label} count={cats.length} color={color} />
        {cats.map(cat => (
          <CategoryCard key={cat.id} cat={cat} onDelete={handleDelete} onRefresh={refresh} />
        ))}
      </>
    )
  }

  return (
    <>
      {showModal    && <AddBudgetModal onClose={()=>setShowModal(false)} onSaved={refresh}/>}
      {showAiLimits && (
        <AiBudgetLimitsModal
          onClose={()=>setShowAiLimits(false)}
          onApplied={refresh}
        />
      )}
      <ScreenWrap>
        <div className={styles.header}>
          <div>
            <div className={styles.pre}>◎ Where I Am · What Happened</div>
            <div className={styles.title}>Budgets</div>
            <div className={styles.sub}>
              Click any category to see its transactions. Check it off when everything expected for the month is covered.
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.monthTotal}>
              <div className={styles.mtLabel}>Total Budgeted · {monthName}</div>
              <div className={styles.mtAmt}>${fmtK(totalBudgeted)}</div>
              <div className={styles.mtSub}>${fmtK(totalSpent)} spent · {totalPct}% used · {daysLeft} days left</div>
            </div>
            <div className={styles.headerBtns}>
              <button className={styles.aiLimitsBtn} onClick={()=>setShowAiLimits(true)} disabled={budgets.length===0}>
                ✦ AI Limits
              </button>
              <button className={styles.addBtn} onClick={()=>setShowModal(true)}>+ Add Category</button>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          <div>
            {/* Phase I: Adaptive Budget Suggestions */}
            {adaptiveSuggestions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {adaptiveSuggestions.slice(0, 3).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{s.budget_icon || '📅'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-1)' }}>{s.budget_name} seasonal suggestion</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{s.reason}</div>
                    </div>
                    <button onClick={() => applyAdaptive(s.id)} style={{ fontSize: 10, padding: '4px 10px', background: 'var(--calm)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
                      Apply ${Number(s.suggested_cap).toLocaleString()}
                    </button>
                    <button onClick={() => setAdaptiveSuggestions(prev => prev.filter(x => x.id !== s.id))} style={{ fontSize: 14, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {budgets.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>No budget categories yet</div>
                <div className={styles.emptySub}>Click <strong>+ Add Category</strong> to start tracking.</div>
              </div>
            ) : (
              <>
                {renderSection('Overspent', overspent, 'var(--debt)')}
                {renderSection('In Progress', inProgress, 'var(--warn)')}
                {renderSection('Completed', completed, 'var(--safe)')}
              </>
            )}
          </div>

          <div>
            {/* Phase C: Month-End Forecast */}
            <ForecastPanel />

            <div className="section-label" style={{marginBottom:12,marginTop:20}}>Lumen Analysis</div>
            <LumenInsight
              label="Budget Pulse"
              contextType="budgets"
              prompt="What is the single most important thing about my budget right now — overspent category, cap at risk, or a pattern that stands out."
              color="amber"
            />
            <LumenInsight
              label="Spending Pattern"
              contextType="budgets"
              prompt="One spending pattern across my budget categories over the last 3 months that I should know about."
              color="blue"
            />

          </div>
        </div>
      </ScreenWrap>
    </>
  )
}

// ── Phase C: Forecast Panel ───────────────────────────────────
function ForecastPanel() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    api.budgetForecast()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className={styles.forecastCard}>
      <div className={styles.forecastLoading}>Calculating forecast...</div>
    </div>
  )
  if (!data) return null

  const projBal    = data.projectedBalance
  const isNeg      = projBal < 0
  const balColor   = isNeg ? 'var(--debt)' : projBal < 500 ? 'var(--warn)' : 'var(--safe)'

  // Budgets on pace to breach
  const atRisk = (data.budgetPace || []).filter(b => b.onPaceToBreach && !b.completed)

  return (
    <div className={styles.forecastCard}>
      <div className={styles.forecastHeader} onClick={() => setExpanded(e => !e)}>
        <span className={styles.forecastTitle}>📅 Month-End Forecast</span>
        <span className={styles.forecastChevron} style={{transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>›</span>
      </div>

      {/* Always-visible summary row */}
      <div className={styles.forecastSummary}>
        <div className={styles.forecastStat}>
          <div className={styles.forecastStatVal} style={{color: balColor}}>
            {isNeg ? '−' : ''}${fmt(Math.abs(projBal))}
          </div>
          <div className={styles.forecastStatLabel}>Projected Balance</div>
        </div>
        <div className={styles.forecastStat}>
          <div className={styles.forecastStatVal}>${fmt(data.dailyPace)}</div>
          <div className={styles.forecastStatLabel}>Daily Pace</div>
        </div>
        <div className={styles.forecastStat}>
          <div className={styles.forecastStatVal}>{data.daysLeft}</div>
          <div className={styles.forecastStatLabel}>Days Left</div>
        </div>
      </div>

      {/* At-risk budget chips */}
      {atRisk.length > 0 && (
        <div className={styles.forecastAtRisk}>
          {atRisk.map(b => (
            <div key={b.id} className={styles.forecastRiskChip}>
              <span>{b.icon || '📊'}</span>
              <span>{b.name}</span>
              <span className={styles.forecastRiskPct} style={{color:'var(--warn)'}}>
                ~{b.projectedPct}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className={styles.forecastDetail}>
          <div className={styles.forecastRow}>
            <span>Current balance</span>
            <span>${fmt(data.currentBalance)}</span>
          </div>
          <div className={styles.forecastRow}>
            <span>+ Remaining income</span>
            <span className={styles.forecastPos}>+${fmt(data.remainingIncome)}</span>
          </div>
          <div className={styles.forecastRow}>
            <span>− Remaining bills</span>
            <span className={styles.forecastNeg}>−${fmt(data.remainingBills)}</span>
          </div>
          <div className={styles.forecastRow}>
            <span>− Projected spending</span>
            <span className={styles.forecastNeg}>−${fmt(data.projectedDiscretionary)}</span>
          </div>
          <div className={`${styles.forecastRow} ${styles.forecastTotal}`}>
            <span>Projected balance</span>
            <span style={{color: balColor}}>{isNeg ? '−' : ''}${fmt(Math.abs(projBal))}</span>
          </div>

          {/* Per-budget pace bars */}
          {(data.budgetPace || []).filter(b => !b.completed && b.cap > 0).length > 0 && (
            <div className={styles.forecastPaceSection}>
              <div className={styles.forecastPaceTitle}>Category Pace</div>
              {(data.budgetPace || [])
                .filter(b => !b.completed && b.cap > 0)
                .sort((a, b) => b.projectedPct - a.projectedPct)
                .map(b => {
                  const projPct  = Math.min(b.projectedPct, 150)
                  const currPct  = Math.min(b.pct, 100)
                  const barColor = b.onPaceToBreach ? 'var(--debt)' : b.pct > 80 ? 'var(--warn)' : 'var(--safe)'
                  return (
                    <div key={b.id} className={styles.forecastPaceRow}>
                      <div className={styles.forecastPaceName}>
                        <span>{b.icon || '📦'}</span>
                        <span>{b.name}</span>
                      </div>
                      <div className={styles.forecastPaceBarWrap}>
                        {/* Current spend bar */}
                        <div className={styles.forecastPaceBar}>
                          <div
                            className={styles.forecastPaceBarFill}
                            style={{width: `${currPct}%`, background: barColor, opacity: 0.9}}
                          />
                          {/* Projected extension (ghost bar) */}
                          {b.projectedPct > b.pct && (
                            <div
                              className={styles.forecastPaceBarGhost}
                              style={{
                                left:  `${currPct}%`,
                                width: `${Math.min(projPct - currPct, 100 - currPct)}%`,
                                background: barColor,
                              }}
                            />
                          )}
                        </div>
                        <div className={styles.forecastPacePct} style={{color: b.onPaceToBreach ? 'var(--debt)' : 'var(--ink-3)'}}>
                          {b.pct}% → ~{b.projectedPct}%
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
