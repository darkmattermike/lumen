import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import { request } from '../../data/api'
import { PLAN_EVENTS, PLAN_MONTHS, STARTING_BALANCES, ACCOUNTS, PLAN_VERSION } from './budgetPlanData'
import s from './BudgetCalendar.module.css'

const SK = 'bcal_v5_state'

function accountCls(a) {
  if (a === 'Autopay')    return s.tAp
  if (a === 'ATN')        return s.tAtn
  if (a === 'Spending')   return s.tSp
  if (a === 'CS')         return s.tCs
  if (a.includes('Citi')) return s.tCiti
  if (a === 'Pending External') return s.tEff
  return s.tSav
}

function displayAcct(a) {
  const map = {'Stearns 1244':'Stearns ·1244','Stearns 3046':'Stearns ·3046','Stearns 4182':'Stearns ·4182','Citi 5079':'Citi ·5079','Pending External':'Pending external'}
  return map[a] || a
}

function money(n) {
  const v = Math.abs(Number(n) || 0)
  const str = v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })
  return (Number(n) < 0 ? '−' : '') + '$' + str
}

function recalcBalances(txOverrides) {
  const bal = { ...STARTING_BALANCES }
  const allIds = PLAN_MONTHS.flatMap(m => m.weeks.flatMap(w => w.items.filter(it=>it.type==='ev').map(it=>it.id)))
  for (const id of allIds) {
    const ov = txOverrides[id]
    if (ov?.deleted) continue
    const changes = ov?.changes ?? PLAN_EVENTS[id]?.changes ?? []
    for (const ch of changes) {
      if (!ch.account) continue
      if (bal[ch.account] === undefined) bal[ch.account] = 0
      bal[ch.account] += Number(ch.amount || 0)
    }
  }
  return bal
}

function balForLabel(label, bal) {
  if (label.includes('Autopay'))       return bal['Autopay']
  if (label.match(/^ATN/))             return bal['ATN']
  if (label.includes('Spending'))      return bal['Spending']
  if (label.match(/^CS/) || label.includes('Child Support')) return bal['CS']
  if (label.includes('Personal Savings')) return bal['Personal Savings']
  if (label.includes('Stearns') && label.includes('1244')) return bal['Stearns 1244']
  if (label.includes('Stearns') && label.includes('3046')) return bal['Stearns 3046']
  if (label.includes('Stearns') && label.includes('4182')) return bal['Stearns 4182']
  if (label.includes('Liberty'))       return bal['Liberty']
  if (label.includes('HYSA'))          return bal['HYSA']
  if (label.includes('Pending'))       return bal['Pending External']
  if (label.includes('Dani Citi'))     return bal['Dani Citi']
  if (label.includes('Citi'))          return bal['Citi 5079']
  return null
}

// ── Balance strip ──────────────────────────────────────────
function BalStrip({ strip, bal }) {
  return (
    <div className={s.balStrip}>
      <div className={s.balLabel}>{strip.label}</div>
      <div className={s.balGrid}>
        {strip.items.map((it, i) => {
          const live = bal ? balForLabel(it.name, bal) : null
          const num  = live !== null && live !== undefined ? live : parseFloat(String(it.val).replace(/[^0-9.\-−]/g,'').replace('−','-'))
          const display = live !== null && live !== undefined ? money(live) : it.val.replace(/^~/,'')
          const col = isNaN(num) ? undefined : num < 0 ? 'var(--sw-rose)' : num === 0 ? 'var(--sw-dim)' : 'var(--sw-mint-2)'
          return (
            <div key={i} className={[s.balItem, it.total ? s.balTotal : '', s[`bal_${it.cls.trim()}`]||''].filter(Boolean).join(' ')}>
              <div className={s.balName}>{it.name}</div>
              <div className={s.balVal} style={col ? {color:col} : {}}>{display}</div>
            </div>
          )
        })}
      </div>
      {strip.note && <div className={s.balNote}>{strip.note}</div>}
    </div>
  )
}

// ── Event row ──────────────────────────────────────────────
const ACCT_MATCH = {
  Autopay: ['Autopay'], ATN: ['ATN'], Spending: ['Spending'], CS: ['CS'],
  Savings: ['Stearns 1244','Stearns 3046','Stearns 4182','Personal Savings','Liberty','HYSA','Pending External'],
  Citi:    ['Citi 5079','Dani Citi'],
}

function EvRow({ evId, txOverrides, onToggle, onEdit, acctFilter }) {
  const base = PLAN_EVENTS[evId]
  const ov   = txOverrides[evId] || {}
  if (ov.deleted) return null

  const title   = ov.title   ?? base?.title   ?? ''
  const detail  = ov.detail  ?? base?.detail  ?? ''
  const date    = ov.date    ?? base?.date    ?? ''
  const done    = ov.done    ?? false
  const note    = ov.note    ?? ''
  const changes = ov.changes ?? base?.changes ?? []
  const tags    = base?.tags ?? []
  const type    = base?.type ?? ''
  const color   = base?.color ?? '#888'
  const amt     = base?.amt  ?? ''
  const amtCls  = base?.amtCls ?? ''

  if (acctFilter !== 'all') {
    const targets = ACCT_MATCH[acctFilter] || []
    const match   = changes.some(c => targets.some(t => (c.account||'').includes(t)))
    if (!match) return null
  }

  const rowCls = [
    s.ev,
    type==='mile'?s.evMile:'', type==='sev'?s.evSave:'',
    type==='bev'?s.evBonus:'', type==='hev'?s.evHouse:'',
    done?s.evDone:'',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowCls} onClick={() => onToggle(evId)} role="button" tabIndex={0}
      onKeyDown={e => { if(e.key==='Enter'||e.key===' ') onToggle(evId) }}>
      <div className={`${s.chk} ${done?s.chkDone:''}`} aria-hidden="true"/>
      <span className={s.edate}>{date}</span>
      <div className={s.edot} style={{background:color}}/>
      <div className={s.ebody}>
        <span className={s.ename}>{title}</span>
        {tags.map((t,i) => <span key={i} className={`${s.tag} ${s[t.cls.replace(/-/g,'_')]||s.tagDef}`}>{t.label}</span>)}
        {changes.length > 0 && changes.map((ch,i) => (
          <span key={i} className={`${s.tag} ${accountCls(ch.account)}`}>{displayAcct(ch.account)}</span>
        ))}
        {detail && <span className={s.esub}> — {detail}</span>}
        {note && <div className={s.enote}>{note}</div>}
      </div>
      <span className={`${s.eamt} ${s[amtCls]||''}`}>{amt}</span>
      <button className={s.editBtn} onClick={e=>{e.stopPropagation();onEdit(evId)}} type="button">Edit</button>
    </div>
  )
}

// ── Edit modal ─────────────────────────────────────────────
function EditModal({ evId, txOverrides, onSave, onDelete, onDuplicate, onClose }) {
  const base = PLAN_EVENTS[evId]
  const ov   = txOverrides[evId] || {}

  const [title,   setTitle]   = useState(ov.title   ?? base?.title   ?? '')
  const [detail,  setDetail]  = useState(ov.detail  ?? base?.detail  ?? '')
  const [date,    setDate]    = useState(ov.date    ?? base?.date    ?? '2026-06-15')
  const [note,    setNote]    = useState(ov.note    ?? '')
  const [done,    setDone]    = useState(ov.done    ?? false)
  const [changes, setChanges] = useState(ov.changes ?? base?.changes ?? [])

  function upd(i, f, v) { setChanges(c => c.map((ch,idx) => idx===i ? {...ch,[f]: f==='amount'?Number(v):v} : ch)) }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={e=>e.stopPropagation()}>
        <div className={s.modalHdr}>
          <h3 className={s.modalTitle}>{base ? 'Edit Transaction' : 'Add Transaction'}</h3>
          <button className={s.modalX} onClick={onClose}>×</button>
        </div>
        <div className={s.modalBody}>
          <label className={s.mLabel}>Title</label>
          <input className={s.mInput} value={title} onChange={e=>setTitle(e.target.value)}/>

          <label className={s.mLabel}>Date</label>
          <input className={s.mInput} type="date" value={date} onChange={e=>setDate(e.target.value)}/>

          <label className={s.mLabel}>Detail</label>
          <textarea className={s.mTextarea} value={detail} onChange={e=>setDetail(e.target.value)} rows={2}/>

          <label className={s.mLabel}>Note</label>
          <input className={s.mInput} value={note} onChange={e=>setNote(e.target.value)} placeholder="Personal note…"/>

          <div className={s.mDoneRow}>
            <label className={s.mLabel} style={{marginBottom:0}}>Marked done</label>
            <input type="checkbox" checked={done} onChange={e=>setDone(e.target.checked)} style={{width:16,height:16,accentColor:'var(--sw-mint)'}}/>
          </div>

          <label className={s.mLabel}>Account splits</label>
          <div className={s.splitHdr}><span>Account</span><span>Amount</span><span/></div>
          {changes.map((ch,i) => (
            <div key={i} className={s.splitRow}>
              <select className={s.mSelect} value={ch.account} onChange={e=>upd(i,'account',e.target.value)}>
                {ACCOUNTS.map(a => <option key={a} value={a}>{displayAcct(a)}</option>)}
              </select>
              <input className={s.mInput} type="number" step="0.01" value={ch.amount} onChange={e=>upd(i,'amount',e.target.value)}/>
              <button className={s.splitDel} onClick={()=>setChanges(c=>c.filter((_,idx)=>idx!==i))}>×</button>
            </div>
          ))}
          <button className={s.addSplitBtn} onClick={()=>setChanges(c=>[...c,{account:'Spending',amount:0}])}>+ Add split</button>
        </div>
        <div className={s.modalFoot}>
          <div className={s.modalFootL}>
            {base && <><button className={s.mDanger} onClick={()=>onDelete(evId)}>Delete</button>
            <button className={s.mSubtle} onClick={()=>onDuplicate(evId)}>Duplicate</button></>}
          </div>
          <div className={s.modalFootR}>
            <button className={s.mCancel} onClick={onClose}>Cancel</button>
            <button className={s.mSave} onClick={()=>onSave(evId,{id:evId,title,detail,date,note,done,changes,deleted:false})}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── sync ───────────────────────────────────────────────────
async function syncSave(tx) {
  try { await request('/api/budget-calendar', { method:'POST', body:{checked:{},dates:{},notes:{},tx,planVersion:PLAN_VERSION} }) } catch {}
}

// ── Main ───────────────────────────────────────────────────
const BADGE_STYLE = {
  'TRANSITION':      {bg:'rgba(96,165,250,.12)',  color:'#60a5fa'},
  'BONUS MONTH':     {bg:'rgba(167,139,250,.12)', color:'#a78bfa'},
  'CLOSING MONTH':   {bg:'rgba(98,224,181,.12)',  color:'var(--sw-mint)'},
  'FIRST MORTGAGE':  {bg:'rgba(127,227,176,.12)', color:'var(--sw-mint-2)'},
  'BONUS + WINDFALL':{bg:'rgba(255,206,133,.12)', color:'var(--sw-amber)'},
  'HOMEOWNER':       {bg:'rgba(127,227,176,.12)', color:'var(--sw-mint-2)'},
  'YEAR END':        {bg:'rgba(167,139,250,.12)', color:'#a78bfa'},
}

export default function BudgetCalendar() {
  const [txOv, setTxOv] = useState(() => { try { return JSON.parse(localStorage.getItem(SK)||'{}') } catch { return {} } })
  const [openM, setOpenM] = useState(() => {
    const idx = new Date().getMonth() - 5
    const id  = PLAN_MONTHS[Math.max(0, Math.min(idx, PLAN_MONTHS.length-1))]?.id || 'jun'
    return {[id]: true}
  })
  const [filter,    setFilter]    = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [syncing,   setSyncing]   = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    request('/api/budget-calendar').then(data => {
      if (data?.tx && Object.keys(data.tx).length > 0) {
        // New format — tx overrides
        setTxOv(data.tx); localStorage.setItem(SK, JSON.stringify(data.tx))
      } else if (data?.checked && Object.keys(data.checked).length > 0) {
        // Migrate old checked/notes/dates format → new tx format
        const mig = {}
        for (const [id, isDone] of Object.entries(data.checked)) {
          if (isDone) mig[id] = { ...(mig[id]||{}), done: true }
        }
        for (const [id, note] of Object.entries(data.notes||{})) {
          if (note) mig[id] = { ...(mig[id]||{}), note }
        }
        for (const [id, date] of Object.entries(data.dates||{})) {
          if (date) mig[id] = { ...(mig[id]||{}), date }
        }
        if (Object.keys(mig).length) {
          setTxOv(mig)
          localStorage.setItem(SK, JSON.stringify(mig))
          // Immediately save migrated state to backend in new format
          syncSave(mig).catch(()=>{})
        }
      }
    }).catch(()=>{})
  }, [])

  function persist(next) {
    localStorage.setItem(SK, JSON.stringify(next))
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => { setSyncing(true); await syncSave(next); setSyncing(false) }, 800)
  }

  const toggle = useCallback((id) => {
    setTxOv(prev => { const n={...prev,[id]:{...prev[id],done:!(prev[id]?.done)}}; persist(n); return n })
  }, [])

  const saveEdit = useCallback((id, data) => {
    setTxOv(prev => { const n={...prev,[id]:{...prev[id],...data}}; persist(n); return n })
    setEditingId(null)
  }, [])

  const deleteTx = useCallback((id) => {
    if (!window.confirm('Delete this transaction?')) return
    setTxOv(prev => { const n={...prev,[id]:{...(prev[id]||{}),deleted:true}}; persist(n); return n })
    setEditingId(null)
  }, [])

  const dupTx = useCallback((id) => {
    const base=PLAN_EVENTS[id]; const ov=txOv[id]||{}; const nid='tx_'+Date.now()
    const nx={id:nid,title:(ov.title??base?.title??'')+' copy',detail:ov.detail??base?.detail??'',date:ov.date??base?.date??'2026-06-15',note:'',done:false,changes:JSON.parse(JSON.stringify(ov.changes??base?.changes??[])),deleted:false}
    setTxOv(prev => { const n={...prev,[nid]:nx}; persist(n); return n })
    setEditingId(nid)
  }, [txOv])

  function addNew() {
    const nid='tx_'+Date.now()
    setTxOv(prev => { const n={...prev,[nid]:{id:nid,title:'New transaction',date:'2026-06-15',detail:'',note:'',done:false,changes:[{account:'Spending',amount:0}],deleted:false}}; persist(n); return n })
    setEditingId(nid)
  }

  async function resetAll() {
    if (!window.confirm('Reset all checkmarks and edits?')) return
    setTxOv({}); localStorage.setItem(SK,'{}'); clearTimeout(timer.current)
    try { await request('/api/budget-calendar',{method:'DELETE'}) } catch {}
  }

  function exportState() {
    const b=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),tx:txOv},null,2)],{type:'application/json'})
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='budget-calendar-backup.json';a.click();URL.revokeObjectURL(a.href)
  }
  function importState(e) {
    const f=e.target.files?.[0];if(!f)return
    const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);const tx=d.tx||d.state?.tx||d;setTxOv(tx);persist(tx);alert('Imported.')}catch{alert('Could not read file.')}};r.readAsText(f)
  }

  const liveBal = useMemo(() => recalcBalances(txOv), [txOv])
  const allIds  = PLAN_MONTHS.flatMap(m => m.weeks.flatMap(w => w.items.filter(it=>it.type==='ev').map(it=>it.id)))
  const total   = allIds.length
  const doneCt  = allIds.filter(id => !txOv[id]?.deleted && txOv[id]?.done).length
  const pct     = total ? Math.round((doneCt/total)*100) : 0
  const addedIds = Object.keys(txOv).filter(id => !PLAN_EVENTS[id] && !txOv[id]?.deleted)

  return (
    <SwShell>
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budget Plan</div>
          <h1 className={s.title}>July 15 Closing · Jun–Dec 2026</h1>
          <div className={s.subtitle}>611 8th Ave N · House-sale top-ups · Citi paid off after sale · Transfers batched by account group</div>
        </div>
        <div className={s.headStats}>
          <div className={s.stat}><div className={s.statKey}>Events</div><div className={s.statVal}>{total}</div></div>
          <div className={s.stat}><div className={s.statKey}>Done</div><div className={`${s.statVal} ${s.green}`}>{doneCt}</div></div>
          <div className={s.stat}><div className={s.statKey}>Left</div><div className={s.statVal}>{total-doneCt}</div></div>
        </div>
      </div>

      <div className={s.progBar}>
        <span className={s.progLabel}>Completion</span>
        <div className={s.progTrack}><div className={s.progFill} style={{width:`${pct}%`}}/></div>
        <span className={s.progPct}>{pct}%</span>
        {syncing && <span className={s.syncDot}>syncing…</span>}
      </div>

      <div className={s.stickyNav}>
        <div className={s.monthNav}>
          {PLAN_MONTHS.map(m => (
            <button key={m.id} className={`${s.mnavBtn} ${openM[m.id]?s.mnavActive:''}`}
              onClick={()=>{ setOpenM(p=>({...p,[m.id]:true})); setTimeout(()=>document.getElementById(`month-${m.id}`)?.scrollIntoView({behavior:'smooth'}),50) }}>
              {m.id.charAt(0).toUpperCase()+m.id.slice(1)}
            </button>
          ))}
          <div className={s.navActions}>
            <button className={s.actionBtn} onClick={addNew}>+ Add</button>
            <button className={s.actionBtnSubtle} onClick={exportState}>Export</button>
            <label className={s.actionBtnSubtle}>Import<input type="file" accept="application/json" style={{display:'none'}} onChange={importState}/></label>
            <button className={s.actionBtnSubtle} onClick={resetAll}>Reset</button>
          </div>
        </div>
        <div className={s.filterBar}>
          {[{k:'all',l:'All',c:'var(--sw-mint)'},{k:'Autopay',l:'Autopay ·9785',c:'var(--sw-purple)'},{k:'ATN',l:'ATN ·4510',c:'var(--sw-blue)'},{k:'Spending',l:'Spending ·1712',c:'var(--sw-mint)'},{k:'CS',l:'CS ·9893',c:'var(--sw-amber)'},{k:'Savings',l:'Savings / HYSA',c:'var(--sw-cyan)'},{k:'Citi',l:'Citi cards',c:'var(--sw-rose)'}].map(f=>(
            <button key={f.k} className={`${s.fChip} ${filter===f.k?s.fChipActive:''}`}
              style={filter===f.k?{borderColor:f.c,color:f.c}:{}}
              onClick={()=>{ setFilter(f.k); if(f.k!=='all') setOpenM(Object.fromEntries(PLAN_MONTHS.map(m=>[m.id,true]))) }}>
              <div className={s.fDot} style={{background:f.c}}/>{f.l}
            </button>
          ))}
        </div>
      </div>

      <div className={s.monthGap}/>

      <div className={s.months}>
        {PLAN_MONTHS.map(month => {
          const isOpen = !!openM[month.id]
          const badge  = BADGE_STYLE[month.badge]||{}
          return (
            <div key={month.id} id={`month-${month.id}`} className={s.month}>
              <div className={s.mhdr} onClick={()=>setOpenM(p=>({...p,[month.id]:!p[month.id]}))} role="button" tabIndex={0}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setOpenM(p=>({...p,[month.id]:!p[month.id]}))}}>
                <div>
                  <div className={s.mname}>
                    {month.title}
                    {month.badge && <span className={s.mBadge} style={{background:badge.bg,color:badge.color}}>{month.badge}</span>}
                  </div>
                  {month.meta && <div className={s.mmeta}>{month.meta}</div>}
                </div>
                <span className={s.mChev}>{isOpen?'▾':'▸'}</span>
              </div>
              {isOpen && (
                <div>
                  {month.weeks.map((week,wi)=>(
                    <div key={wi} className={s.week}>
                      <div className={s.wlabel}>{week.label}</div>
                      {week.items.map((it,ii)=>(
                        it.type==='ev'
                          ? <EvRow key={it.id} evId={it.id} txOverrides={txOv} onToggle={toggle} onEdit={setEditingId} acctFilter={filter}/>
                          : <BalStrip key={ii} strip={it.data} bal={liveBal}/>
                      ))}
                    </div>
                  ))}
                  {month.id===PLAN_MONTHS[PLAN_MONTHS.length-1].id && addedIds.length>0 && (
                    <div className={s.week}>
                      <div className={s.wlabel}>Added transactions</div>
                      {addedIds.map(id=>(
                        <EvRow key={id} evId={id} txOverrides={txOv} onToggle={toggle} onEdit={setEditingId} acctFilter={filter}/>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingId && (
        <EditModal evId={editingId} txOverrides={txOv} onSave={saveEdit} onDelete={deleteTx} onDuplicate={dupTx} onClose={()=>setEditingId(null)}/>
      )}
    </SwShell>
  )
}
