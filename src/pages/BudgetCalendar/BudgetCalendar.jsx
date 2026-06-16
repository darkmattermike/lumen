import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  if (label.includes('Autopay'))                            return bal['Autopay']
  if (/^ATN/.test(label))                                   return bal['ATN']
  if (label.includes('Spending'))                           return bal['Spending']
  if (/^CS/.test(label) || label.includes('Child Support')) return bal['CS']
  if (label.includes('Personal Savings'))                   return bal['Personal Savings']
  if (label.includes('Stearns') && label.includes('1244')) return bal['Stearns 1244']
  if (label.includes('Stearns') && label.includes('3046')) return bal['Stearns 3046']
  if (label.includes('Stearns') && label.includes('4182')) return bal['Stearns 4182']
  if (label.includes('Cap One') && label.includes('3046')) return bal['Cap One 3046']
  if (label.includes('Cap One') && label.includes('4182')) return bal['Cap One 4182']
  if (label.includes('Liberty'))                            return bal['Liberty']
  if (label.includes('HYSA'))                               return bal['HYSA']
  if (label.includes('Pending'))                            return bal['Pending External']
  if (label.includes('Dani Citi'))                          return bal['Dani Citi']
  if (label.includes('Citi'))                               return bal['Citi 5079']
  if (label.includes('transfer float'))                     return bal['Stearns 1244']
  return null
}

function moneyFmt(n) {
  const v = Math.abs(Number(n) || 0)
  const str = v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })
  return (Number(n) < 0 ? '−' : '') + '$' + str
}

// ── Balance strip ──────────────────────────────────────────
function BalStrip({ strip, balSnap }) {
  return (
    <div className={s.balStrip}>
      <div className={s.balLabel}>{strip.label}</div>
      <div className={s.balGrid}>
        {strip.items.map((it, i) => {
          const live = balSnap != null ? balForLabel(it.name, balSnap) : null
          const num = live != null ? live : parseFloat(String(it.val).replace(/[^0-9.\-−]/g,'').replace('−','-'))
          const display = live != null ? moneyFmt(live) : it.val.replace(/^~/, '').trim()
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

  // If changes were edited, recompute the display amount from the splits
  let amt    = base?.amt    ?? ''
  let amtCls = base?.amtCls ?? ''
  if (ov.changes) {
    const total = ov.changes.reduce((s, c) => s + Number(c.amount || 0), 0)
    if (total !== 0) {
      const pos = ov.changes.filter(c => c.amount > 0).reduce((s,c)=>s+c.amount,0)
      const neg = ov.changes.filter(c => c.amount < 0).reduce((s,c)=>s+c.amount,0)
      const fmt = n => { const v=Math.abs(n); const str=v.toLocaleString(undefined,{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2}); return (n<0?'−':'+')+'$'+str }
      if (pos && neg) amt = fmt(neg) + ' / ' + fmt(pos)
      else amt = fmt(total)
      amtCls = total >= 0 ? 'inc' : 'exp'
    }
  }

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
        {/* Use base tags from HTML if available; fall back to change accounts if no base tags */}
        {tags.length > 0
          ? tags.map((t,i) => <span key={i} className={`${s.tag} ${s[t.cls.replace(/-/g,'_')]||s.tagDef}`}>{t.label}</span>)
          : changes.map((ch,i) => (
              <span key={i} className={`${s.tag} ${accountCls(ch.account)}`}>{displayAcct(ch.account)}</span>
            ))
        }
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
            <button className={s.mDanger} onClick={()=>onDelete(evId)}>Delete</button>
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
    // ── 1. Try to recover from old iframe localStorage keys ──
    // The old standalone HTML saved to these two keys. Since the iframe
    // ran on the same domain, these may still be in localStorage.
    const OLD_STATE_KEY = 'budget_cal_v5_july15_house_sale_topups_v1'
    const OLD_DONE_KEY  = 'budget_cal_v5'
    const MIGRATED_KEY  = 'bcal_iframe_migrated'

    if (!localStorage.getItem(MIGRATED_KEY)) {
      const oldStatRaw = localStorage.getItem(OLD_STATE_KEY)
      const oldDoneRaw = localStorage.getItem(OLD_DONE_KEY)
      const recovered  = {}

      if (oldStatRaw) {
        try {
          const parsed = JSON.parse(oldStatRaw)
          const txMap  = parsed.tx || {}
          for (const [id, tx] of Object.entries(txMap)) {
            if (tx && !tx.deleted) {
              recovered[id] = {
                ...(tx.done    !== undefined ? { done:   tx.done    } : {}),
                ...(tx.note                  ? { note:   tx.note    } : {}),
                ...(tx.date                  ? { date:   tx.date    } : {}),
                ...(tx.title                 ? { title:  tx.title   } : {}),
                ...(tx.detail                ? { detail: tx.detail  } : {}),
                ...(tx.changes               ? { changes:tx.changes } : {}),
              }
            }
          }
        } catch {}
      }

      if (oldDoneRaw) {
        try {
          const doneMap = JSON.parse(oldDoneRaw)
          for (const [id, isDone] of Object.entries(doneMap)) {
            if (isDone) recovered[id] = { ...(recovered[id]||{}), done: true }
          }
        } catch {}
      }

      if (Object.keys(recovered).length > 0) {
        setTxOv(recovered)
        localStorage.setItem(SK, JSON.stringify(recovered))
        syncSave(recovered).catch(()=>{})
        localStorage.setItem(MIGRATED_KEY, '1')
        return // skip backend fetch — we just restored from local
      }
      localStorage.setItem(MIGRATED_KEY, '1')
    }

    // ── 2. Fetch from backend ─────────────────────────────────
    request('/api/budget-calendar').then(data => {
      if (data?.tx && Object.keys(data.tx).length > 0) {
        setTxOv(data.tx); localStorage.setItem(SK, JSON.stringify(data.tx))
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

  // Live balance recalculation — mirrors HTML recalcBalances() exactly.
  // Walk PLAN_MONTHS items in DOM order. Apply each ev's changes to running
  // balances; when a strip is encountered, snapshot the current balances for
  // that strip. Result: Map<stripKey, balSnapshot>.
  const liveBalByStrip = useMemo(() => {
    const bal = { ...STARTING_BALANCES }
    const snapshots = {}

    // Build the full ordered list of items exactly as they render:
    // For each month/week, collect evs (with effective date from override or plan)
    // and strips, sort evs by effective date+order between strips,
    // then walk applying changes and snapshotting at strips.
    for (const month of PLAN_MONTHS) {
      for (let wi = 0; wi < month.weeks.length; wi++) {
        const week = month.weeks[wi]
        const wKey = `${month.id}-${wi}`

        // Compute this week's plan date range (used to slot cross-week overrides)
        const wPlanDates = week.items
          .filter(it => it.type === 'ev' && PLAN_EVENTS[it.id])
          .map(it => PLAN_EVENTS[it.id].date).filter(Boolean).sort()
        const wRecalcMin = wPlanDates[0] || ''
        const wRecalcMax = wPlanDates[wPlanDates.length - 1] || ''
        const isLastWeekR = wi === month.weeks.length - 1

        // Plan events for this week — use effective date.
        // Skip events whose override date moves them OUT of this week's range
        // (they'll be picked up when we process the week their override date falls in).
        const planEvItems = week.items.filter(it => {
          if (it.type !== 'ev') return false
          const effDate = txOv[it.id]?.date
          if (!effDate || !wRecalcMin || !wRecalcMax || isLastWeekR) return true
          return effDate >= wRecalcMin && effDate <= wRecalcMax
        }).map(it => ({
          id:    it.id,
          date:  txOv[it.id]?.date ?? PLAN_EVENTS[it.id]?.date ?? '',
          order: PLAN_EVENTS[it.id]?.order ?? 99999,
          isAdded: false,
        }))

        // Also collect plan events from OTHER weeks whose override date lands HERE
        const overflowEvItems = []
        for (const [oid, ov] of Object.entries(txOv)) {
          if (!PLAN_EVENTS[oid] || ov.deleted || !ov.date) continue
          // Check if this ev originally belongs to a different week in this month
          const belongsHere = week.items.some(it => it.id === oid)
          if (belongsHere) continue
          // Check if override date falls in this week
          if (wRecalcMin && ov.date >= wRecalcMin && (ov.date <= wRecalcMax || isLastWeekR)) {
            // Confirm it's in this month
            const inThisMonth = month.weeks.some(w2 => w2.items.some(it => it.id === oid))
            if (inThisMonth) {
              overflowEvItems.push({
                id: oid, date: ov.date,
                order: PLAN_EVENTS[oid]?.order ?? 99999,
                isAdded: false,
              })
            }
          }
        }

        // User-added transactions placed in this week
        const addedEvItems = Object.entries(txOv)
          .filter(([id, tx]) => !PLAN_EVENTS[id] && !tx?.deleted && tx?.title)
          .filter(([id, tx]) => {
            // place in same week as the render logic does
            const date = tx.date || '9999'
            const planDates = week.items
              .filter(it => it.type === 'ev' && PLAN_EVENTS[it.id])
              .map(it => PLAN_EVENTS[it.id].date).filter(Boolean).sort()
            const wMin = planDates[0] || ''
            const wMax = planDates[planDates.length - 1] || ''
            const isLast = wi === month.weeks.length - 1
            return wMin && (date <= wMax || isLast) && date >= wMin
          })
          .map(([id, tx]) => ({
            id, date: tx.date || '9999', order: 99999, isAdded: true,
          }))

        // Interleave: between strips, sort evs by effective date+order
        let si = 0
        let evBuf = [...planEvItems, ...overflowEvItems, ...addedEvItems]

        // Walk week items — when we hit a strip, flush+apply evBuf then snapshot
        const strips = week.items.filter(it => it.type === 'strip')
        const hasStrips = strips.length > 0

        if (hasStrips) {
          // Apply all evs in this segment before the strip
          evBuf.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.order - b.order)
          for (const ev of evBuf) {
            const ov = txOv[ev.id] || {}
            if (ov.deleted) continue
            const changes = ov.changes ?? (ev.isAdded ? [] : PLAN_EVENTS[ev.id]?.changes ?? [])
            for (const ch of changes) {
              if (!ch.account) continue
              if (bal[ch.account] === undefined) bal[ch.account] = 0
              bal[ch.account] += Number(ch.amount || 0)
            }
          }
          for (const _strip of strips) {
            snapshots[`${month.id}-${wi}-${si}`] = { ...bal }
            si++
          }
        } else {
          // No strip — just apply evs
          evBuf.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.order - b.order)
          for (const ev of evBuf) {
            const ov = txOv[ev.id] || {}
            if (ov.deleted) continue
            const changes = ov.changes ?? (ev.isAdded ? [] : PLAN_EVENTS[ev.id]?.changes ?? [])
            for (const ch of changes) {
              if (!ch.account) continue
              if (bal[ch.account] === undefined) bal[ch.account] = 0
              bal[ch.account] += Number(ch.amount || 0)
            }
          }
        }
      }
    }
    return snapshots
  }, [txOv])
  const allIds  = PLAN_MONTHS.flatMap(m => m.weeks.flatMap(w => w.items.filter(it=>it.type==='ev').map(it=>it.id)))
  const total   = allIds.length
  const doneCt  = allIds.filter(id => !txOv[id]?.deleted && txOv[id]?.done).length
  const pct     = total ? Math.round((doneCt/total)*100) : 0
  // Added transactions keyed by [monthId][weekIndex] based on their date
  const addedByWeek = useMemo(() => {
    const result = {}
    for (const [id, tx] of Object.entries(txOv)) {
      if (PLAN_EVENTS[id] || tx?.deleted || !tx?.title) continue
      const date = tx.date || ''
      // Find which month+week this date belongs to
      let placed = false
      for (const month of PLAN_MONTHS) {
        for (let wi = 0; wi < month.weeks.length; wi++) {
          const week = month.weeks[wi]
          const evDates = week.items
            .filter(it => it.type === 'ev')
            .map(it => txOv[it.id]?.date ?? PLAN_EVENTS[it.id]?.date ?? '')
            .filter(Boolean)
          const wMin = evDates.length ? evDates.reduce((a,b) => a<b?a:b) : ''
          const wMax = evDates.length ? evDates.reduce((a,b) => a>b?a:b) : ''
          const isLast = wi === month.weeks.length - 1
          if (!placed && ((wMin && wMax && date >= wMin && date <= wMax) || (isLast && date >= (wMin||'')))) {
            const key = `${month.id}-${wi}`
            if (!result[key]) result[key] = []
            result[key].push(id)
            placed = true
            break
          }
        }
        if (placed) break
      }
      // If no week matched, put in last week of last month
      if (!placed) {
        const lastM = PLAN_MONTHS[PLAN_MONTHS.length - 1]
        const key   = `${lastM.id}-${lastM.weeks.length - 1}`
        if (!result[key]) result[key] = []
        result[key].push(id)
      }
    }
    return result
  }, [txOv])

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
                      {(()=>{
                        const weekKey = `${month.id}-${wi}`
                        const extraIds = addedByWeek[weekKey] || []
                        // Sort ev runs between strips by effective date.
                        // Extra (user-added) evs are mixed in with plan evs before sorting.
                        const sorted = []
                        let evBuf = []
                        const flush = () => {
                          evBuf.sort((a,b)=>{
                            const da = txOv[a.id]?.date ?? PLAN_EVENTS[a.id]?.date ?? ''
                            const db = txOv[b.id]?.date ?? PLAN_EVENTS[b.id]?.date ?? ''
                            if (da !== db) return da.localeCompare(db)
                            // same date — preserve original plan order
                            const oa = PLAN_EVENTS[a.id]?.order ?? 99999
                            const ob = PLAN_EVENTS[b.id]?.order ?? 99999
                            return oa - ob
                          })
                          sorted.push(...evBuf)
                          evBuf = []
                        }
                        // Compute this week's date range from plan event dates (ignoring overrides)
                        const planDates = week.items
                          .filter(it => it.type==='ev' && PLAN_EVENTS[it.id])
                          .map(it => PLAN_EVENTS[it.id].date)
                          .filter(Boolean).sort()
                        const wMin = planDates[0] || ''
                        const wMax = planDates[planDates.length-1] || ''
                        const isLastWeek = wi === month.weeks.length - 1

                        // Walk plan items; inject extras before strips
                        const extraEvs = extraIds.map(id => ({ type:'ev', id }))
                        let extrasInjected = false
                        for (const it of week.items) {
                          if (it.type === 'strip') {
                            if (!extrasInjected) { evBuf.push(...extraEvs); extrasInjected = true }
                            flush()
                            sorted.push(it)
                          } else {
                            // If this plan event has a date override that moves it OUT of this week,
                            // skip it here — it will appear in the week matching its override date
                            const effDate = txOv[it.id]?.date
                            if (effDate && wMin && wMax && !isLastWeek) {
                              if (effDate < wMin || effDate > wMax) continue
                            }
                            evBuf.push(it)
                          }
                        }
                        if (!extrasInjected) evBuf.push(...extraEvs)
                        flush()

                        // Also collect overflow events from OTHER weeks whose date override puts them here
                        // These are plan events (not user-added) with overrides landing in this week's range
                        if (wMin && wMax) {
                          const overflowEvs = []
                          for (const [id, ov] of Object.entries(txOv)) {
                            if (!PLAN_EVENTS[id] || ov.deleted || !ov.date) continue
                            const base = PLAN_EVENTS[id]
                            // Only process if this ev doesn't belong to this week originally
                            const belongsHere = month.weeks[wi].items.some(it => it.id === id)
                            if (belongsHere) continue
                            // Check if override date falls in this week
                            if (ov.date >= wMin && (ov.date <= wMax || isLastWeek)) {
                              // Make sure it's in this month (check plan month)
                              const evMonth = PLAN_MONTHS.find(m2 => m2.weeks.some(w2 => w2.items.some(it => it.id === id)))
                              if (evMonth?.id === month.id) {
                                overflowEvs.push({ type:'ev', id })
                              }
                            }
                          }
                          if (overflowEvs.length) {
                            // Insert into sorted maintaining date+order sort
                            const combined = [...sorted.filter(it=>it.type==='ev'), ...overflowEvs]
                            combined.sort((a,b)=>{
                              const da = txOv[a.id]?.date ?? PLAN_EVENTS[a.id]?.date ?? ''
                              const db = txOv[b.id]?.date ?? PLAN_EVENTS[b.id]?.date ?? ''
                              if (da!==db) return da.localeCompare(db)
                              return (PLAN_EVENTS[a.id]?.order??99999)-(PLAN_EVENTS[b.id]?.order??99999)
                            })
                            // Rebuild sorted preserving strip positions
                            const strips = sorted.filter(it=>it.type==='strip')
                            sorted.length = 0
                            sorted.push(...combined)
                            // Re-insert strips at end (they were at the end of the week)
                            sorted.push(...strips)
                          }
                        }
                        let _si = 0
                        return sorted.map((it,ii)=>{
                          if (it.type==='ev') {
                            return <EvRow key={it.id} evId={it.id} txOverrides={txOv} onToggle={toggle} onEdit={setEditingId} acctFilter={filter}/>
                          } else {
                            const balSnap = liveBalByStrip[`${month.id}-${wi}-${_si}`]
                            _si++
                            return <BalStrip key={ii} strip={it.data} balSnap={balSnap}/>
                          }
                        })
                      })()}
                    </div>
                  ))}
{/* Added transactions are injected into the correct month/week via addedIds logic above */}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingId && createPortal(
        <EditModal evId={editingId} txOverrides={txOv} onSave={saveEdit} onDelete={deleteTx} onDuplicate={dupTx} onClose={()=>setEditingId(null)}/>,
        document.body
      )}
    </SwShell>
  )
}
