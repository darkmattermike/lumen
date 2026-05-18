import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
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

const today      = new Date()
const daysInMonth = new Date(today.getFullYear(),today.getMonth()+1,0).getDate()
const daysLeft   = daysInMonth - today.getDate()
const monthName  = today.toLocaleString('en-US',{month:'long'})

// ── Expandable category card ──────────────────────────────────
function CategoryCard({ cat, onDelete }) {
  const [open, setOpen]     = useState(false)
  const [txs, setTxs]       = useState(null)
  const [loadingTx, setLoadingTx] = useState(false)

  const color  = COLOR_MAP[cat.color] || 'var(--safe)'
  const pct    = Math.min(cat.pct, 100)
  const isOver = cat.pct > 100

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

  return (
    <div className={`${styles.catCard} ${open ? styles.catCardOpen : ''}`}>
      {/* ── Header row ── */}
      <div className={styles.catHeader} onClick={toggle}>
        <div className={styles.catIcon}>{cat.icon || '📦'}</div>
        <div className={styles.catInfo}>
          <div className={styles.catName}>{cat.name}</div>
          <div className={styles.catPeriod}>{cat.period} · {cat.pct}% used</div>
        </div>
        <div className={styles.catNums}>
          <div className={styles.catSpent} style={{color: isOver ? 'var(--debt)' : color}}>
            ${fmt(cat.spent)}
          </div>
          <div className={styles.catCap}>of ${fmtK(cat.cap)}</div>
        </div>
        <div className={styles.catChevron} style={{transform: open ? 'rotate(180deg)' : 'rotate(0deg)'}}>
          ›
        </div>
        <button className={styles.deleteBtn} onClick={e => {e.stopPropagation(); onDelete(cat.id)}}>✕</button>
      </div>

      {/* ── Progress bar ── */}
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{width:`${pct}%`, background: isOver ? 'var(--debt)' : color, opacity:.6}} />
      </div>

      {isOver && (
        <div className={styles.catWarn}>
          <span className="pdot" style={{background:'var(--debt)'}} />
          Over budget by ${fmt(cat.spent - cat.cap)}
        </div>
      )}
      {!isOver && cat.pct > 80 && (
        <div className={styles.catWarn}>
          <span className="pdot" style={{background:'var(--warn)'}} />
          {cat.pct}% used — {daysLeft} days remain.
        </div>
      )}

      {/* ── Expanded transactions ── */}
      {open && (
        <div className={styles.txDrawer}>
          <div className={styles.txDrawerHead}>
            Transactions this month
            <span className={styles.txDrawerCount}>
              {txs ? txs.length : '—'}
            </span>
          </div>
          {loadingTx ? (
            <div className={styles.txDrawerLoading}>Loading...</div>
          ) : txs && txs.length === 0 ? (
            <div className={styles.txDrawerEmpty}>No transactions found for this category this month.</div>
          ) : txs ? (
            txs.map(tx => (
              <div key={tx.id} className={styles.txRow}>
                <div className={styles.txDate}>
                  {new Date(tx.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                </div>
                <div className={styles.txName}>{tx.name}</div>
                <div className={styles.txAmt}>−${fmt(Math.abs(tx.amount))}</div>
              </div>
            ))
          ) : null}
        </div>
      )}
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
                onClick={()=>set('color',c.value)}
                style={{'--sw':c.swatch}}>
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

// ── Main page ─────────────────────────────────────────────────
export default function Budgets() {
  const {data, loading, error, refresh} = useApi(api.budgets)
  const [showModal, setShowModal]       = useState(false)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const {budgets=[],totalBudgeted=0,totalSpent=0} = data
  const totalPct = totalBudgeted>0 ? Math.round((totalSpent/totalBudgeted)*100) : 0

  const insights = budgets.filter(b=>b.pct>75).map(b=>({
    head:`${b.name} at ${b.pct}% of budget`,
    body:`$${fmt(b.spent)} spent of your $${fmtK(b.cap)} cap with ${daysLeft} days left. ${b.pct>100?'Already over budget.':`On pace to ${b.pct>85?'overshoot':'stay close'}.`}`,
    tagType:b.pct>100?'warn':'warn', tag:b.pct>100?'⚠ Over Budget':'⚠ Watch This',
  }))
  budgets.filter(b=>b.pct<50&&b.cap>0).forEach(b=>{ insights.push({
    head:`${b.name} well under budget`,
    body:`Only $${fmt(b.spent)} of $${fmtK(b.cap)} used (${b.pct}%). $${fmt(b.cap-b.spent)} remaining.`,
    tagType:'save', tag:'↓ On Track',
  })})

  async function handleDelete(id) {
    if (!window.confirm('Remove this budget category?')) return
    await api.deleteBudget(id); refresh()
  }

  return (
    <>
      {showModal && <AddBudgetModal onClose={()=>setShowModal(false)} onSaved={refresh}/>}
      <ScreenWrap>
        <div className={styles.header}>
          <div>
            <div className={styles.pre}>◎ Where I Am · What Happened</div>
            <div className={styles.title}>Budgets</div>
            <div className={styles.sub}>
              Lumen tracks every category in real time and flags overspend before it happens.
              Click any category to see its transactions.
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.monthTotal}>
              <div className={styles.mtLabel}>Total Budgeted · {monthName}</div>
              <div className={styles.mtAmt}>${fmtK(totalBudgeted)}</div>
              <div className={styles.mtSub}>${fmtK(totalSpent)} spent · {totalPct}% used · {daysLeft} days left</div>
            </div>
            <button className={styles.addBtn} onClick={()=>setShowModal(true)}>+ Add Category</button>
          </div>
        </div>

        <div className={styles.body}>
          <div>
            <div className="section-label" style={{marginBottom:12}}>Active Categories</div>
            {budgets.length===0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>No budget categories yet</div>
                <div className={styles.emptySub}>Click <strong>+ Add Category</strong> to start tracking.</div>
              </div>
            ) : budgets.map(cat=>(
              <CategoryCard key={cat.id} cat={cat} onDelete={handleDelete}/>
            ))}
          </div>

          <div>
            <div className="section-label" style={{marginBottom:12}}>Lumen Analysis</div>
            <div className={styles.aiRecs}>
              <div className={styles.aiTag}><LumenDot size={10}/>AI Budget Analysis</div>
              {insights.length===0 ? (
                <div className={styles.aiRec}>
                  <div className={styles.aiRecHead}>All budgets on track</div>
                  <div className={styles.aiRecBody}>You're at {totalPct}% of your total budget with {daysLeft} days remaining. Everything looks healthy.</div>
                  <div className={`${styles.aiRecTag} ${styles.tagSave}`}>↓ Looking Good</div>
                </div>
              ) : insights.map((r,i)=>(
                <div key={i} className={styles.aiRec}>
                  <div className={styles.aiRecHead}>{r.head}</div>
                  <div className={styles.aiRecBody}>{r.body}</div>
                  <div className={`${styles.aiRecTag} ${r.tagType==='save'?styles.tagSave:styles.tagWarn}`}>{r.tag}</div>
                </div>
              ))}
            </div>

            <div style={{marginTop:20}}>
              <div className="section-label" style={{marginBottom:12}}>Budget Summary</div>
              <div className={styles.rolloverCard}>
                <div className={styles.rolloverNote}>Remaining cap for each category this {monthName}.</div>
                {budgets.map(b=>(
                  <div key={b.id} className={styles.rolloverRow}>
                    <span className={styles.rolloverName}>{b.icon} {b.name}</span>
                    <span className={styles.rolloverAmt} style={{color:b.pct>100?'var(--debt)':'var(--safe)'}}>
                      {b.pct>100?`−$${fmt(b.spent-b.cap)} over`:`$${fmt(b.cap-b.spent)} left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScreenWrap>
    </>
  )
}
