import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
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

// ── Category card ─────────────────────────────────────────────
function CategoryCard({ cat, onDelete, onToggleComplete, onRefresh }) {
  const [open, setOpen]     = useState(false)
  const [txs, setTxs]       = useState(null)
  const [loadingTx, setLoadingTx] = useState(false)
  const [toggling, setToggling]   = useState(false)

  const color  = COLOR_MAP[cat.color] || 'var(--safe)'
  const pct    = Math.min(cat.pct, 100)
  const isOver = cat.pct > 100
  const isDone = cat.completed

  async function toggle() {
    if (!open && txs === null) {
      setLoadingTx(true)
      try {
        const data = await api.budgetTransactions(cat.id)
        setTxs(data.transactions || [])
      } catch { setTxs([]) }
      finally { setLoadingTx(false) }
    }
    setOpen(o => !o)
  }

  async function handleComplete() {
    setToggling(true)
    try {
      await api.completeBudget(cat.id, !isDone)
      onRefresh()
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={[
      styles.catCard,
      open   ? styles.catCardOpen : '',
      isDone ? styles.catCardDone : '',
      isOver ? styles.catCardOver : '',
    ].join(' ')}>
      {/* ── Header ── */}
      <div className={styles.catHeader} onClick={toggle}>
        <div className={styles.catIcon} style={isDone ? {opacity:.5} : {}}>{cat.icon || '📦'}</div>
        <div className={styles.catInfo}>
          <div className={styles.catName} style={isDone ? {color:'var(--ink-3)',textDecoration:'line-through'} : {}}>
            {cat.name}
          </div>
          <div className={styles.catPeriod}>
            {isDone ? '✓ Completed' : `${cat.period} · ${cat.pct}% used`}
          </div>
        </div>
        <div className={styles.catNums}>
          <div className={styles.catSpent} style={{color: isDone ? 'var(--ink-3)' : isOver ? 'var(--debt)' : color}}>
            ${fmt(cat.spent)}
          </div>
          <div className={styles.catCap}>of ${fmtK(cat.cap)}</div>
        </div>
        <div className={styles.catChevron} style={{transform: open ? 'rotate(180deg)' : 'rotate(0deg)'}}>›</div>

        {/* Actions — stop propagation so they don't toggle the drawer */}
        <div className={styles.catActions} onClick={e => e.stopPropagation()}>
          <button
            className={`${styles.completeBtn} ${isDone ? styles.completeBtnOn : ''}`}
            onClick={handleComplete}
            disabled={toggling}
            title={isDone ? 'Mark incomplete' : 'Mark complete'}
          >
            ✓
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(cat.id)}
            title="Delete category"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {!isDone && (
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{width:`${pct}%`, background: isOver ? 'var(--debt)' : color, opacity:.6}} />
        </div>
      )}
      {isDone && (
        <div className={styles.doneBar} />
      )}

      {!isDone && isOver && (
        <div className={styles.catWarn}>
          <span className="pdot" style={{background:'var(--debt)'}} />
          Over budget by ${fmt(cat.spent - cat.cap)}
        </div>
      )}
      {!isDone && !isOver && cat.pct > 80 && (
        <div className={styles.catWarn}>
          <span className="pdot" style={{background:'var(--warn)'}} />
          {cat.pct}% used — {daysLeft} days remain.
        </div>
      )}

      {/* ── Transaction drawer ── */}
      {open && (
        <div className={styles.txDrawer}>
          <div className={styles.txDrawerHead}>
            Transactions this month
            <span className={styles.txDrawerCount}>{txs ? txs.length : '—'}</span>
          </div>
          {loadingTx ? (
            <div className={styles.txDrawerLoading}>Loading...</div>
          ) : txs && txs.length === 0 ? (
            <div className={styles.txDrawerEmpty}>No transactions in this category this month.</div>
          ) : txs ? txs.map(tx => (
            <div key={tx.id} className={styles.txRow}>
              <div className={styles.txDate}>
                {new Date(tx.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              </div>
              <div className={styles.txName}>{tx.name}</div>
              <div className={styles.txAmt}>−${fmt(Math.abs(tx.amount))}</div>
            </div>
          )) : null}
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
            <div className="section-label" style={{marginBottom:12}}>Lumen Analysis</div>
            <LumenInsight
              label="Budget Pulse"
              contextType="budgets"
              prompt="Give me 2-3 sharp, specific insights about my budget this month. Include: (1) any category that's overspent or dangerously close to cap, (2) a historical pattern — am I consistently over or under in any category across the last few months, and (3) a forward projection — based on my pace, what will I likely end at by month end. Use exact dollar figures. No generic advice."
              color="amber"
            />
            <LumenInsight
              label="Spending Pattern"
              contextType="budgets"
              prompt="In 2 sentences, identify the single most notable spending pattern across my budget categories over the last 3 months — something I might not have noticed. Be specific with numbers and category names."
              color="blue"
            />

          </div>
        </div>
      </ScreenWrap>
    </>
  )
}
