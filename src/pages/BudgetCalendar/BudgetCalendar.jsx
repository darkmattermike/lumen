import { useState, useCallback, useRef, useEffect } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import { request } from '../../data/api'
import s from './BudgetCalendar.module.css'

const STORAGE_KEY = 'budget_cal_v5'
const DATES_KEY   = 'budget_cal_v5_dates'
const NOTES_KEY   = 'budget_cal_v5_notes'

// ── cross-device sync ──────────────────────────────────────
async function syncSave(checked, dates, notes) {
  try {
    await request('/api/budget-calendar', {
      method: 'POST',
      body: { checked, dates, notes },
    })
  } catch { /* falls back to localStorage */ }
}

// ── balance strip ──────────────────────────────────────────
function BalStrip({ label, items, note }) {
  return (
    <div className={s.balStrip}>
      <div className={s.balLabel}>{label}</div>
      <div className={s.balGrid}>
        {items.map((it, i) => (
          <div key={i} className={`${s.balItem} ${it.total ? s.balTotal : ''} ${s[`bal_${it.cls}`] || ''}`}>
            <div className={s.balName}>{it.name}</div>
            <div className={s.balVal}>{it.val}</div>
          </div>
        ))}
      </div>
      {note && <div className={s.balNote}>{note}</div>}
    </div>
  )
}

// ── single event row ───────────────────────────────────────
const TAG_CLS = {
  't-ap':'t_ap','t-atn':'t_atn','t-sp':'t_sp','t-cs':'t_cs',
  't-sav':'t_sav','t-citi':'t_citi','t-act':'t_act','t-key':'t_key','t-eff':'t_eff'
}

function Ev({ ev, done, note, onToggle, dateOverride, onDateSave, onNoteSave }) {
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft,   setDateDraft]   = useState('')
  const [showNote,    setShowNote]    = useState(!!note)
  const dateRef = useRef(null)
  const noteRef = useRef(null)

  const displayDate = dateOverride || ev.date
  const isEdited    = !!dateOverride

  function startEdit(e) {
    e.stopPropagation()
    setDateDraft(displayDate)
    setEditingDate(true)
    setTimeout(() => dateRef.current?.select(), 0)
  }
  function commitEdit() {
    const val = dateDraft.trim()
    onDateSave(ev.id, val && val !== ev.date ? val : null)
    setEditingDate(false)
  }
  function handleDateKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditingDate(false) }
    e.stopPropagation()
  }

  function handleAddNote(e) {
    e.stopPropagation()
    setShowNote(true)
    setTimeout(() => noteRef.current?.focus(), 0)
  }

  function handleNoteChange(e) {
    const val = e.target.value
    onNoteSave(ev.id, val)
    if (!val.trim()) setShowNote(false)
  }

  const rowCls = [
    s.ev,
    ev.type === 'mile' ? s.evMile  : '',
    ev.type === 'sev'  ? s.evSave  : '',
    ev.type === 'bev'  ? s.evBonus : '',
    ev.type === 'hev'  ? s.evHouse : '',
    done               ? s.evDone  : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowCls}
      onClick={() => !editingDate && onToggle(ev.id)}
      role="button" tabIndex={0}
      onKeyDown={e => { if (!editingDate && (e.key === 'Enter' || e.key === ' ')) onToggle(ev.id) }}>

      <div className={`${s.chk} ${done ? s.chkDone : ''}`} aria-hidden="true"/>

      {editingDate ? (
        <input ref={dateRef} className={s.edateInput}
          value={dateDraft} onChange={e => setDateDraft(e.target.value)}
          onBlur={commitEdit} onKeyDown={handleDateKey}
          onClick={e => e.stopPropagation()} />
      ) : (
        <span className={`${s.edate} ${isEdited ? s.edateEdited : ''}`}
          onClick={startEdit} title="Click to edit date">{displayDate}</span>
      )}

      <div className={s.edot} style={{ background: ev.color }}/>

      <div className={s.ebody}>
        {/* single line: name · tags · sub all inline */}
        <span className={s.ename}>{ev.name}</span>
        {ev.tag && ev.tag.split(' · ').map((t, i) => (
          <span key={i} className={`${s.tag} ${s[TAG_CLS[ev.tagCls]] || s.tagDef}`}>{t}</span>
        ))}
        {ev.sub && <span className={s.esub}> — {ev.sub}</span>}

        {/* note row — only shown when active */}
        {showNote ? (
          <div className={s.enoteRow} onClick={e => e.stopPropagation()}>
            <input
              ref={noteRef}
              className={s.enote}
              type="text"
              placeholder="Add note…"
              defaultValue={note || ''}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Escape') { setShowNote(false); if (!note) onNoteSave(ev.id, '') }
              }}
              onBlur={e => { if (!e.target.value.trim()) setShowNote(false) }}
              onChange={handleNoteChange}
            />
          </div>
        ) : (
          <button className={s.addNoteBtn}
            onClick={handleAddNote}
            title="Add a note to this item">
            + note
          </button>
        )}
      </div>

      <span className={`${s.eamt} ${s[ev.amtCls] || ''}`}>{ev.amt}</span>
    </div>
  )
}

const MONTHS = [
  {
    id: "jun",
    title: "June 2026",
    meta: "Inspection · Citi payments begin at $40/mo · Dani Citi $40/mo from ATN · Jun 18 Mike auto loan removed · No Jun 30 Stearns assumed",
    badge: "TRANSITION",
    weeks: [
      {
        label: "Jun 14–18 · Seed ATN · Apex · Inspection",
        events: [
          {id:"j_prefund",date:"Jun 14 Sun",color:"#00d4d4",type:"",name:"Internal Stearns setup: ·1244 → ATN",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"Move only the ATN cushion internally inside Stearns. The Spending piece is sent as one external batch instead of routing through ATN.",amt:"-$410 / +$410",amtCls:"trn"},
          {id:"j_apex1",date:"Jun 15 Mon",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay · Autopay · Spending · INTERNAL",tagCls:"t-ap",sub:"Bi-monthly paycheck deposited to Autopay ·9785.",amt:"+$2,300",amtCls:"inc"},
          {id:"j_sp_xfer",date:"Jun 15 Mon",color:"#00d4d4",type:"",name:"Initiate external June Spending batch: Stearns ·1244 → Cap One Spending",tag:"SAVINGS · Spending · EXTERNAL",tagCls:"t-sav",sub:"One bulk transfer for the June Spending funding. Funds are in transit and should not be counted in Spending until the Jun 19 available line. No subtransfer needed when it arrives; keep it in Spending.",amt:"−$590 pending",amtCls:"trn"},
          {id:"j_neon",date:"Jun 15 Mon",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"j_self",date:"Jun 15 Mon",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"j_sf",date:"Jun 15 Mon",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"j_cashexp",date:"Jun 15 Mon",color:"#60a5fa",type:"",name:"Cash expense",tag:"ATN",tagCls:"t-atn",sub:"One-time $125 spent from ATN ·4510.",amt:"−$125",amtCls:"exp"},
          {id:"j_cashdep",date:"Jun 16 Tue",color:"#60a5fa",type:"",name:"Cash deposit",tag:"ATN",tagCls:"t-atn",sub:"One-time $955 cash deposited into ATN ·4510. Net of Jun 15 expense: +$830.",amt:"+$955",amtCls:"inc"},
          {id:"j_insp",date:"Jun 16–18",color:"#a78bfa",type:"",name:"Home inspection ~$400",tag:"Autopay · ACTION",tagCls:"t-ap",sub:"Pay from Autopay. Shop 2-3 inspectors. Negotiate repairs with seller after.",amt:"−~$400",amtCls:"exp"},
          {id:"j_lead",date:"Jun 16–18",color:"#a78bfa",type:"",name:"Lead Bank Self Lend",tag:"Autopay",tagCls:"t-ap",sub:"Pay manually. ~$32",amt:"−$32",amtCls:"exp"},
          {id:"j_gone",date:"Jun 16–18",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$9.99",amt:"−$9.99",amtCls:"exp"},
        ],
        balStrips: [
          {
            label: "After Jun 14–18 · Seed placed · Apex · Inspection",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$1,236",total:false},
            ],
          },
        ],
      },
      {
        label: "Jun 19–28 · Stearns · Auto Loan Dani · Bills · ATN smoothing active",
        events: [
          {id:"j_stearns1",date:"Jun 19 Fri",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"Dani’s biweekly paycheck deposits to ATN ·4510. ~$1,650.",amt:"+$1,650",amtCls:"inc"},
          {id:"j_sp2",date:"Jun 19 Fri",color:"#3dd68c",type:"sev",name:"June Spending batch available in Cap One",tag:"Spending · ARRIVES",tagCls:"t-sp",sub:"The Jun 15 external batch arrives. Subtransfer: none — leave the full $590 in Cap One Spending. This replaces the separate $723 + $423 ATN→Spending transfers.",amt:"+$590",amtCls:"trn"},
          {id:"j_autodani",date:"Jun 19 Fri",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"Pay manually. ~$750",amt:"−$750",amtCls:"exp"},
          {id:"j_cs1",date:"Jun 19 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"Weekly CS deposit. ~$200.",amt:"+~$200",amtCls:"inc"},
          {id:"j_wash",date:"Jun 19 Fri",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$60",amt:"−$60",amtCls:"exp"},
          {id:"j_groc1",date:"Jun 20 Sat",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"j_fuel1",date:"Jun 20 Sat",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"j_internet",date:"Jun 22 Mon",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"Pay manually. ~$65",amt:"−$65",amtCls:"exp"},
          {id:"j_apple",date:"Jun 25 Thu",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"Auto-charge ~$15",amt:"−$15",amtCls:"exp"},
          {id:"j_cs2",date:"Jun 26 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"Weekly CS.",amt:"+~$200",amtCls:"inc"},
          {id:"j_kids",date:"Jun 26 Fri",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"Recurring child-related cost. ~$125",amt:"−$125",amtCls:"exp"},
          {id:"j_shop",date:"Jun 26 Fri",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"j_rail",date:"Jun 27 Sat",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$5",amt:"−$5",amtCls:"exp"},
          {id:"j_groc2",date:"Jun 27 Sat",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"j_citi1",date:"Jun 28 Sun",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Pay $40/mo toward Citi ·5079 through Dec. Balance after this payment: ~$1,680 before interest. Pay from Autopay.",amt:"−$40",amtCls:"exp"},
        ],
        balStrips: [
          {
            label: "After Jun 19–28 · Stearns · Bills · Citi payment",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$1,181",total:false},
            ],
          },
        ],
      },
      {
        label: "Jun 29–30 · All ATN bills · Apex only · no Stearns counted",
        events: [
          {id:"j_autoins",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300",amt:"−$300",amtCls:"exp"},
          {id:"j_yost",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Yost",tag:"ATN",tagCls:"t-atn",sub:"Pay manually. ~$100",amt:"−$100",amtCls:"exp"},
          {id:"j_spot",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$25",amt:"−$25",amtCls:"exp"},
          {id:"j_cell",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"Pay manually. ~$350",amt:"−$350",amtCls:"exp"},
          {id:"j_blink",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$12",amt:"−$12",amtCls:"exp"},
          {id:"j_pp",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$42",amt:"−$42",amtCls:"exp"},
          {id:"j_ring",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$12",amt:"−$12",amtCls:"exp"},
          {id:"j_plaid",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$6",amt:"−$6",amtCls:"exp"},
          {id:"j_elec",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid after second Stearns. ~$339 combined.",amt:"−$339",amtCls:"exp"},
          {id:"j_apex2",date:"Jun 30 Tue",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"Second bi-monthly paycheck. Autopay ·9785.",amt:"+$2,300",amtCls:"inc"},
          {id:"j_stearns2",date:"Jun 30 Tue",color:"#60a5fa",type:"sev",name:"No Stearns paycheck assumed",tag:"ATN · SAVINGS · Spending · EXTERNAL",tagCls:"t-atn",sub:"Removed from rerun. Biweekly sequence is Jun 19 → Jul 3; no Jun 30 Stearns deposit counted.",amt:"$0",amtCls:"inc"},
          {id:"j_cs3",date:"Jun 30 Tue",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"Weekly CS.",amt:"+~$200",amtCls:"inc"},
          {id:"j_bfit",date:"Jun 30 Tue",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$12",amt:"−$12",amtCls:"exp"},
          {id:"j_origin",date:"Jun 30 Tue",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$33",amt:"−$33",amtCls:"exp"},
          {id:"j_fuel2",date:"Jun 30 Tue",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"j_spjul",date:"Jun 30 Tue",color:"#3dd68c",type:"sev",name:"Skip July pre-fund transfer",tag:"Spending",tagCls:"t-sp",sub:"Removed from rerun. July Spending is funded on Jul 3 after the Stearns paycheck.",amt:"$0",amtCls:"trn"},
        ],
        balStrips: [
          {
            label: "June 30 END · Apex only · No Stearns counted",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$3,481",total:false},
            ],
          },
        ],
      },
    ],
  },
  {
    id: "jul",
    title: "July 2026",
    meta: "Permanent ATN buffer · Mortgage application · Bonus deployed · Closing fund complete",
    badge: "BONUS MONTH",
    weeks: [
      {
        label: "Jul 1–6 · Permanent buffer · App submitted · Stearns",
        events: [
          {id:"jul_perm_buffer_batch_init",date:"Jul 1 Wed",color:"#00d4d4",type:"sev",name:"Initiate permanent ATN buffer + ·1244 restore batch: Autopay → Stearns group",tag:"Autopay · ATN · SAVINGS · EXTERNAL · SAVINGS · ATN · SAVINGS",tagCls:"t-ap",sub:"One $2,000 cross-group batch. When it arrives in Stearns/ATN, leave $1,000 in ATN as the permanent buffer and subtransfer $1,000 internally to Stearns ·1244 to restore the June seed. Do not count this cash as usable until the arrival line.",amt:"−$2,000 pending",amtCls:"trn"},
          {id:"jul_appsub",date:"Jul 1 Wed",color:"#fb923c",type:"",name:"Submit formal mortgage application",tag:"KEY DATE",tagCls:"t-key",sub:"FICO has updated with Jun 28 Citi reporting. Submit application to lender. Shop 2–3 lenders in 14-day window (counts as one credit pull). Ask for FHA vs Conventional comparison.",amt:"action",amtCls:"act"},
          {id:"jul_neon",date:"Jul 1 Wed",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"jul_trash",date:"Jul 1 Wed",color:"#a78bfa",type:"",name:"Trash",tag:"Autopay",tagCls:"t-ap",sub:"Rental period. ~$12",amt:"−$12",amtCls:"exp"},
          {id:"jul_amz",date:"Jul 2 Thu",color:"#60a5fa",type:"",name:"Amazon — Dani",tag:"ATN",tagCls:"t-atn",sub:"Auto-charge ~$16",amt:"−$16",amtCls:"exp"},
          {id:"jul_self",date:"Jul 2 Thu",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"Auto-charge ~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"jul_stearns1",date:"Jul 3 Fri",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"~$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"jul_sp1",date:"Jul 3 Fri",color:"#3dd68c",type:"",name:"July Spending batch available + reimburse ·1244",tag:"Spending · ATN · ARRIVES",tagCls:"t-sp",sub:"External batch arrives in Cap One Spending: +$2,169. First ·1244 reimbursement is deferred to Jul 6 (after the permanent buffer batch lands), so ATN is not squeezed before the buffer arrives.",amt:"+$2,169",amtCls:"sav"},
          {id:"jul_sf",date:"Jul 3 Fri",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"jul_rentins",date:"Jul 3 Fri",color:"#a78bfa",type:"",name:"Renter’s Insurance",tag:"Autopay",tagCls:"t-ap",sub:"Final month. ~$85. Cancels after closing.",amt:"−$85",amtCls:"exp"},
          {id:"jul_cs1",date:"Jul 3 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"jul_groc1",date:"Jul 4 Sat",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$250",amt:"−$250",amtCls:"exp"},
          {id:"jul_fuel1",date:"Jul 4 Sat",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"jul_lead",date:"Jul 4 Sat",color:"#a78bfa",type:"",name:"Lead Bank",tag:"Autopay",tagCls:"t-ap",sub:"~$32",amt:"−$32",amtCls:"exp"},
          {id:"jul_gone",date:"Jul 4 Sat",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"~$9.99",amt:"−$9.99",amtCls:"exp"},
          {id:"jul_cell",date:"Jul 5 Sun",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"~$350",amt:"−$350",amtCls:"exp"},
          {id:"jul_wash",date:"Jul 6 Mon",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"~$60",amt:"−$60",amtCls:"exp"},
        ],
        balStrips: [
          {
            label: "After Jul 1–6 · Permanent ATN buffer funded · ·1244 restored · Stearns",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$1,352",total:false},
            ],
          },
        ],
      },
      {
        label: "Jul 7–14 · Insurance · PayPal · Move funds to Cap One",
        events: [
          {id:"jul_origin",date:"Jul 8 Wed",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"~$33",amt:"−$33",amtCls:"exp"},
          {id:"jul_autoins",date:"Jul 9 Thu",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300",amt:"−$300",amtCls:"exp"},
          {id:"jul_plaid",date:"Jul 9 Thu",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"~$6",amt:"−$6",amtCls:"exp"},
          {id:"jul_spot",date:"Jul 10 Fri",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"~$25",amt:"−$25",amtCls:"exp"},
          {id:"jul_cs2",date:"Jul 10 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"jul_kids",date:"Jul 10 Fri",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"jul_pp",date:"Jul 11 Sat",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"~$42",amt:"−$42",amtCls:"exp"},
          {id:"jul_shop",date:"Jul 11 Sat",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"jul_anth",date:"Jul 13 Mon",color:"#3dd68c",type:"",name:"Anthropic",tag:"Spending",tagCls:"t-sp",sub:"~$20",amt:"−$20",amtCls:"exp"},
          {id:"jul_movecapon",date:"Jul 13 Mon",color:"#00d4d4",type:"sev",name:"Initiate closing-bucket move: Stearns ·3046/·4182 → Cap One",tag:"SAVINGS · EXTERNAL",tagCls:"t-sav",sub:"Initiate external move of current Stearns ·3046 (~$440) and ·4182 (~$900). Funds are in transit until Jul 17. Once they arrive, keep them in the matching Cap One closing buckets.",amt:"−$1,340 pending",amtCls:"act"},
        ],
        balStrips: [
          {
            label: "After Jul 7–14 · Insurance · PayPal · Moving funds",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$1,352",total:false},
            ],
          },
        ],
      },
      {
        label: "Jul 15–22 · Apex · Rent · Stearns · Auto loans",
        events: [
          {id:"jul_apex",date:"Jul 15 Wed",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"jul_rent",date:"Jul 15 Wed",color:"#a78bfa",type:"",name:"Rent — second to last payment",tag:"Autopay · ACTION",tagCls:"t-ap",sub:"Pay manually. $1,910. Apex lands first — pay rent immediately after. Last rent is Aug 1.",amt:"−$1,910",amtCls:"exp"},
          {id:"jul_yost",date:"Jul 15 Wed",color:"#a78bfa",type:"",name:"Yost",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"jul_citi",date:"Jul 15 Wed",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Pay $40/mo toward Citi ·5079 through Dec. Balance after this payment: ~$1,640 before interest.",amt:"−$40",amtCls:"exp"},
          {id:"jul_cri",date:"Jul 15 Wed",color:"#60a5fa",type:"",name:"Cricut",tag:"ATN",tagCls:"t-atn",sub:"~$11",amt:"−$11",amtCls:"exp"},
          {id:"jul_fid",date:"Jul 16 Thu",color:"#a78bfa",type:"",name:"Fidelity Roth IRA",tag:"Autopay",tagCls:"t-ap",sub:"Monthly contribution ~$325",amt:"−$325",amtCls:"exp"},
          {id:"jul_stearns2",date:"Jul 17 Fri",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN · SAVINGS · ARRIVES",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"jul_sp2",date:"Jul 17 Fri",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse the July Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"jul_cs3",date:"Jul 17 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"jul_gplay",date:"Jul 17 Fri",color:"#3dd68c",type:"",name:"Google Play",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"jul_groc2",date:"Jul 18 Sat",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"jul_fuel2",date:"Jul 18 Sat",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"jul_automike",date:"Jul 18 Sat",color:"#a78bfa",type:"",name:"Auto Loan — Mike",tag:"Autopay",tagCls:"t-ap",sub:"~$725",amt:"−$725",amtCls:"exp"},
          {id:"jul_autodani",date:"Jul 19 Sun",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$750",amt:"−$750",amtCls:"exp"},
          {id:"jul_internet",date:"Jul 22 Wed",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"~$65",amt:"−$65",amtCls:"exp"},
        ],
        balStrips: [
          {
            label: "After Jul 15–22 · Apex + Rent + Stearns + Loans",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$552",total:false},
            ],
          },
        ],
      },
      {
        label: "Jul 23–31 · Late bills · BONUS · Closing fund complete",
        events: [
          {id:"jul_cs4",date:"Jul 24 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"jul_kids2",date:"Jul 24 Fri",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"jul_apple",date:"Jul 25 Sat",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"~$15",amt:"−$15",amtCls:"exp"},
          {id:"jul_pets",date:"Jul 25 Sat",color:"#3dd68c",type:"",name:"Pets",tag:"Spending",tagCls:"t-sp",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"jul_blink",date:"Jul 26 Sun",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"jul_rail",date:"Jul 27 Mon",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"jul_shop2",date:"Jul 27 Mon",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"jul_bfit",date:"Jul 28 Tue",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"jul_ringcam",date:"Jul 29 Wed",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"jul_bonus",date:"Jul 31 Fri",color:"#a78bfa",type:"",name:"Apex paycheck + BONUS $2,800",tag:"Autopay · KEY DATE",tagCls:"t-ap",sub:"Bi-monthly Apex $2,300 + quarterly bonus $2,800 = $5,100 deposited to Autopay.",amt:"+$5,100",amtCls:"inc"},
          {id:"jul_stearns3",date:"Jul 31 Fri",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"jul_cs5",date:"Jul 31 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"jul_elec",date:"Jul 31 Fri",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid AFTER second Stearns. ~$339 combined.",amt:"−$339",amtCls:"exp"},
          {id:"jul_groc3",date:"Jul 31 Fri",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"jul_fuel3",date:"Jul 31 Fri",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"jul_sp3",date:"Jul 31 Fri",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse the July Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"jul_bonus_split",date:"Jul 31 Fri",color:"#00d4d4",type:"sev",name:"Bonus $2,800 → Cap One closing/savings buckets",tag:"SAVINGS · INTERNAL",tagCls:"t-sav",sub:"Keep the whole bonus inside Cap One: $700 to Cap One ·3046, $700 to Cap One ·4182, and $1,400 to Cap One Personal Savings/HYSA. No Liberty transfer needed.",amt:"$700 / $700 / $1,400",amtCls:"sav"},
        ],
        balStrips: [
          {
            label: "July 31 END · Bonus deployed · Closing fund ready",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$2,837",total:false},
            ],
          },
        ],
      },
    ],
  },
  {
    id: "aug",
    title: "August 2026",
    meta: "Last rent Aug 1 · Closing ~Aug 14 · $8,000 wire · Keys in hand · Mortgage budgeted Sep 1, verify actual first due date",
    badge: "CLOSING MONTH",
    weeks: [
      {
        label: "Aug 1–13 · Last rent · Pre-closing · All bills current",
        events: [
          {id:"aug_lastrent",date:"Aug 1 Sat",color:"#a78bfa",type:"",name:"LAST RENT EVER — $1,910",tag:"Autopay · MILESTONE",tagCls:"t-ap",sub:"Pay manually. Final apartment rent. Never again after this.",amt:"−$1,910",amtCls:"exp"},
          {id:"aug_neon",date:"Aug 1 Sat",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"aug_amz",date:"Aug 1 Sat",color:"#60a5fa",type:"",name:"Amazon — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$16",amt:"−$16",amtCls:"exp"},
          {id:"aug_self",date:"Aug 2 Sun",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"aug_rentins",date:"Aug 3 Mon",color:"#a78bfa",type:"",name:"Renter’s Insurance — FINAL month",tag:"Autopay",tagCls:"t-ap",sub:"~$85. Cancel after closing.",amt:"−$85",amtCls:"exp"},
          {id:"aug_sf",date:"Aug 3 Mon",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"aug_lead",date:"Aug 4 Tue",color:"#a78bfa",type:"",name:"Lead Bank",tag:"Autopay",tagCls:"t-ap",sub:"~$32",amt:"−$32",amtCls:"exp"},
          {id:"aug_gone",date:"Aug 4 Tue",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"~$9.99",amt:"−$9.99",amtCls:"exp"},
          {id:"aug_cell",date:"Aug 5 Wed",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"~$350",amt:"−$350",amtCls:"exp"},
          {id:"aug_wash",date:"Aug 6 Thu",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"~$60",amt:"−$60",amtCls:"exp"},
          {id:"aug_groc1",date:"Aug 6 Thu",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$250",amt:"−$250",amtCls:"exp"},
          {id:"aug_fuel1",date:"Aug 6 Thu",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"aug_cs1",date:"Aug 7 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"aug_kids",date:"Aug 7 Fri",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"aug_origin",date:"Aug 8 Sat",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"~$33",amt:"−$33",amtCls:"exp"},
          {id:"aug_autoins",date:"Aug 9 Sun",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300",amt:"−$300",amtCls:"exp"},
          {id:"aug_plaid",date:"Aug 9 Sun",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"~$6",amt:"−$6",amtCls:"exp"},
          {id:"aug_spot",date:"Aug 10 Mon",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"~$25",amt:"−$25",amtCls:"exp"},
          {id:"aug_pp",date:"Aug 11 Tue",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"~$42",amt:"−$42",amtCls:"exp"},
          {id:"aug_shop",date:"Aug 11 Tue",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"aug_anth",date:"Aug 13 Thu",color:"#3dd68c",type:"",name:"Anthropic",tag:"Spending",tagCls:"t-sp",sub:"~$20",amt:"−$20",amtCls:"exp"},
          {id:"aug_confirm",date:"~Aug 13",color:"#fb923c",type:"",name:"Confirm closing wire with lender",tag:"ACTION",tagCls:"t-act",sub:"Confirm wire: Liberty $5,260 + Cap One closing buckets $2,740 = $8,000. Cap One buckets include ·3046/·4182 plus the extra bonus money that stayed inside Cap One. Cancel renter’s insurance after keys.",amt:"confirm",amtCls:"act"},
        ],
        balStrips: [
          {
            label: "Aug 1–13 · Last rent paid · Pre-closing",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$810",total:false},
            ],
          },
        ],
      },
      {
        label: "~Aug 14 · CLOSING DAY · Keys in hand · First home",
        events: [
          {id:"aug_close",date:"~Aug 14 Fri",color:"#fb923c",type:"",name:"CLOSING DAY — wire $8,000 cash to close",tag:"CLOSING",tagCls:"t-key",sub:"Wire: Liberty $5,260 + Cap One closing buckets $2,740 = $8,000. Sign documents. GET KEYS. Set up mortgage autopay from Autopay ·9785. Cancel renter’s insurance. Mortgage remains budgeted Sep 1 conservatively.",amt:"−$8,000",amtCls:"exp"},
          {id:"aug_apex",date:"Aug 14 Fri",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"aug_sp_batch_init",date:"Aug 10 Mon",color:"#00d4d4",type:"sev",name:"Initiate Aug Spending batch: Stearns ·1244 → Cap One Spending",tag:"SAVINGS · Spending · EXTERNAL · ATN",tagCls:"t-sav",sub:"One external batch covers both Aug Spending funding cycles. Funds arrive on the first Spending funding date. Reimburse ·1244 from ATN internally on each Stearns payday.",amt:"−$1,446 pending",amtCls:"trn"},
          {id:"aug_sp1",date:"Aug 14 Fri",color:"#3dd68c",type:"",name:"Aug Spending batch available + reimburse ·1244",tag:"Spending · ATN · ARRIVES",tagCls:"t-sp",sub:"External batch arrives in Cap One Spending: +$1,446. After the Stearns paycheck lands, subtransfer $723 internally from ATN to Stearns ·1244 as reimbursement #1.",amt:"+$1,446 / −$723",amtCls:"trn"},
          {id:"aug_cs2",date:"Aug 14 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"aug_yost",date:"Aug 15 Sat",color:"#a78bfa",type:"",name:"Yost",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"aug_cri",date:"Aug 15 Sat",color:"#60a5fa",type:"",name:"Cricut",tag:"ATN",tagCls:"t-atn",sub:"~$11",amt:"−$11",amtCls:"exp"},
          {id:"aug_fid",date:"Aug 16 Sun",color:"#a78bfa",type:"",name:"Fidelity Roth IRA",tag:"Autopay",tagCls:"t-ap",sub:"~$325",amt:"−$325",amtCls:"exp"},
          {id:"aug_groc2",date:"Aug 17 Mon",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"aug_gplay",date:"Aug 17 Mon",color:"#3dd68c",type:"",name:"Google Play",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"aug_automike",date:"Aug 18 Tue",color:"#a78bfa",type:"",name:"Auto Loan — Mike",tag:"Autopay",tagCls:"t-ap",sub:"~$725",amt:"−$725",amtCls:"exp"},
          {id:"aug_autodani",date:"Aug 19 Wed",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$750",amt:"−$750",amtCls:"exp"},
          {id:"aug_fuel2",date:"Aug 19 Wed",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
        ],
        balStrips: [
          {
            label: "After Aug 14–20 · CLOSED · Keys in hand · Paychecks",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$1,960",total:false},
            ],
          },
        ],
      },
      {
        label: "Aug 21–31 · Late bills · Stearns · Second Apex · Home",
        events: [
          {id:"aug_cs3",date:"Aug 21 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"aug_kids2",date:"Aug 21 Fri",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"aug_shop2",date:"Aug 22 Sat",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"aug_apple",date:"Aug 25 Tue",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"~$15",amt:"−$15",amtCls:"exp"},
          {id:"aug_pets",date:"Aug 25 Tue",color:"#3dd68c",type:"",name:"Pets",tag:"Spending",tagCls:"t-sp",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"aug_rail",date:"Aug 27 Thu",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"aug_stearns2",date:"Aug 28 Fri",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"aug_sp2",date:"Aug 28 Fri",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse this month’s Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"aug_elec",date:"Aug 28 Fri",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid AFTER second Stearns. ~$339.",amt:"−$339",amtCls:"exp"},
          {id:"aug_internet",date:"Aug 28 Fri",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"~$65",amt:"−$65",amtCls:"exp"},
          {id:"aug_blink",date:"Aug 28 Fri",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"aug_bfit",date:"Aug 28 Fri",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"aug_cs4",date:"Aug 28 Fri",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"aug_groc3",date:"Aug 28 Fri",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"aug_fuel3",date:"Aug 29 Sat",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"aug_apex2",date:"Aug 29 Sat",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"aug_ringcam",date:"Aug 29 Sat",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"aug_citi",date:"Aug 29 Sat",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Pay $40/mo toward Citi ·5079 through Dec. Balance after this payment: ~$1,600 before interest.",amt:"−$40",amtCls:"exp"},
        ],
        balStrips: [
          {
            label: "August 31 END · First home month done · Sep mortgage ready",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$4,205",total:false},
            ],
          },
        ],
      },
    ],
  },
  {
    id: "sep",
    title: "September 2026",
    meta: "Mortgage $3,588 · First month in new home · Open HYSA · Stearns surplus sweep",
    badge: "FIRST MORTGAGE",
    weeks: [
      {
        label: "Sep 1–10 · First mortgage · HYSA · Early bills",
        events: [
          {id:"br_init_Sep",date:"Aug 27",color:"#f0a500",type:"",name:"Initiate CS → Autopay bridge",tag:"CS · Autopay",tagCls:"t-cs",sub:"Start this external transfer ~5 days early (CS is a separate group). $500 moves to Autopay to cover the Sep 1 mortgage + utility wave before the Apex paychecks land. CS carries $3,500–5,800 idle, so this is comfortably funded.",amt:"−$500 pending",amtCls:"exp"},
          {id:"br_arr_Sep",date:"Sep 1",color:"#a78bfa",type:"",name:"CS bridge available in Autopay",tag:"Autopay",tagCls:"t-ap",sub:"The $500 CS bridge lands in Autopay before the Sep 1 mortgage pull. Keep it in Autopay — do not sweep. This is what keeps Autopay positive through the mortgage + utilities on the 1st.",amt:"+$500",amtCls:"inc"},
          {id:"sep_mort",date:"Sep 1",color:"#a78bfa",type:"",name:"Mortgage — $3,588/mo",tag:"Autopay · KEY DATE",tagCls:"t-ap",sub:"Budgeted conservatively as Sep 1. Verify actual first due date with the Closing Disclosure / mortgage welcome letter; if it is Oct 1, this creates extra cushion.",amt:"−$3,588",amtCls:"exp"},
          {id:"sep_neon",date:"Sep 1",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"sep_trash",date:"Sep 1",color:"#a78bfa",type:"",name:"Trash",tag:"Autopay",tagCls:"t-ap",sub:"Verify date from first statement. ~$12",amt:"−~$12",amtCls:"exp"},
          {id:"sep_water",date:"Sep 1",color:"#a78bfa",type:"",name:"Water",tag:"Autopay",tagCls:"t-ap",sub:"Verify date from first statement. ~$100",amt:"−~$100",amtCls:"exp"},
          {id:"sep_gas",date:"Sep 1",color:"#a78bfa",type:"",name:"Gas",tag:"Autopay",tagCls:"t-ap",sub:"Verify date from first statement. ~$100",amt:"−~$100",amtCls:"exp"},
          {id:"sep_hysa",date:"Sep 2 Wed",color:"#fb923c",type:"sev",name:"Open HYSA + keep Stearns transfer float",tag:"ACTION · EFFICIENCY",tagCls:"t-act",sub:"Move savings to HYSA, but leave a ~$1,500 Stearns ·1244 transfer float. That float pre-funds future Stearns→Cap One batches so Spending funding is not stuck in 4-business-day limbo.",amt:"move excess to HYSA",amtCls:"sav"},
          {id:"sep_amz",date:"Sep 2",color:"#60a5fa",type:"",name:"Amazon — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$16",amt:"−$16",amtCls:"exp"},
          {id:"sep_self",date:"Sep 2",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"sep_sf",date:"Sep 3",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"sep_lead",date:"Sep 4",color:"#a78bfa",type:"",name:"Lead Bank",tag:"Autopay",tagCls:"t-ap",sub:"~$32",amt:"−$32",amtCls:"exp"},
          {id:"sep_gone",date:"Sep 4",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"~$9.99",amt:"−$9.99",amtCls:"exp"},
          {id:"sep_cs1",date:"Sep 4",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"sep_cell",date:"Sep 5",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"~$350",amt:"−$350",amtCls:"exp"},
          {id:"sep_wash",date:"Sep 6",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"~$60",amt:"−$60",amtCls:"exp"},
          {id:"sep_groc1",date:"Sep 7",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$250",amt:"−$250",amtCls:"exp"},
          {id:"sep_fuel1",date:"Sep 7",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"sep_origin",date:"Sep 8",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"~$33",amt:"−$33",amtCls:"exp"},
          {id:"sep_autoins",date:"Sep 9",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300 — shop home bundle now",amt:"−$300",amtCls:"exp"},
          {id:"sep_plaid",date:"Sep 9",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"~$6",amt:"−$6",amtCls:"exp"},
          {id:"sep_pp",date:"Sep 9",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"~$42",amt:"−$42",amtCls:"exp"},
          {id:"sep_spot",date:"Sep 10",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"~$25",amt:"−$25",amtCls:"exp"},
        ],
      },
      {
        label: "Sep 11–14 · Stearns · Transfer · CS",
        events: [
          {id:"sep_stearns1",date:"Sep 11",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"sep_sp_batch_init",date:"Sep 7 Mon",color:"#00d4d4",type:"sev",name:"Initiate Sep Spending batch: Stearns ·1244 → Cap One Spending",tag:"SAVINGS · Spending · EXTERNAL · Spending · ATN · ARRIVES",tagCls:"t-sav",sub:"One external batch covers both Sep Spending funding cycles. Funds arrive on the first Spending funding date. Reimburse ·1244 from ATN internally on each Stearns payday.",amt:"−$1,446 pending",amtCls:"trn"},
          {id:"sep_cs2",date:"Sep 11",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"sep_kids",date:"Sep 11",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"sep_anth",date:"Sep 13",color:"#3dd68c",type:"",name:"Anthropic",tag:"Spending",tagCls:"t-sp",sub:"~$20",amt:"−$20",amtCls:"exp"},
          {id:"sep_shop1",date:"Sep 14",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
        ],
      },
      {
        label: "Sep 15–22 · Apex · Auto loans · Mid-month bills",
        events: [
          {id:"sep_apex",date:"Sep 15",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"sep_yost",date:"Sep 15",color:"#a78bfa",type:"",name:"Yost",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"sep_citi",date:"Sep 15",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Pay $40/mo toward Citi ·5079 through Dec. Balance after this payment: ~$1,560 before interest.",amt:"−$40",amtCls:"exp"},
          {id:"sep_cri",date:"Sep 17",color:"#60a5fa",type:"",name:"Cricut",tag:"ATN",tagCls:"t-atn",sub:"~$11",amt:"−$11",amtCls:"exp"},
          {id:"sep_fid",date:"Sep 16",color:"#a78bfa",type:"",name:"Fidelity Roth IRA",tag:"Autopay",tagCls:"t-ap",sub:"~$325",amt:"−$325",amtCls:"exp"},
          {id:"sep_cs3",date:"Sep 18",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"sep_gplay",date:"Sep 18",color:"#3dd68c",type:"",name:"Google Play",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"sep_automike",date:"Sep 18",color:"#a78bfa",type:"",name:"Auto Loan — Mike",tag:"Autopay",tagCls:"t-ap",sub:"~$725",amt:"−$725",amtCls:"exp"},
          {id:"sep_autodani",date:"Sep 19",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$750",amt:"−$750",amtCls:"exp"},
          {id:"sep_groc2",date:"Sep 20",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"sep_fuel2",date:"Sep 20",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"sep_internet",date:"Sep 22",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"~$65",amt:"−$65",amtCls:"exp"},
        ],
      },
      {
        label: "Sep 22–30 · Late bills · Stearns · Apex · HYSA sweep",
        events: [
          {id:"sep_apple",date:"Sep 25",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"~$15",amt:"−$15",amtCls:"exp"},
          {id:"sep_pets",date:"Sep 24",color:"#3dd68c",type:"",name:"Pets",tag:"Spending",tagCls:"t-sp",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"sep_blink",date:"Sep 26",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"sep_stearns2",date:"Sep 25",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"sep_sp2",date:"Sep 25",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse this month’s Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"sep_elec",date:"Sep 25",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid AFTER second Stearns. ~$339.",amt:"−$339",amtCls:"exp"},
          {id:"sep_cs4",date:"Sep 25",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"sep_rail",date:"Sep 27",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"sep_groc3",date:"Sep 27",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"sep_shop2",date:"Sep 27",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"sep_fuel3",date:"Sep 29",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"sep_bfit",date:"Sep 28",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"sep_ring",date:"Sep 29",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"sep_cs5",date:"Sep 30",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"sep_apex2",date:"Sep 30",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"sep_sweep",date:"Sep 30",color:"#00d4d4",type:"sev",name:"Sweep idle CS surplus → HYSA",tag:"EFFICIENCY · Autopay · HYSA · INTERNAL",tagCls:"t-eff",sub:"Move CS balance above ~$2,500 into HYSA. CS quietly accumulates ~$475/mo — sweep the excess so it earns 4.5% instead of sitting dead in checking.",amt:"→ HYSA",amtCls:"sav"},
        ],
        balStrips: [
          {
            label: "Sep 30 END · First full mortgage month done",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$5,268",total:false},
            ],
          },
        ],
      },
    ],
  },
  {
    id: "oct",
    title: "October 2026",
    meta: "Quarterly bonus $2,800 · Dani house sale ~$50k → HYSA · Savings surge",
    badge: "BONUS + WINDFALL",
    weeks: [
      {
        label: "Oct 1–10 · Mortgage · Early bills",
        events: [
          {id:"br_init_Oct",date:"Sep 26",color:"#f0a500",type:"",name:"Initiate CS → Autopay bridge",tag:"CS · Autopay",tagCls:"t-cs",sub:"Start this external transfer ~5 days early (CS is a separate group). $500 moves to Autopay to cover the Oct 1 mortgage + utility wave before the Apex paychecks land. CS carries $3,500–5,800 idle, so this is comfortably funded.",amt:"−$500 pending",amtCls:"exp"},
          {id:"br_arr_Oct",date:"Oct 1",color:"#a78bfa",type:"",name:"CS bridge available in Autopay",tag:"Autopay",tagCls:"t-ap",sub:"The $500 CS bridge lands in Autopay before the Oct 1 mortgage pull. Keep it in Autopay — do not sweep. This is what keeps Autopay positive through the mortgage + utilities on the 1st.",amt:"+$500",amtCls:"inc"},
          {id:"oct_mort",date:"Oct 1",color:"#a78bfa",type:"",name:"Mortgage — $3,588/mo",tag:"Autopay",tagCls:"t-ap",sub:"Pay manually until autopay confirmed. PITI.",amt:"−$3,588",amtCls:"exp"},
          {id:"oct_neon",date:"Oct 1",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"oct_trash",date:"Oct 1",color:"#a78bfa",type:"",name:"Trash",tag:"Autopay",tagCls:"t-ap",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"oct_water",date:"Oct 1",color:"#a78bfa",type:"",name:"Water",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"oct_gas",date:"Oct 1",color:"#a78bfa",type:"",name:"Gas",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"oct_amz",date:"Oct 2",color:"#60a5fa",type:"",name:"Amazon — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$16",amt:"−$16",amtCls:"exp"},
          {id:"oct_self",date:"Oct 2",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"oct_sf",date:"Oct 3",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"oct_lead",date:"Oct 4",color:"#a78bfa",type:"",name:"Lead Bank",tag:"Autopay",tagCls:"t-ap",sub:"~$32",amt:"−$32",amtCls:"exp"},
          {id:"oct_gone",date:"Oct 4",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"~$9.99",amt:"−$9.99",amtCls:"exp"},
          {id:"oct_cs1",date:"Oct 2",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"oct_cell",date:"Oct 5",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"~$350",amt:"−$350",amtCls:"exp"},
          {id:"oct_wash",date:"Oct 6",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"~$60",amt:"−$60",amtCls:"exp"},
          {id:"oct_groc1",date:"Oct 6",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$250",amt:"−$250",amtCls:"exp"},
          {id:"oct_fuel1",date:"Oct 7",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"oct_origin",date:"Oct 8",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"~$33",amt:"−$33",amtCls:"exp"},
          {id:"oct_autoins",date:"Oct 9",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300",amt:"−$300",amtCls:"exp"},
          {id:"oct_plaid",date:"Oct 9",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"~$6",amt:"−$6",amtCls:"exp"},
          {id:"oct_pp",date:"Oct 9",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"~$42",amt:"−$42",amtCls:"exp"},
          {id:"oct_spot",date:"Oct 10",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"~$25",amt:"−$25",amtCls:"exp"},
          {id:"oct_sams",date:"Oct 10",color:"#3dd68c",type:"",name:"Sam’s Club annual fee",tag:"Spending",tagCls:"t-sp",sub:"Annual ~$65",amt:"−$65",amtCls:"exp"},
        ],
      },
      {
        label: "Oct 11–14 · Stearns · Transfer · CS",
        events: [
          {id:"oct_stearns1",date:"Oct 9",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"oct_sp_batch_init",date:"Oct 5 Mon",color:"#00d4d4",type:"sev",name:"Initiate Oct Spending batch: Stearns ·1244 → Cap One Spending",tag:"SAVINGS · Spending · EXTERNAL · Spending · ATN · ARRIVES",tagCls:"t-sav",sub:"One external batch covers both Oct Spending funding cycles. Funds arrive on the first Spending funding date. Reimburse ·1244 from ATN internally on each Stearns payday.",amt:"−$1,446 pending",amtCls:"trn"},
          {id:"oct_cs2",date:"Oct 9",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"oct_kids",date:"Oct 9",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"oct_anth",date:"Oct 13",color:"#3dd68c",type:"",name:"Anthropic",tag:"Spending",tagCls:"t-sp",sub:"~$20",amt:"−$20",amtCls:"exp"},
          {id:"oct_shop1",date:"Oct 14",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
        ],
      },
      {
        label: "Oct 15–22 · Apex · Auto loans · Mid-month bills",
        events: [
          {id:"oct_apex",date:"Oct 15",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"oct_yost",date:"Oct 15",color:"#a78bfa",type:"",name:"Yost",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"oct_citi",date:"Oct 15",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Pay $40/mo toward Citi ·5079 through Dec. Balance after this payment: ~$1,520 before interest.",amt:"−$40",amtCls:"exp"},
          {id:"oct_cri",date:"Oct 17",color:"#60a5fa",type:"",name:"Cricut",tag:"ATN",tagCls:"t-atn",sub:"~$11",amt:"−$11",amtCls:"exp"},
          {id:"oct_fid",date:"Oct 16",color:"#a78bfa",type:"",name:"Fidelity Roth IRA",tag:"Autopay",tagCls:"t-ap",sub:"~$325",amt:"−$325",amtCls:"exp"},
          {id:"oct_cs3",date:"Oct 16",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"oct_gplay",date:"Oct 17",color:"#3dd68c",type:"",name:"Google Play",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"oct_automike",date:"Oct 18",color:"#a78bfa",type:"",name:"Auto Loan — Mike",tag:"Autopay",tagCls:"t-ap",sub:"~$725",amt:"−$725",amtCls:"exp"},
          {id:"oct_autodani",date:"Oct 19",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$750",amt:"−$750",amtCls:"exp"},
          {id:"oct_groc2",date:"Oct 17",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"oct_fuel2",date:"Oct 20",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"oct_internet",date:"Oct 22",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"~$65",amt:"−$65",amtCls:"exp"},
        ],
      },
      {
        label: "Oct 23–31 · Late bills · BONUS · Dani sale → HYSA",
        events: [
          {id:"oct_apple",date:"Oct 25",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"~$15",amt:"−$15",amtCls:"exp"},
          {id:"oct_pets",date:"Oct 24",color:"#3dd68c",type:"",name:"Pets",tag:"Spending",tagCls:"t-sp",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"oct_blink",date:"Oct 26",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"oct_stearns2",date:"Oct 23",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"oct_sp2",date:"Oct 23",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse this month’s Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"oct_elec",date:"Oct 23",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid AFTER second Stearns. ~$339.",amt:"−$339",amtCls:"exp"},
          {id:"oct_cs4",date:"Oct 23",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"oct_rail",date:"Oct 27",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"oct_groc3",date:"Oct 27",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"oct_shop2",date:"Oct 27",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"oct_fuel3",date:"Oct 28",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"oct_bfit",date:"Oct 28",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"oct_ring",date:"Oct 29",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"oct_cs5",date:"Oct 30",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"oct_bonus",date:"Oct 30",color:"#a78bfa",type:"",name:"Apex BONUS $2,800 — all to HYSA",tag:"Autopay · KEY DATE",tagCls:"t-ap",sub:"Quarterly bonus $2,800 deposited to Autopay, then split $700 each to HYSA sub-accounts. Savings growing fast after Dani’s sale.",amt:"+$2,800 → HYSA",amtCls:"sav"},
          {id:"oct_dani",date:"~late Oct",color:"#00d4d4",type:"",name:"Dani’s house closes — ~$50k net",tag:"WINDFALL",tagCls:"t-key",sub:"Route ALL ~$50k into HYSA (not Liberty/Stearns). At 4.5% vs 0.84% that’s ~$1,856/yr more interest on this money alone. Budget $10-15k for furnishings; leave rest as emergency fund earning 4.5%. Do NOT rush to pay down mortgage principal.",amt:"+~$50,000",amtCls:"inc"},
          {id:"oct_apex2",date:"Oct 30",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"oct_sweep",date:"Oct 30",color:"#00d4d4",type:"sev",name:"Sweep idle CS surplus → HYSA",tag:"EFFICIENCY",tagCls:"t-eff",sub:"Move CS balance above ~$2,500 into HYSA.",amt:"+→ HYSA",amtCls:"sav"},
        ],
        balStrips: [
          {
            label: "Oct 30 END · Bonus · Dani sale · Savings surging",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$5,331",total:false},
            ],
          },
        ],
      },
    ],
  },
  {
    id: "nov",
    title: "November 2026",
    meta: "Mortgage $3,588 · Keep surplus in Autopay · HYSA growing · Citi nearly paid",
    badge: "HOMEOWNER",
    weeks: [
      {
        label: "Nov 1–10 · Mortgage · Early bills · Stearns",
        events: [
          {id:"br_init_Nov",date:"Oct 27",color:"#f0a500",type:"",name:"Initiate CS → Autopay bridge",tag:"CS · Autopay",tagCls:"t-cs",sub:"Start this external transfer ~5 days early (CS is a separate group). $500 moves to Autopay to cover the Nov 1 mortgage + utility wave before the Apex paychecks land. CS carries $3,500–5,800 idle, so this is comfortably funded.",amt:"−$500 pending",amtCls:"exp"},
          {id:"br_arr_Nov",date:"Nov 1",color:"#a78bfa",type:"",name:"CS bridge available in Autopay",tag:"Autopay",tagCls:"t-ap",sub:"The $500 CS bridge lands in Autopay before the Nov 1 mortgage pull. Keep it in Autopay — do not sweep. This is what keeps Autopay positive through the mortgage + utilities on the 1st.",amt:"+$500",amtCls:"inc"},
          {id:"nov_mort",date:"Nov 1",color:"#a78bfa",type:"",name:"Mortgage — $3,588/mo",tag:"Autopay",tagCls:"t-ap",sub:"PITI. Autopay.",amt:"−$3,588",amtCls:"exp"},
          {id:"nov_neon",date:"Nov 1",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"nov_trash",date:"Nov 1",color:"#a78bfa",type:"",name:"Trash",tag:"Autopay",tagCls:"t-ap",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"nov_water",date:"Nov 1",color:"#a78bfa",type:"",name:"Water",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"nov_gas",date:"Nov 1",color:"#a78bfa",type:"",name:"Gas",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"nov_amz",date:"Nov 2",color:"#60a5fa",type:"",name:"Amazon — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$16",amt:"−$16",amtCls:"exp"},
          {id:"nov_self",date:"Nov 2",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"nov_sf",date:"Nov 3",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"nov_lead",date:"Nov 4",color:"#a78bfa",type:"",name:"Lead Bank",tag:"Autopay",tagCls:"t-ap",sub:"~$32",amt:"−$32",amtCls:"exp"},
          {id:"nov_gone",date:"Nov 4",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"~$9.99",amt:"−$9.99",amtCls:"exp"},
          {id:"nov_cs1",date:"Nov 4",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"nov_cell",date:"Nov 5",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"~$350",amt:"−$350",amtCls:"exp"},
          {id:"nov_wash",date:"Nov 6",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"~$60",amt:"−$60",amtCls:"exp"},
          {id:"nov_groc1",date:"Nov 7",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$250",amt:"−$250",amtCls:"exp"},
          {id:"nov_fuel1",date:"Nov 7",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"nov_origin",date:"Nov 8",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"~$33",amt:"−$33",amtCls:"exp"},
          {id:"nov_autoins",date:"Nov 9",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300",amt:"−$300",amtCls:"exp"},
          {id:"nov_plaid",date:"Nov 9",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"~$6",amt:"−$6",amtCls:"exp"},
          {id:"nov_pp",date:"Nov 9",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"~$42",amt:"−$42",amtCls:"exp"},
          {id:"nov_spot",date:"Nov 10",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"~$25",amt:"−$25",amtCls:"exp"},
        ],
      },
      {
        label: "Nov 11–14 · CS / buffer week",
        events: [
          {id:"nov_stearns1",date:"Nov 6",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"nov_sp_batch_init",date:"Nov 2 Mon",color:"#00d4d4",type:"sev",name:"Initiate Nov Spending batch: Stearns ·1244 → Cap One Spending",tag:"SAVINGS · Spending · EXTERNAL · Spending · ATN · ARRIVES",tagCls:"t-sav",sub:"One external batch covers both Nov Spending funding cycles. Funds arrive on the first Spending funding date. Reimburse ·1244 from ATN internally on each Stearns payday.",amt:"−$1,446 pending",amtCls:"trn"},
          {id:"nov_cs2",date:"Nov 11",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"nov_kids",date:"Nov 11",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"nov_anth",date:"Nov 13",color:"#3dd68c",type:"",name:"Anthropic",tag:"Spending",tagCls:"t-sp",sub:"~$20",amt:"−$20",amtCls:"exp"},
          {id:"nov_shop1",date:"Nov 14",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
        ],
      },
      {
        label: "Nov 15–22 · Apex · Auto loans · Mid-month bills",
        events: [
          {id:"nov_apex",date:"Nov 15",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"nov_yost",date:"Nov 15",color:"#a78bfa",type:"",name:"Yost",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"nov_citi",date:"Nov 15",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Pay $40/mo toward Citi ·5079 through Dec. Balance after this payment: ~$1,480 before interest.",amt:"−$40",amtCls:"exp"},
          {id:"nov_cri",date:"Nov 17",color:"#60a5fa",type:"",name:"Cricut",tag:"ATN",tagCls:"t-atn",sub:"~$11",amt:"−$11",amtCls:"exp"},
          {id:"nov_fid",date:"Nov 16",color:"#a78bfa",type:"",name:"Fidelity Roth IRA",tag:"Autopay",tagCls:"t-ap",sub:"~$325",amt:"−$325",amtCls:"exp"},
          {id:"nov_cs3",date:"Nov 18",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"nov_gplay",date:"Nov 18",color:"#3dd68c",type:"",name:"Google Play",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"nov_automike",date:"Nov 18",color:"#a78bfa",type:"",name:"Auto Loan — Mike",tag:"Autopay",tagCls:"t-ap",sub:"~$725",amt:"−$725",amtCls:"exp"},
          {id:"nov_autodani",date:"Nov 19",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$750",amt:"−$750",amtCls:"exp"},
          {id:"nov_groc2",date:"Nov 20",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"nov_fuel2",date:"Nov 20",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"nov_internet",date:"Nov 22",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"~$65",amt:"−$65",amtCls:"exp"},
        ],
      },
      {
        label: "Nov 20–30 · Late bills · Stearns · Apex · Hold Autopay",
        events: [
          {id:"nov_apple",date:"Nov 25",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"~$15",amt:"−$15",amtCls:"exp"},
          {id:"nov_pets",date:"Nov 25",color:"#3dd68c",type:"",name:"Pets",tag:"Spending",tagCls:"t-sp",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"nov_blink",date:"Nov 26",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"nov_stearns2",date:"Nov 20",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"nov_sp2",date:"Nov 20",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse this month’s Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"nov_elec",date:"Nov 27",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid AFTER second Stearns. ~$339.",amt:"−$339",amtCls:"exp"},
          {id:"nov_cs4",date:"Nov 27",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"nov_rail",date:"Nov 27",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"nov_groc3",date:"Nov 28",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"nov_shop2",date:"Nov 28",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"nov_fuel3",date:"Nov 29",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"nov_bfit",date:"Nov 28",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"nov_ring",date:"Nov 29",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"nov_cs5",date:"Nov 30",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"nov_apex2",date:"Nov 30",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"nov_keep",date:"Nov 30",color:"#a78bfa",type:"",name:"Keep surplus in Autopay — skip savings sweep",tag:"Autopay",tagCls:"t-ap",sub:"Skip the sweep this month. $3,588 mortgage keeps Autopay lean in November — keep surplus in Autopay to stay comfortable. Resume sweep after Jan when $3,356 mortgage reduces pressure.",amt:"stays in Autopay",amtCls:"trn"},
          {id:"nov_sweep",date:"Nov 30",color:"#00d4d4",type:"sev",name:"Sweep idle CS surplus → HYSA",tag:"EFFICIENCY",tagCls:"t-eff",sub:"Move CS balance above ~$2,500 into HYSA. ATN and Spending surpluses can go here too.",amt:"+→ HYSA",amtCls:"sav"},
        ],
        balStrips: [
          {
            label: "Nov 30 END · Dec transfer batches pending",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$5,394",total:false},
            ],
          },
        ],
      },
    ],
  },
  {
    id: "dec",
    title: "December 2026",
    meta: "Final $3,588 mortgage · Autopay protected · Year-end HYSA sweep · Jan rate drops to $3,356",
    badge: "YEAR END",
    weeks: [
      {
        label: "Dec 1–10 · Final $3,588 mortgage · Early bills · Stearns",
        events: [
          {id:"dec_sp_batch_init",date:"Nov 30 Mon",color:"#00d4d4",type:"sev",name:"Initiate Dec Spending batch: Stearns ·1244 → Cap One Spending",tag:"SAVINGS · Spending · EXTERNAL · CS · Autopay",tagCls:"t-sav",sub:"One external batch covers both Dec Spending funding cycles. Funds arrive on the first Spending funding date. Reimburse ·1244 from ATN internally on each Stearns payday.",amt:"−$1,446 pending",amtCls:"trn"},
          {id:"br_arr_Dec",date:"Dec 1",color:"#a78bfa",type:"",name:"CS bridge available in Autopay",tag:"Autopay",tagCls:"t-ap",sub:"The $500 CS bridge lands in Autopay before the Dec 1 mortgage pull. Keep it in Autopay — do not sweep. This is what keeps Autopay positive through the mortgage + utilities on the 1st.",amt:"+$500",amtCls:"inc"},
          {id:"dec_mort",date:"Dec 1",color:"#a78bfa",type:"",name:"Mortgage — $3,588/mo",tag:"Autopay",tagCls:"t-ap",sub:"Last month at $3,588. Jan drops to $3,356.",amt:"−$3,588",amtCls:"exp"},
          {id:"dec_neon",date:"Dec 1",color:"#3dd68c",type:"",name:"Neon Tech",tag:"Spending",tagCls:"t-sp",sub:"~$3.76",amt:"−$3.76",amtCls:"exp"},
          {id:"dec_trash",date:"Dec 1",color:"#a78bfa",type:"",name:"Trash",tag:"Autopay",tagCls:"t-ap",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"dec_water",date:"Dec 1",color:"#a78bfa",type:"",name:"Water",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"dec_gas",date:"Dec 1",color:"#a78bfa",type:"",name:"Gas",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"dec_amz",date:"Dec 2",color:"#60a5fa",type:"",name:"Amazon — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$16",amt:"−$16",amtCls:"exp"},
          {id:"dec_self",date:"Dec 2",color:"#3dd68c",type:"",name:"Self Financial",tag:"Spending",tagCls:"t-sp",sub:"~$6.95",amt:"−$6.95",amtCls:"exp"},
          {id:"dec_sf",date:"Dec 3",color:"#60a5fa",type:"",name:"SimpleFin Bridge",tag:"ATN",tagCls:"t-atn",sub:"~$1.50",amt:"−$1.50",amtCls:"exp"},
          {id:"dec_lead",date:"Dec 4",color:"#a78bfa",type:"",name:"Lead Bank",tag:"Autopay",tagCls:"t-ap",sub:"~$32",amt:"−$32",amtCls:"exp"},
          {id:"dec_gone",date:"Dec 4",color:"#3dd68c",type:"",name:"Google One",tag:"Spending",tagCls:"t-sp",sub:"~$9.99",amt:"−$9.99",amtCls:"exp"},
          {id:"dec_cs1",date:"Dec 4",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"dec_cell",date:"Dec 5",color:"#60a5fa",type:"",name:"Cell — Verizon",tag:"ATN",tagCls:"t-atn",sub:"~$350",amt:"−$350",amtCls:"exp"},
          {id:"dec_wash",date:"Dec 6",color:"#3dd68c",type:"",name:"Wash N Tan",tag:"Spending",tagCls:"t-sp",sub:"~$60",amt:"−$60",amtCls:"exp"},
          {id:"dec_groc1",date:"Dec 7",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$250",amt:"−$250",amtCls:"exp"},
          {id:"dec_fuel1",date:"Dec 7",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"dec_origin",date:"Dec 8",color:"#3dd68c",type:"",name:"Origin Financial",tag:"Spending",tagCls:"t-sp",sub:"~$33",amt:"−$33",amtCls:"exp"},
          {id:"dec_autoins",date:"Dec 9",color:"#60a5fa",type:"",name:"Auto Insurance",tag:"ATN",tagCls:"t-atn",sub:"~$300",amt:"−$300",amtCls:"exp"},
          {id:"dec_plaid",date:"Dec 9",color:"#60a5fa",type:"",name:"Plaid",tag:"ATN",tagCls:"t-atn",sub:"~$6",amt:"−$6",amtCls:"exp"},
          {id:"dec_pp",date:"Dec 9",color:"#60a5fa",type:"",name:"PayPal",tag:"ATN",tagCls:"t-atn",sub:"~$42",amt:"−$42",amtCls:"exp"},
          {id:"dec_spot",date:"Dec 10",color:"#60a5fa",type:"",name:"Spotify",tag:"ATN",tagCls:"t-atn",sub:"~$25",amt:"−$25",amtCls:"exp"},
        ],
      },
      {
        label: "Dec 11–14 · CS / buffer week",
        events: [
          {id:"dec_stearns1",date:"Dec 4",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"dec_sp1",date:"Dec 4 Fri",color:"#3dd68c",type:"",name:"Dec Spending batch available + reimburse ·1244",tag:"Spending · ATN · ARRIVES",tagCls:"t-sp",sub:"External batch arrives in Cap One Spending: +$1,446. After the Stearns paycheck lands, subtransfer $723 internally from ATN to Stearns ·1244 as reimbursement #1.",amt:"+$1,446 / −$723",amtCls:"trn"},
          {id:"dec_cs2",date:"Dec 11",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"dec_kids",date:"Dec 11",color:"#f0a500",type:"",name:"Child expense",tag:"CS",tagCls:"t-cs",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"dec_anth",date:"Dec 13",color:"#3dd68c",type:"",name:"Anthropic",tag:"Spending",tagCls:"t-sp",sub:"~$20",amt:"−$20",amtCls:"exp"},
          {id:"dec_shop1",date:"Dec 14",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
        ],
      },
      {
        label: "Dec 15–22 · Apex · Auto loans · Mid-month",
        events: [
          {id:"dec_apex",date:"Dec 15",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"dec_yost",date:"Dec 15",color:"#a78bfa",type:"",name:"Yost",tag:"Autopay",tagCls:"t-ap",sub:"~$100",amt:"−$100",amtCls:"exp"},
          {id:"dec_citi",date:"Dec 15",color:"#a78bfa",type:"",name:"Citi ·5079 payment",tag:"Autopay · CITI · ATN · CITI",tagCls:"t-ap",sub:"Final planned $40 Citi ·5079 payment for this calendar. Balance after this payment: ~$1,440 before interest.",amt:"−$40",amtCls:"exp"},
          {id:"dec_cri",date:"Dec 17",color:"#60a5fa",type:"",name:"Cricut",tag:"ATN",tagCls:"t-atn",sub:"~$11",amt:"−$11",amtCls:"exp"},
          {id:"dec_fid",date:"Dec 16",color:"#a78bfa",type:"",name:"Fidelity Roth IRA",tag:"Autopay",tagCls:"t-ap",sub:"~$325",amt:"−$325",amtCls:"exp"},
          {id:"dec_cs3",date:"Dec 18",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"dec_gplay",date:"Dec 18",color:"#3dd68c",type:"",name:"Google Play",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"dec_automike",date:"Dec 18",color:"#a78bfa",type:"",name:"Auto Loan — Mike",tag:"Autopay",tagCls:"t-ap",sub:"~$725",amt:"−$725",amtCls:"exp"},
          {id:"dec_autodani",date:"Dec 19",color:"#60a5fa",type:"",name:"Auto Loan — Dani",tag:"ATN",tagCls:"t-atn",sub:"~$750",amt:"−$750",amtCls:"exp"},
          {id:"dec_internet",date:"Dec 22",color:"#60a5fa",type:"",name:"Internet — Spectrum",tag:"ATN",tagCls:"t-atn",sub:"~$65",amt:"−$65",amtCls:"exp"},
          {id:"dec_groc2",date:"Dec 20",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"dec_fuel2",date:"Dec 20",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
        ],
      },
      {
        label: "Dec 18–31 · Year-end · Stearns · Jan preview",
        events: [
          {id:"dec_apple",date:"Dec 25",color:"#a78bfa",type:"",name:"AppleCare",tag:"Autopay",tagCls:"t-ap",sub:"~$15",amt:"−$15",amtCls:"exp"},
          {id:"dec_pets",date:"Dec 24",color:"#3dd68c",type:"",name:"Pets",tag:"Spending",tagCls:"t-sp",sub:"~$125",amt:"−$125",amtCls:"exp"},
          {id:"dec_blink",date:"Dec 26",color:"#60a5fa",type:"",name:"Blink Camera",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"dec_stearns2",date:"Dec 18",color:"#60a5fa",type:"",name:"Stearns paycheck",tag:"ATN",tagCls:"t-atn",sub:"+$1,650",amt:"+$1,650",amtCls:"inc"},
          {id:"dec_sp2",date:"Dec 18",color:"#00d4d4",type:"",name:"Internal reimbursement to Stearns ·1244",tag:"ATN · SAVINGS · INTERNAL",tagCls:"t-atn",sub:"No Cap One transfer today. Subtransfer $723 from ATN to Stearns ·1244 to reimburse this month’s Spending batch.",amt:"−$723 / +$723",amtCls:"trn"},
          {id:"dec_elec",date:"Dec 25",color:"#60a5fa",type:"",name:"Electricity + Student Loan + Amazon",tag:"ATN",tagCls:"t-atn",sub:"Paid AFTER second Stearns. ~$339.",amt:"−$339",amtCls:"exp"},
          {id:"dec_cs4",date:"Dec 25",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"dec_rail",date:"Dec 27",color:"#3dd68c",type:"",name:"Railway",tag:"Spending",tagCls:"t-sp",sub:"~$5",amt:"−$5",amtCls:"exp"},
          {id:"dec_groc3",date:"Dec 28",color:"#3dd68c",type:"",name:"Groceries",tag:"Spending",tagCls:"t-sp",sub:"~$200",amt:"−$200",amtCls:"exp"},
          {id:"dec_shop2",date:"Dec 28",color:"#3dd68c",type:"",name:"Shopping",tag:"Spending",tagCls:"t-sp",sub:"~$150",amt:"−$150",amtCls:"exp"},
          {id:"dec_fuel3",date:"Dec 29",color:"#3dd68c",type:"",name:"Fuel",tag:"Spending",tagCls:"t-sp",sub:"~$75",amt:"−$75",amtCls:"exp"},
          {id:"dec_bfit",date:"Dec 28",color:"#60a5fa",type:"",name:"Blink Fitness",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"dec_ring",date:"Dec 29",color:"#60a5fa",type:"",name:"Ring Cam",tag:"ATN",tagCls:"t-atn",sub:"~$12",amt:"−$12",amtCls:"exp"},
          {id:"dec_cs5",date:"Dec 31",color:"#f0a500",type:"",name:"Child support",tag:"CS",tagCls:"t-cs",sub:"",amt:"+~$200",amtCls:"inc"},
          {id:"dec_apex2",date:"Dec 31",color:"#a78bfa",type:"",name:"Apex paycheck",tag:"Autopay",tagCls:"t-ap",sub:"+$2,300",amt:"+$2,300",amtCls:"inc"},
          {id:"dec_keep",date:"Dec 31",color:"#a78bfa",type:"",name:"Keep surplus in Autopay — skip savings sweep",tag:"Autopay",tagCls:"t-ap",sub:"Skip sweep in December too — $3,588 mortgage keeps Autopay lean. Resume after Jan 1 when mortgage drops to $3,356. From January onward the extra $232/mo frees up.",amt:"stays in Autopay",amtCls:"trn"},
          {id:"dec_hysa_sweep",date:"Dec 31",color:"#00d4d4",type:"sev",name:"Year-end sweep — CS + Spending surplus → HYSA",tag:"EFFICIENCY",tagCls:"t-eff",sub:"Move all surplus above operating floors into HYSA: CS above ~$2,500, Spending above ~$1,000. Jan 2027 bonus adds another $2,800. Everything now earning 4.5%.",amt:"→ HYSA",amtCls:"sav"},
          {id:"dec_jan_note",date:"Dec 31",color:"#fb923c",type:"",name:"January preview",tag:"ACTION",tagCls:"t-act",sub:"Mortgage drops to $3,356 (-$232/mo). Resume savings sweeps. Citi balance ~$1,440 before interest under the $40/mo plan. Jan bonus $2,800 → HYSA. Refinance planning begins (3yr target).",amt:"action",amtCls:"act"},
        ],
        balStrips: [
          {
            label: "December 31 END · Year-end · New mortgage rate Jan 1",
            note: "",
            items: [
              {cls:"ap",name:"Autopay ·9785",val:"~$5,457",total:false},
            ],
          },
        ],
      },
    ],
  },
]
// ── badge colour map ────────────────────────────────────────
const BADGE_STYLE = {
  'TRANSITION':      { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
  'BONUS MONTH':     { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  'CLOSING MONTH':   { bg: 'rgba(0,212,212,0.15)',   color: '#00d4d4' },
  'FIRST MORTGAGE':  { bg: 'rgba(61,214,140,0.15)',  color: '#3dd68c' },
  'BONUS + WINDFALL':{ bg: 'rgba(240,165,0,0.15)',   color: '#f0a500' },
  'HOMEOWNER':       { bg: 'rgba(61,214,140,0.15)',  color: '#3dd68c' },
  'YEAR END':        { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
}

// ── main component ─────────────────────────────────────────
export default function BudgetCalendar() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [dates, setDates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DATES_KEY) || '{}') } catch { return {} }
  })
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') } catch { return {} }
  })
  const [syncing, setSyncing] = useState(false)
  const [openMonths, setOpenMonths] = useState(() => {
    // open current month by default
    const m = new Date().getMonth() + 1
    const ids = ['jun','jul','aug','sep','oct','nov','dec']
    const mmap = [6,7,8,9,10,11,12]
    const cur = ids[mmap.indexOf(m)]
    return cur ? { [cur]: true } : {}
  })

  // ── load from backend on mount ─────────────────────────
  useEffect(() => {
    async function loadRemote() {
      try {
        const data = await request('/api/budget-calendar')
        if (data?.checked && Object.keys(data.checked).length > 0) {
          setChecked(data.checked)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.checked))
        }
        if (data?.dates && Object.keys(data.dates).length > 0) {
          setDates(data.dates)
          localStorage.setItem(DATES_KEY, JSON.stringify(data.dates))
        }
        if (data?.notes && Object.keys(data.notes).length > 0) {
          setNotes(data.notes)
          localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes))
        }
      } catch { /* use localStorage */ }
    }
    loadRemote()
  }, [])

  // ── debounced backend persist ──────────────────────────
  const saveTimer = useRef(null)
  function persistAll(c, d, n) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
    localStorage.setItem(DATES_KEY,   JSON.stringify(d))
    localStorage.setItem(NOTES_KEY,   JSON.stringify(n))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSyncing(true)
      await syncSave(c, d, n)
      setSyncing(false)
    }, 800)
  }

  const toggle = useCallback((id) => {
    setChecked(prev => {
      const next = { ...prev }
      next[id] ? delete next[id] : next[id] = true
      setDates(d => { setNotes(n => { persistAll(next, d, n); return n }); return d })
      return next
    })
  }, [])

  const saveDate = useCallback((id, val) => {
    setDates(prev => {
      const next = { ...prev }
      val ? next[id] = val : delete next[id]
      setChecked(c => { setNotes(n => { persistAll(c, next, n); return n }); return c })
      return next
    })
  }, [])

  const saveNote = useCallback((id, val) => {
    setNotes(prev => {
      const next = { ...prev }
      val.trim() ? next[id] = val : delete next[id]
      setChecked(c => { setDates(d => { persistAll(c, d, next); return d }); return c })
      return next
    })
  }, [])

  const reset = async () => {
    if (!window.confirm('Clear all checkmarks?')) return
    setChecked({})
    localStorage.setItem(STORAGE_KEY, '{}')
    try { await request('/api/budget-calendar', { method: 'DELETE' }) } catch {}
    clearTimeout(saveTimer.current)
  }

  const toggleMonth = (id) => setOpenMonths(prev => ({ ...prev, [id]: !prev[id] }))
  const jumpTo = (id) => {
    setOpenMonths(prev => ({ ...prev, [id]: true }))
    setTimeout(() => document.getElementById(`month-${id}`)?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const allIds = MONTHS.flatMap(m => m.weeks.flatMap(w => w.events.map(e => e.id)))
  const total  = allIds.length
  const done   = allIds.filter(id => checked[id]).length
  const pct    = total ? Math.round((done / total) * 100) : 0

  return (
    <SwShell>
      {/* ── header ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budget Calendar</div>
          <h1 className={s.title}>611 8th Ave N · Jun–Dec 2026</h1>
          <div className={s.subtitle}>Final reconciled · Transfer-efficient batches · Closing ~Aug 14 · $8,000 cash to close · Mortgage Sep 1</div>
        </div>
        <div className={s.headStats}>
          <div className={s.stat}><div className={s.statKey}>Events</div><div className={s.statVal}>{total}</div></div>
          <div className={s.stat}><div className={s.statKey}>Done</div><div className={`${s.statVal} ${s.green}`}>{done}</div></div>
          <div className={s.stat}><div className={s.statKey}>Left</div><div className={s.statVal}>{total - done}</div></div>
        </div>
      </div>

      {/* ── progress ── */}
      <div className={s.prog}>
        <div className={s.progTrack}><div className={s.progFill} style={{width:`${pct}%`}}/></div>
        <span className={s.progPct}>{pct}%</span>
        {syncing && <span className={s.syncBadge}>syncing…</span>}
        <button className={s.resetBtn} onClick={reset}>Reset</button>
      </div>

      {/* ── month nav ── */}
      <div className={s.monthNav}>
        {MONTHS.map(m => (
          <button key={m.id} className={`${s.mnavBtn} ${openMonths[m.id] ? s.mnavActive : ''}`}
            onClick={() => jumpTo(m.id)}>
            {m.id.charAt(0).toUpperCase() + m.id.slice(1)}
          </button>
        ))}
      </div>

      {/* ── legend ── */}
      <div className={s.legend} style={{display:'flex',flexWrap:'wrap',gap:8,padding:'10px 22px 4px'}}>
        {[
          {color:'#a78bfa',label:'Autopay ·9785'},
          {color:'#60a5fa',label:'ATN ·4510'},
          {color:'#3dd68c',label:'Spending ·1712'},
          {color:'#f0a500',label:'Child Support ·9893'},
          {color:'#00d4d4',label:'Savings / HYSA'},
          {color:'#e05555',label:'Citi cards'},
          {color:'#fb923c',label:'Action required'},
        ].map((l,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:20,background:`${l.color}1a`,fontSize:11,fontWeight:600,color:l.color}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:l.color}}/>
            {l.label}
          </div>
        ))}
      </div>

      {/* ── months ── */}
      <div className={s.months}>
        {MONTHS.map(month => {
          const isOpen = !!openMonths[month.id]
          const badge  = BADGE_STYLE[month.badge] || {}
          return (
            <div key={month.id} id={`month-${month.id}`} className={s.month}>
              {/* month header — clickable to expand */}
              <div className={s.mhdr} onClick={() => toggleMonth(month.id)} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleMonth(month.id) }}>
                <div>
                  <div className={s.mname}>
                    {month.title}
                    {month.badge && (
                      <span className={s.mBadge} style={{background: badge.bg, color: badge.color}}>{month.badge}</span>
                    )}
                  </div>
                  <div className={s.mmeta}>{month.meta}</div>
                </div>
                <span className={s.mChevron}>{isOpen ? '▾' : '▸'}</span>
              </div>

              {/* month body */}
              {isOpen && (
                <div>
                  {month.weeks.map((week, wi) => (
                    <div key={wi} className={s.week}>
                      <div className={s.wlabel}>{week.label}</div>
                      {week.events.map(ev => (
                        <Ev key={ev.id} ev={ev}
                          done={!!checked[ev.id]}
                          note={notes[ev.id] || ''}
                          onToggle={toggle}
                          dateOverride={dates[ev.id]}
                          onDateSave={saveDate}
                          onNoteSave={saveNote}
                        />
                      ))}
                      {week.balStrips?.map((bs, bi) => (
                        <BalStrip key={bi} {...bs} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SwShell>
  )
}
