import { useState, useCallback, useRef, useEffect } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import { api, request } from '../../data/api'
import s from './BudgetCalendar.module.css'

const STORAGE_KEY = 'budget_v4_2'
const DATES_KEY   = 'budget_v4_2_dates'

// ── cross-device sync ──────────────────────────────────────
// Saves to the Lumen backend (persists across devices).
// Falls back to localStorage if the API call fails.
async function syncSave(checked, dates) {
  try {
    await request('/api/budget-calendar', {
      method: 'POST',
      body: { checked, dates },
    })
  } catch {
    // backend unavailable — localStorage already saved in toggle/saveDate
  }
}

// ── balance strip ──────────────────────────────────────────
function BalStrip({ label, items, note }) {
  return (
    <div className={s.balStrip}>
      <div className={s.balLabel}>{label}</div>
      <div className={s.balGrid}>
        {items.map((it, i) => (
          <div key={i} className={`${s.balItem} ${it.total ? s.balTotal : ''} ${s[`bal_${it.cls.replace(/\s+/g,'_')}`] || ''}`}>
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
function Ev({ ev, done, onToggle, dateOverride, onDateSave }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const inputRef = useRef(null)

  const displayDate = dateOverride || ev.date
  const isEdited    = !!dateOverride

  function startEdit(e) {
    e.stopPropagation()
    setDraft(displayDate)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const val = draft.trim()
    onDateSave(ev.id, val && val !== ev.date ? val : null)
    setEditing(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false) }
    e.stopPropagation()
  }

  const rowCls = [
    s.ev,
    ev.type === 'mile'  ? s.evMile  : '',
    ev.type === 'bev'   ? s.evBonus : '',
    ev.type === 'hev'   ? s.evHouse : '',
    ev.type === 'sev'   ? s.evSave  : '',
    done                ? s.evDone  : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowCls}
      onClick={() => !editing && onToggle(ev.id)}
      role="button" tabIndex={0}
      onKeyDown={e => { if (!editing && (e.key === 'Enter' || e.key === ' ')) onToggle(ev.id) }}>
      <div className={`${s.chk} ${done ? s.chkDone : ''}`} aria-hidden="true"/>

      {editing ? (
        <input ref={inputRef} className={s.edateInput}
          value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit} onKeyDown={handleKey}
          onClick={e => e.stopPropagation()} aria-label="Edit date" />
      ) : (
        <span className={`${s.edate} ${isEdited ? s.edateEdited : ''}`}
          onClick={startEdit} title="Click to edit date">{displayDate}</span>
      )}

      <div className={s.edot} style={{ background: ev.color }}/>
      <div className={s.ebody}>
        <div className={s.ename}>
          {ev.name}
          {ev.tag && <span className={`${s.tag} ${s[ev.tagCls.replace('-','_')] || s.tagDef}`}>{ev.tag}</span>}
        </div>
        {ev.sub && <div className={s.esub}>{ev.sub}</div>}
      </div>
      <span className={`${s.eamt} ${s[ev.amtCls] || ''}`}>{ev.amt}</span>
    </div>
  )
}

const MONTHS = [
  {
    id: "june",
    name: "June 2026 — Remaining",
    income: "Income: ~$8,050 (2 Apex + 1 Stearns + CS)",
    note: "Apex ·9785 · Stearns ·4510 · CS ·9893 · RENTAL PERIOD · Citi payoff Jun 15 · Inspection this week · Offer Jun 14",
    phase: "pre",
    phaseTxt: "Citi paid off Jun 15. Inspection ~$400 before Jun 20. Offer in Jun 14. FICO 2 updates ~Jul 1. Do NOT apply for mortgage until after Jul 1 score update.",
    sstrip: [
      {l:"Personal Savings ·4685", v:"~$200 (kept $200; used $729 for Citi)"},
      {l:"Stearns ·1244", v:"~$5,100"},
      {l:"Stearns ·3046 / ·4182", v:"~$832 (used $808 for Citi)"},
      {l:"Liberty Savings", v:"~$5,900"},
    ],
    footer: [
      {color:"#185FA5", cls:"ok", val:"~$1,946"},
      {color:"#7B3FA0", cls:"ok", val:"~$800 est."},
      {color:"#0F6E56", cls:"warn", val:"~$300 est."},
      {color:"#BA7517", cls:"ok", val:"~$1,100 est."},
    ],
    balStrips: [
      {
        label: "After Jun 15–18 · Citi paid · Inspection · Apex landed",
        note: "",
        items: [
        ],
      },
      {
        label: "After Jun 19–22 · Stearns landed · Car loan · Bills · Groceries · Fuel",
        note: "",
        items: [
        ],
      },
      {
        label: "After Jun 23–28 · All bills paid · Citi $0 reports to Experian",
        note: "",
        items: [
        ],
      },
      {
        label: "June 30 END · Second Apex + Stearns · July funded",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Jun 14–15 · Offer · Apex payday · Citi payoff · Inspection",
        events: [
          {id:"buf_jun14", date:"Jun 14 Sun", color:"#0C447C", type:"sev", name:"Transfer $1,000 from Stearns ·1244 → ATN", tag:"Above the Norm", tagCls:"t-atn", sub:"ONE-TIME June pre-fund. Gives ATN $1,175 buffer before Citi payoff. Returned to ·1244 on Jul 1. s1244 temporarily $4,100.", amt:"$1,000", amtCls:"trn"},
          {id:"ev1", date:"Jun 14 Sun", color:"#F59E0B", type:"", name:"Make offer on 611 8th Ave N", tag:"ACTION", tagCls:"t-act", sub:"Earnest money from savings. Do NOT formally apply for mortgage until Jul 1 after FICO 2 updates.", amt:"action", amtCls:"trn"},
          {id:"ev2", date:"Jun 15 Mon", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"Autopay: $8 + $2,300 = $2,308.", amt:"+$2,300", amtCls:"inc"},
          {id:"ev3", date:"Jun 15 Mon", color:"#F59E0B", type:"", name:"PAY CITI IN FULL — $1,720", tag:"DO TODAY", tagCls:"t-now", sub:"Transfer $808 from Stearns ·4182 to ATN first. Then pay: Personal Savings $729 + ATN $175 + Autopay $8 + ·4182 $808 = $1,720. Keeps $200 in Personal Savings (no $0 balance). Card hits $0 → score boost ~Jul 1–10.", amt:"-$1,720", amtCls:"bon"},
          {id:"ev4", date:"Jun 15 Mon", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Fund June discretionary. Spending: $28 + $723 = $751.", amt:"$723", amtCls:"trn"},
          {id:"buf_jun15", date:"Jun 15 Mon", color:"#7B3FA0", type:"sev", name:"Transfer $1,000 from Autopay → ATN", tag:"Above the Norm", tagCls:"t-atn", sub:"ONE-TIME June seed from Apex paycheck. Keeps ATN positive through all June bills. Returned to Autopay on Jul 1.", amt:"$1,000", amtCls:"trn"},
          {id:"ev5", date:"Jun 15 Mon", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"ev6", date:"Jun 15 Mon", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"ev7", date:"Jun 15 Mon", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"real_atn_exp_jun15", date:"Jun 15 Mon", color:"#185FA5", type:"", name:"Cash expense", tag:"Above the Norm", tagCls:"t-atn", sub:"One-time $125 spent from ·4510.", amt:"-$125", amtCls:"exp"},
          {id:"real_atn_dep_jun16", date:"Jun 16 Tue", color:"#185FA5", type:"", name:"Cash deposit", tag:"Above the Norm", tagCls:"t-atn", sub:"One-time $955 cash deposited into ·4510. Net of today's $125 expense: +$830 to ATN.", amt:"+$955", amtCls:"inc"},
          {id:"ev8", date:"Jun 16–18", color:"#F59E0B", type:"", name:"Home inspection — ~$400", tag:"ACTION", tagCls:"t-act", sub:"Pay from Autopay. Check basement and foundation thoroughly. Use findings as negotiating leverage on price.", amt:"-$400", amtCls:"exp"},
          {id:"ev9", date:"Jun 16–18", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"ev10", date:"Jun 16–18", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"ev11", date:"Jun 18 Thu", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
        ],
      },
      {
        label: "Jun 19–22 · Stearns paycheck · Dani car · Bills · Groceries",
        events: [
          {id:"ev12", date:"Jun 19 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"ev13", date:"Jun 19 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Mid-month discretionary fund.", amt:"$723", amtCls:"trn"},
          {id:"ev14", date:"Jun 19 Fri", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"ev15", date:"Jun 19 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"CS back above $1,000 floor ✓", amt:"+~$200", amtCls:"inc"},
          {id:"ev16", date:"Jun 19 Fri", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
          {id:"ev17", date:"Jun 20 Sat", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"~$200. Spending ~$1,200 after transfers. Comfortable.", amt:"~$200", amtCls:"exp"},
          {id:"ev18", date:"Jun 20 Sat", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75. Good window.", amt:"~$75", amtCls:"exp"},
          {id:"ev19", date:"Jun 20 Sat", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339. Pay manually.", amt:"-$339", amtCls:"exp"},
          {id:"ev20", date:"Jun 22 Mon", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
        ],
      },
      {
        label: "Jun 23–28 · Insurance · Shopping · CS · Score update",
        events: [
          {id:"ev22", date:"Jun 26 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev23", date:"Jun 26 Fri", color:"#BA7517", type:"", name:"Kids groceries / expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related spending. ~$100-150.", amt:"~$100-150", amtCls:"exp"},
          {id:"ev24", date:"Jun 26 Fri", color:"#0F6E56", type:"", name:"Shopping window", tag:"Spending", tagCls:"t-sp", sub:"~$150 misc. Balance ~$700. Safe to spend.", amt:"~$150", amtCls:"exp"},
          {id:"ev26", date:"Jun 25 Thu", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"ev30", date:"Jun 27 Sat", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"ev31", date:"Jun 27 Sat", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"~$200. Balance ~$500. Fine.", amt:"~$200", amtCls:"exp"},
          {id:"ev32", date:"Jun 28 Sun", color:"#085041", type:"", name:"Citi statement closes — $0 reports", tag:"SCORE UPDATE", tagCls:"t-score", sub:"FICO 2 update incoming. Expect +50–80 pts by Jul 1–10. Do NOT apply for mortgage before this.", amt:"↑ FICO 2", amtCls:"inc"},
        ],
      },
      {
        label: "Jun 30 · Second Apex · Stearns · CS · Fund July",
        events: [
          {id:"ev21", date:"Jun 30 Tue", color:"#185FA5", type:"", name:"Auto Insurance — Progressive", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300. Note: shop for home+auto bundle after closing.", amt:"-$300", amtCls:"exp"},
          {id:"ev36", date:"Jun 30 Tue", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"Second Apex of month.", amt:"+$2,300", amtCls:"inc"},
          {id:"ev37", date:"Jun 30 Tue", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Stearns biweekly.", amt:"+$1,650", amtCls:"inc"},
          {id:"ev38", date:"Jun 30 Tue", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev39", date:"Jun 30 Tue", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"orig_jun30", date:"Jun 30 Tue", color:"#0F6E56", type:"", name:"Origin Financial", tag:"Spending", tagCls:"t-sp", sub:"June only: pay from Spending (psav is $0 after Citi payoff). Returns to Personal Savings from Jul 8 onward. ~$33", amt:"-$33", amtCls:"exp"},
          {id:"ev41", date:"Jun 30 Tue", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75. Paychecks landed — good window.", amt:"~$75", amtCls:"exp"},
          {id:"ev42", date:"Jun 30 Tue", color:"#185FA5", type:"", name:"Transfer $723 → Spending for July", tag:"Spending", tagCls:"t-sp", sub:"Fund July discretionary from ATN surplus.", amt:"$723", amtCls:"trn"},
        ],
      },
    ],
  },
  {
    id: "july",
    name: "July 2026",
    income: "Income: ~$13,350 (2 Apex + bonus + 2 Stearns + CS)",
    note: "RENTAL PERIOD · Submit application Jul 1 · 401k withdrawal ~Jul 10 · Bonus Jul 31 → savings · Last Stearns before closing",
    phase: "pre",
    phaseTxt: "Submit application Jul 1 after FICO 2 updates. Get exact cash to close from lender — pull 401k only for the gap ($13,269 in savings first). Bonus $2,800 all to savings rebuild. Last rent Aug 1.",
    sstrip: [
      {l:"Personal Savings ·4685", v:"~$1,629 (rebuilt $700)"},
      {l:"Stearns ·1244", v:"~$5,100"},
      {l:"Stearns ·3046 / ·4182", v:"~$1,832 (rebuilt $700 + ·4182 recovered)"},
      {l:"Liberty Savings", v:"~$6,600 (rebuilt $700)"},
    ],
    footer: [
      {color:"#185FA5", cls:"ok", val:"~$1,500 est."},
      {color:"#7B3FA0", cls:"ok", val:"~$2,000 est."},
      {color:"#0F6E56", cls:"ok", val:"~$400 est."},
      {color:"#BA7517", cls:"ok", val:"~$1,200 est."},
    ],
    balStrips: [
      {
        label: "After Jul 1–6 · Rent paid · App submitted · Stearns · Groceries",
        note: "",
        items: [
        ],
      },
      {
        label: "After Jul 7–14 · 401k net arrived · Closing fund ready",
        note: "",
        items: [
        ],
      },
      {
        label: "After Jul 15–22 · Apex + Stearns · Auto loans · Bills · Groceries",
        note: "",
        items: [
        ],
      },
      {
        label: "July 31 END · Bonus $2,800 split to savings · August funded",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Jul 1–4 · Submit application · Last rent · Early bills",
        events: [
          {id:"buf_jul1c_perm", date:"Jul 1 Wed", color:"#7B3FA0", type:"sev", name:"$2,000 PERMANENT buffer: Autopay → ATN", tag:"Above the Norm", tagCls:"t-atn", sub:"PERMANENT $2,000 ATN baseline — transferred once, never returned. Covers early-month bills before each Stearns check lands. This is why no monthly buffer events appear Aug–Dec.", amt:"$2,000 permanent", amtCls:"trn"},
          {id:"buf_jul1a", date:"Jul 1 Wed", color:"#0C447C", type:"", name:"Return $1,000 → Stearns ·1244", tag:"Above the Norm", tagCls:"t-atn", sub:"Return June 14 pre-fund loan. s1244 back to $5,100 ✓", amt:"$1,000 returned", amtCls:"trn"},
          {id:"buf_jul1b", date:"Jul 1 Wed", color:"#7B3FA0", type:"", name:"Return $1,000 → Autopay", tag:"Autopay", tagCls:"t-ap", sub:"Return June 15 Autopay seed. Autopay replenished.", amt:"$1,000 returned", amtCls:"trn"},
          {id:"ev43", date:"Jul 1 Wed", color:"#085041", type:"", name:"Submit formal mortgage application", tag:"KEY DATE", tagCls:"t-score", sub:"FICO 2 updated. Lock rate ~6%. Ask lender: re-quote without points buydown at 700+ score. Get exact cash to close before pulling 401k.", amt:"action", amtCls:"inc"},
          {id:"ev44", date:"Jul 15 Wed", color:"#7B3FA0", type:"", name:"Rent — second to last payment", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. $1,910. Pay on Jul 15 alongside Apex — Autopay is fully loaded then. Final rent is Aug 1.", amt:"-$1,910", amtCls:"exp"},
          {id:"ev45", date:"Jul 1 Wed", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"ev46", date:"Jul 1 Wed", color:"#7B3FA0", type:"", name:"Trash", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$12 (rental period)", amt:"-$12", amtCls:"exp"},
          {id:"ev47", date:"Jul 2 Thu", color:"#185FA5", type:"", name:"Amazon — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$16", amt:"-$16", amtCls:"exp"},
          {id:"ev48", date:"Jul 2 Thu", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"ev49", date:"Jul 3 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"ev50", date:"Jul 3 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Fund first half of July discretionary.", amt:"$723", amtCls:"trn"},
          {id:"ev51", date:"Jul 3 Fri", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"ev52", date:"Jul 3 Fri", color:"#7B3FA0", type:"", name:"Renter's Insurance — State Farm", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$85. LAST FEW MONTHS — cancel after closing.", amt:"-$85", amtCls:"exp"},
          {id:"ev53", date:"Jul 3 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev54", date:"Jul 4 Sat", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"~$250. Spending ~$1,400 after transfer. Great window.", amt:"~$250", amtCls:"exp"},
          {id:"ev55", date:"Jul 4 Sat", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75.", amt:"~$75", amtCls:"exp"},
          {id:"ev56", date:"Jul 4 Sat", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"ev57", date:"Jul 4 Sat", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"ev58", date:"Jul 5 Sun", color:"#185FA5", type:"", name:"Cell Phone — Verizon", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$350.", amt:"-$350", amtCls:"exp"},
          {id:"ev59", date:"Jul 6 Mon", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
        ],
      },
      {
        label: "Jul 7–14 · Insurance · 401k withdrawal · PayPal · Shopping",
        events: [
          {id:"orig_jul8", date:"Jul 8 Wed", color:"#0F6E56", type:"", name:"Origin Financial", tag:"Spending", tagCls:"t-sp", sub:"July only: pay from Spending while psav is still recovering. From Aug 8 onward returns to Personal Savings. ~$33", amt:"-$33", amtCls:"exp"},
          {id:"ev61", date:"Jul 9 Thu", color:"#185FA5", type:"", name:"Auto Insurance — Progressive", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300.", amt:"-$300", amtCls:"exp"},
          {id:"ev62", date:"Jul 9 Thu", color:"#185FA5", type:"", name:"Plaid", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$6", amt:"-$6", amtCls:"exp"},
          {id:"ev63", date:"Jul 10 Fri", color:"#185FA5", type:"", name:"Spotify", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$25", amt:"-$25", amtCls:"exp"},
          {id:"ev64", date:"Jul 10 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev65", date:"Jul 10 Fri", color:"#BA7517", type:"", name:"Kids groceries / expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related spending from CS.", amt:"~$100-150", amtCls:"exp"},
          {id:"ev66", date:"Jul 10 Fri", color:"#7B3FA0", type:"", name:"Initiate 401k withdrawal", tag:"ACTION", tagCls:"t-score", sub:"Only after lender confirms exact cash to close. Pull $6,502 net (gross ~$10,378). Sources at closing: Liberty $6,600 + Personal Savings $3,898 + this 401k net $6,502 = $17,000. Personal Savings keeps $500 floor. Arrives 3–5 business days.", amt:"+net ~$3,731", amtCls:"inc"},
          {id:"ev67", date:"Jul 11 Sat", color:"#185FA5", type:"", name:"PayPal charges", tag:"Above the Norm", tagCls:"t-atn", sub:"~$42 total. Verify all charges.", amt:"-$42", amtCls:"exp"},
          {id:"ev68", date:"Jul 11 Sat", color:"#0F6E56", type:"", name:"Shopping window", tag:"Spending", tagCls:"t-sp", sub:"~$150 misc. Balance ~$900. Good window.", amt:"~$150", amtCls:"exp"},
          {id:"ev69", date:"Jul 13 Mon", color:"#0F6E56", type:"", name:"Anthropic", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$20", amt:"-$20", amtCls:"exp"},
        ],
      },
      {
        label: "Jul 15–21 · Apex paycheck · Yost · Stearns · Auto loans · Bills",
        events: [
          {id:"ev70", date:"Jul 15 Wed", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"ev71", date:"Jul 15 Wed", color:"#7B3FA0", type:"", name:"Yost & Baill", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$100", amt:"-$100", amtCls:"exp"},
          {id:"ev72", date:"Jul 15 Wed", color:"#185FA5", type:"", name:"Cricut", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$11", amt:"-$11", amtCls:"exp"},
          {id:"ev73", date:"Jul 16 Thu", color:"#7B3FA0", type:"", name:"Fidelity Roth IRA", tag:"Autopay", tagCls:"t-ap", sub:"Confirm $325 transfer. Retirement contribution.", amt:"-$325", amtCls:"exp"},
          {id:"ev74", date:"Jul 17 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"ev75", date:"Jul 17 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Fund second half of July.", amt:"$723", amtCls:"trn"},
          {id:"ev76", date:"Jul 17 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev77", date:"Jul 17 Fri", color:"#0F6E56", type:"", name:"Google Play", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"ev78", date:"Jul 18 Sat", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"~$200. Spending ~$1,100 after transfer.", amt:"~$200", amtCls:"exp"},
          {id:"ev79", date:"Jul 18 Sat", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75.", amt:"~$75", amtCls:"exp"},
          {id:"ev80", date:"Jul 18 Sat", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
          {id:"ev81", date:"Jul 19 Sun", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"ev82", date:"Jul 31 Fri", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339. Pay manually.", amt:"-$339", amtCls:"exp"},
          {id:"ev83", date:"Jul 22 Wed", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
        ],
      },
      {
        label: "Jul 23–31 · CS · Shopping · AppleCare · Apex + BONUS · Save bonus",
        events: [
          {id:"ev84", date:"Jul 24 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev85", date:"Jul 24 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related spending.", amt:"~$100-150", amtCls:"exp"},
          {id:"ev86", date:"Jul 25 Sat", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"ev87", date:"Jul 25 Sat", color:"#0F6E56", type:"", name:"Pets", tag:"Spending", tagCls:"t-sp", sub:"~$125. Balance ~$700. Good window.", amt:"~$125", amtCls:"exp"},
          {id:"ev88", date:"Jul 26 Sun", color:"#185FA5", type:"", name:"Blink cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"ev89", date:"Jul 27 Mon", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"ev90", date:"Jul 27 Mon", color:"#0F6E56", type:"", name:"Shopping window 2", tag:"Spending", tagCls:"t-sp", sub:"~$150 misc. Balance ~$600. Fine.", amt:"~$150", amtCls:"exp"},
          {id:"ev91", date:"Jul 28 Tue", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"ev92", date:"Jul 29 Wed", color:"#185FA5", type:"", name:"Ring Cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"ev93", date:"Jul 31 Fri", color:"#7B3FA0", type:"bev", name:"Apex paycheck + BONUS", tag:"BONUS MONTH", tagCls:"t-bon", sub:"Regular $2,300 + bonus $2,800 = $5,100 in Autopay today.", amt:"+$5,100", amtCls:"bon"},
          {id:"ev94", date:"Jul 31 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"", amt:"+$1,650", amtCls:"inc"},
          {id:"ev95", date:"Jul 31 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev96", date:"Jul 31 Fri", color:"#0F6E56", type:"", name:"Groceries run 3", tag:"Spending", tagCls:"t-sp", sub:"~$200. Last July grocery run.", amt:"~$200", amtCls:"exp"},
          {id:"ev97", date:"Jul 31 Fri", color:"#0F6E56", type:"", name:"Fuel fill 3", tag:"Spending", tagCls:"t-sp", sub:"~$75. Top off before August.", amt:"~$75", amtCls:"exp"},
          {id:"ev98", date:"Jul 31 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending for August", tag:"Spending", tagCls:"t-sp", sub:"Fund early August discretionary.", amt:"$723", amtCls:"trn"},
          {id:"buf_jul31", date:"Aug 1 Sat", color:"#7B3FA0", type:"", name:"Return $1,000 buffer → Autopay", tag:"Autopay", tagCls:"t-ap", sub:"Return July ATN buffer on Aug 1 — combined with Aug buffer start. Bonus transfers complete, ATN fully settled.", amt:"$1,000 returned", amtCls:"trn"},
          {id:"ev99", date:"Jul 31 Fri", color:"#7B3FA0", type:"sev", name:"BONUS $2,800 → savings rebuild", tag:"SAVE", tagCls:"t-save", sub:"Split: Stearns ·4182 $700 + ·3046 $700 + Personal Savings $700 + Liberty $700. Biggest single savings move of the year.", amt:"+$2,800 → SAVE", amtCls:"sav"},
        ],
      },
    ],
  },
  {
    id: "august",
    name: "August 2026",
    income: "Income: ~$8,700 (2 Apex + 2 Stearns + CS)",
    note: "RENTAL → CLOSING · Last rent Aug 1 · List Dani's house ~Aug 1 · Close ~Aug 14 · First mortgage Sep 1",
    phase: "closing",
    phaseTxt: "Last rent Aug 1 — never again. List Dani's house ~Aug 1. Close on new home ~Aug 14. Cancel renter's insurance same day. Mortgage autopay set up. First mortgage payment Sep 1.",
    mbar: "Closed ~Aug 14. Keys in hand. Renter's insurance cancelled. Mortgage set up. First payment Sep 1.",
    sstrip: [
      {l:"Personal Savings ·4685", v:"~$200 (used for closing)"},
      {l:"Stearns ·1244", v:"~$5,100 (untouched — your cushion)"},
      {l:"Stearns ·3046 / ·4182", v:"~$100 (used for closing)"},
      {l:"Liberty Savings", v:"~$900 (used for closing)"},
    ],
    footer: [
      {color:"#185FA5", cls:"ok", val:"~$1,200 est."},
      {color:"#7B3FA0", cls:"ok", val:"~$400 est."},
      {color:"#0F6E56", cls:"ok", val:"~$600 est."},
      {color:"#BA7517", cls:"ok", val:"~$1,200 est."},
    ],
    balStrips: [
      {
        label: "After Aug 1–7 · LAST RENT PAID · Dani's house listed",
        note: "",
        items: [
        ],
      },
      {
        label: "After Aug 8–13 · All pre-closing bills current · Confirm wire today",
        note: "",
        items: [
        ],
      },
      {
        label: "After Aug 14–20 · CLOSED · Keys in hand · Savings used for closing",
        note: "",
        items: [
        ],
      },
      {
        label: "August 31 END · First home month done · Savings rebuild started",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Aug 1–7 · LAST rent · Early bills · Groceries · List Dani's house",
        events: [
          {id:"ev100", date:"Aug 1 Sat", color:"#7B3FA0", type:"", name:"Rent — FINAL PAYMENT EVER", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. $1,910. Next housing payment is mortgage Sep 1.", amt:"-$1,910", amtCls:"exp"},
          {id:"ev101", date:"Aug 1 Sat", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"ev102", date:"Aug 1 Sat", color:"#185FA5", type:"", name:"Amazon — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$16", amt:"-$16", amtCls:"exp"},
          {id:"ev103", date:"~Aug 1", color:"#F59E0B", type:"", name:"List Dani's house for sale", tag:"ACTION", tagCls:"t-act", sub:"Target list date. Expected close late October. Net ~$50k proceeds. Separate from operating budget. Net ~$50k → HYSA (see Sep efficiency note). Earmark $10-15k for furnishings, rest stays as emergency fund earning 4.5%.", amt:"action", amtCls:"trn"},
          {id:"ev104", date:"Aug 2 Sun", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"ev105", date:"Aug 3 Mon", color:"#7B3FA0", type:"", name:"Renter's Insurance — FINAL payment", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually ~$85. CANCEL after closing ~Aug 14.", amt:"-$85", amtCls:"exp"},
          {id:"ev106", date:"Aug 3 Mon", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"ev107", date:"Aug 4 Tue", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"ev108", date:"Aug 4 Tue", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"ev109", date:"Aug 5 Wed", color:"#185FA5", type:"", name:"Cell Phone — Verizon", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$350.", amt:"-$350", amtCls:"exp"},
          {id:"ev110", date:"Aug 6 Thu", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
          {id:"ev111", date:"Aug 6 Thu", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"~$250. Spending ~$1,000 from Jul 31 transfer. Comfortable.", amt:"~$250", amtCls:"exp"},
          {id:"ev112", date:"Aug 6 Thu", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75.", amt:"~$75", amtCls:"exp"},
          {id:"ev113", date:"Aug 7 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev114", date:"Aug 7 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related spending.", amt:"~$100-150", amtCls:"exp"},
        ],
      },
      {
        label: "Aug 8–13 · Insurance · PayPal · Shopping · Stage closing funds",
        events: [
          {id:"ev115", date:"Aug 8 Sat", color:"#F59E0B", type:"", name:"Origin Financial", tag:"", tagCls:"", sub:"Auto-charge ~$33 from Personal Savings.", amt:"-$33", amtCls:"exp"},
          {id:"ev116", date:"Aug 9 Sun", color:"#185FA5", type:"", name:"Auto Insurance — Progressive", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300.", amt:"-$300", amtCls:"exp"},
          {id:"ev117", date:"Aug 9 Sun", color:"#185FA5", type:"", name:"Plaid", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$6", amt:"-$6", amtCls:"exp"},
          {id:"ev118", date:"Aug 10 Mon", color:"#185FA5", type:"", name:"Spotify", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$25", amt:"-$25", amtCls:"exp"},
          {id:"ev119", date:"Aug 11 Tue", color:"#185FA5", type:"", name:"PayPal charges", tag:"Above the Norm", tagCls:"t-atn", sub:"~$42 total. Verify.", amt:"-$42", amtCls:"exp"},
          {id:"ev120", date:"Aug 11 Tue", color:"#0F6E56", type:"", name:"Shopping window", tag:"Spending", tagCls:"t-sp", sub:"~$150 misc. Balance ~$450. OK.", amt:"~$150", amtCls:"exp"},
          {id:"ev121", date:"Aug 13 Thu", color:"#0F6E56", type:"", name:"Anthropic", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$20", amt:"-$20", amtCls:"exp"},
          {id:"ev122", date:"~Aug 13", color:"#085041", type:"", name:"Confirm exact cash to close with lender", tag:"ACTION", tagCls:"t-score", sub:"Confirm wire breakdown: Liberty $6,600 + Personal Savings $3,898 + 401k $6,502 = $17,000. Personal Savings balance should be ~$4,398 — wire $3,898, keep $500. 401k funds should have arrived.", amt:"confirm", amtCls:"trn"},
        ],
      },
      {
        label: "~Aug 14 · CLOSING DAY · Both paychecks · Cancel renter's ins",
        events: [
          {id:"ev123", date:"~Aug 14 Fri", color:"#085041", type:"hev", name:"CLOSING DAY — wire cash to close", tag:"CLOSING", tagCls:"t-hse", sub:"Wire: Liberty $6,600 + Personal Savings $3,898 + 401k direct wire $6,502 (gross ~$10,378) = $17,000. Personal Savings keeps $500 floor. Sign documents. GET KEYS. Set up mortgage autopay from Autopay account.", amt:"-~$17–20k", amtCls:"hse"},
          {id:"ev124", date:"Aug 14 Fri", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"ev125", date:"Aug 14 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending.", amt:"+$1,650", amtCls:"inc"},
          {id:"ev126", date:"Aug 14 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Fund mid-August discretionary.", amt:"$723", amtCls:"trn"},
          {id:"ev127", date:"Aug 14 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev128", date:"Aug 14 Fri", color:"#7B3FA0", type:"", name:"CANCEL renter's insurance — State Farm", tag:"ACTION", tagCls:"t-act", sub:"Call to cancel immediately. Homeowner's insurance now baked into PITI. Saves ~$85/mo going forward.", amt:"CANCEL", amtCls:"trn"},
          {id:"ev129", date:"Aug 15 Sat", color:"#7B3FA0", type:"", name:"Yost & Baill", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$100", amt:"-$100", amtCls:"exp"},
          {id:"ev130", date:"Aug 15 Sat", color:"#185FA5", type:"", name:"Cricut", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$11", amt:"-$11", amtCls:"exp"},
          {id:"ev131", date:"Aug 16 Sun", color:"#7B3FA0", type:"", name:"Fidelity Roth IRA", tag:"Autopay", tagCls:"t-ap", sub:"Confirm $325 transfer.", amt:"-$325", amtCls:"exp"},
          {id:"ev132", date:"Aug 17 Mon", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"~$200. Post-closing week — Spending ~$900. Comfortable.", amt:"~$200", amtCls:"exp"},
          {id:"ev133", date:"Aug 17 Mon", color:"#0F6E56", type:"", name:"Google Play", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"ev134", date:"Aug 18 Tue", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
          {id:"ev135", date:"Aug 19 Wed", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"ev136", date:"Aug 19 Wed", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75.", amt:"~$75", amtCls:"exp"},
          {id:"ev137", date:"Aug 28 Fri", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339.", amt:"-$339", amtCls:"exp"},
        ],
      },
      {
        label: "Aug 21–31 · CS · Internet · Apex · Stearns · Savings rebuild",
        events: [
          {id:"ev138", date:"Aug 21 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev139", date:"Aug 21 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related spending.", amt:"~$100-150", amtCls:"exp"},
          {id:"ev140", date:"Aug 28 Fri", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
          {id:"ev141", date:"Aug 22 Sat", color:"#0F6E56", type:"", name:"Shopping window 2", tag:"Spending", tagCls:"t-sp", sub:"~$150 misc. New house — may need household items.", amt:"~$150", amtCls:"exp"},
          {id:"ev142", date:"Aug 25 Tue", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"ev143", date:"Aug 25 Tue", color:"#0F6E56", type:"", name:"Pets", tag:"Spending", tagCls:"t-sp", sub:"~$125.", amt:"~$125", amtCls:"exp"},
          {id:"ev144", date:"Aug 28 Fri", color:"#185FA5", type:"", name:"Blink cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"ev145", date:"Aug 27 Thu", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"ev146", date:"Aug 28 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending.", amt:"+$1,650", amtCls:"inc"},
          {id:"ev147", date:"Aug 28 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Fund end of August and September start.", amt:"$723", amtCls:"trn"},
          {id:"ev148", date:"Aug 28 Fri", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"ev149", date:"Aug 28 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"ev150", date:"Aug 28 Fri", color:"#0F6E56", type:"", name:"Groceries run 3", tag:"Spending", tagCls:"t-sp", sub:"~$200. Last August grocery run.", amt:"~$200", amtCls:"exp"},
          {id:"ev151", date:"Aug 29 Sat", color:"#0F6E56", type:"", name:"Fuel fill 3", tag:"Spending", tagCls:"t-sp", sub:"~$75.", amt:"~$75", amtCls:"exp"},
          {id:"ev152", date:"Aug 29 Sat", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"ev153", date:"Aug 29 Sat", color:"#185FA5", type:"", name:"Ring Cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"ev154", date:"Aug 31 Mon", color:"#7B3FA0", type:"sev", name:"Surplus → savings rebuild", tag:"SAVE", tagCls:"t-save", sub:"~$412/mo surplus (Autopay $306 + ATN $106). Distribute to lowest accounts. No deadline — comfortable pace.", amt:"~$412 saved", amtCls:"sav"},
        ],
      },
    ],
  },
  {
    id: "september",
    name: "September 2026",
    income: "Income: $8,975",
    note: "Apex $4,600 · Stearns $3,575 · CS $800 · NEW HOME · First mortgage · No rent",
    phase: "post",
    phaseTxt: "First full month as homeowners. Mortgage $3,000 replaces rent $1,910. Surplus ~$1,179/mo. ATN has permanent $2,000 baseline (transferred Jul 1). No monthly buffer action needed.",
    balStrips: [
      {
        label: "Sep end · All accounts settled",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Sep 1–10 · Mortgage · Early bills",
        events: [
          {id:"eff_hysa_open", date:"Sep 2 Wed", color:"#BA7517", type:"sev", name:"⭐ Open a High-Yield Savings account", tag:"", tagCls:"", sub:"Open Marcus / Ally / Capital One 360 (~4.5% APY vs Stearns 0.84%). Set up so Dani's ~$50k can land here in October. Move Stearns ·1244 $5,100 + Personal Savings surplus in once settled. This single move earns ~$2,300/yr more in interest.", amt:"+~$2,300/yr", amtCls:"sav"},
          {id:"Sep_mort", date:"Sep 1", color:"#7B3FA0", type:"", name:"Mortgage", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. $3,000 PITI — taxes and insurance included.", amt:"-$3,000", amtCls:"exp"},
          {id:"Sep_neon", date:"Sep 1", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"Sep_trash", date:"Sep 1", color:"#7B3FA0", type:"", name:"Trash", tag:"Autopay", tagCls:"t-ap", sub:"~$12 — verify exact date from bill", amt:"-$12", amtCls:"exp"},
          {id:"Sep_water", date:"Sep 1", color:"#7B3FA0", type:"", name:"Water & Sewer", tag:"Autopay", tagCls:"t-ap", sub:"~$100 — verify exact date from bill", amt:"-$100", amtCls:"exp"},
          {id:"Sep_gas", date:"Sep 1", color:"#7B3FA0", type:"", name:"Gas (heat)", tag:"Autopay", tagCls:"t-ap", sub:"~$100 avg — higher in winter, lower in summer. Verify from bill.", amt:"-$100", amtCls:"exp"},
          {id:"Sep_amazon", date:"Sep 2", color:"#185FA5", type:"", name:"Amazon — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$16", amt:"-$16", amtCls:"exp"},
          {id:"Sep_selfin", date:"Sep 2", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"Sep_simpfin", date:"Sep 3", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"Sep_cell", date:"Sep 5", color:"#185FA5", type:"", name:"Cell Phone — Verizon", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$350. Switch to Mint/Visible after closing.", amt:"-$350", amtCls:"exp"},
          {id:"Sep_lead", date:"Sep 4", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"Sep_gone", date:"Sep 4", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"Sep_wash", date:"Sep 6", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
          {id:"Sep_groc1", date:"Sep 3 Thu", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"Good window — Spending funded from Aug 28 transfer.", amt:"~$250", amtCls:"exp"},
          {id:"Sep_fuel1", date:"Sep 7 Sun", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75. Balance comfortable.", amt:"~$75", amtCls:"exp"},
          {id:"Sep_origin", date:"Sep 8", color:"#F59E0B", type:"", name:"Origin Financial", tag:"", tagCls:"", sub:"Auto-charge ~$33 from Personal Savings.", amt:"-$33", amtCls:"exp"},
          {id:"Sep_autos", date:"Sep 9", color:"#185FA5", type:"", name:"Auto Insurance", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300.", amt:"-$300", amtCls:"exp"},
          {id:"Sep_plaid", date:"Sep 9", color:"#185FA5", type:"", name:"Plaid", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$6", amt:"-$6", amtCls:"exp"},
          {id:"Sep_paypal", date:"Sep 9&ndash;12", color:"#185FA5", type:"", name:"PayPal charges", tag:"Above the Norm", tagCls:"t-atn", sub:"Multiple charges. ~$42 total. Verify each one.", amt:"-$42", amtCls:"exp"},
          {id:"Sep_spotify", date:"Sep 10", color:"#185FA5", type:"", name:"Spotify", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$25", amt:"-$25", amtCls:"exp"},
          {id:"Sep_cs0", date:"Sep 4 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
        ],
      },
      {
        label: "Sep 11–15 · Stearns paycheck · Transfer to Spending",
        events: [
          {id:"Sep_st1", date:"Sep 11 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"Sep_xf1", date:"Sep 11 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Stearns check. Fund mid-month discretionary.", amt:"$723", amtCls:"trn"},
          {id:"Sep_cs1", date:"Sep 11 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Sep_cs1k", date:"Sep 11 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related groceries and activities. ~$100-150.", amt:"~$100-150", amtCls:"exp"},
          {id:"Sep_anth", date:"Sep 13", color:"#0F6E56", type:"", name:"Anthropic", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$20", amt:"-$20", amtCls:"exp"},
          {id:"Sep_shop1", date:"Sep 14 Mon", color:"#0F6E56", type:"", name:"Shopping window — $150", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$900 after Stearns transfer. Best window of month.", amt:"~$150", amtCls:"exp"},
        ],
      },
      {
        label: "Sep 15–22 · Apex paycheck · Auto loans · Bills · Groceries",
        events: [
          {id:"Sep_apex1", date:"Sep 15 Tue", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Sep_yost", date:"Sep 15 Tue", color:"#7B3FA0", type:"", name:"Yost & Baill", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$100", amt:"-$100", amtCls:"exp"},
          {id:"Sep_fid", date:"Sep 16", color:"#7B3FA0", type:"", name:"Fidelity Roth IRA", tag:"Autopay", tagCls:"t-ap", sub:"Confirm $325 transfer. Verify it's invested, not sitting in cash.", amt:"-$325", amtCls:"exp"},
          {id:"Sep_cricut", date:"Sep 17", color:"#185FA5", type:"", name:"Cricut", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$11", amt:"-$11", amtCls:"exp"},
          {id:"Sep_gplay", date:"Sep 18", color:"#0F6E56", type:"", name:"Google Play", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Sep_cs2", date:"Sep 18 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Sep_automike", date:"Sep 18 Fri", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
          {id:"Sep_autodani", date:"Sep 19 Sat", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"Sep_elec", date:"Sep 25 Fri", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339", amt:"-$339", amtCls:"exp"},
          {id:"Sep_groc2", date:"Sep 17 Thu", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$700 after Stearns transfer.", amt:"~$200", amtCls:"exp"},
          {id:"Sep_fuel2", date:"Sep 20 Sun", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75. After elec cluster.", amt:"~$75", amtCls:"exp"},
          {id:"Sep_inet", date:"Sep 22 Tue", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
        ],
      },
      {
        label: "Sep 22–30 · Late bills · Stearns · Apex · Save + HYSA",
        events: [
          {id:"eff_sweep_sep", date:"Sep 30 Wed", color:"#BA7517", type:"sev", name:"⭐ Sweep idle cash → HYSA", tag:"", tagCls:"", sub:"Move Child Support balance above ~$2,500 and Spending above ~$1,000 into the HYSA. These accounts quietly accumulate (~$475/mo in CS, ~$40/mo in Spending) and earn nothing where they sit. Keep kid-expense buffer in CS; sweep the rest.", amt:"→ HYSA", amtCls:"sav"},
          {id:"Sep_railway", date:"Sep 27", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Sep_blinkfit", date:"Sep 28", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Sep_apple", date:"Sep 25", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"Sep_pets", date:"Sep 24 Thu", color:"#0F6E56", type:"", name:"Pets", tag:"Spending", tagCls:"t-sp", sub:"~$125", amt:"~$125", amtCls:"exp"},
          {id:"Sep_blink", date:"Sep 26", color:"#185FA5", type:"", name:"Blink cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Sep_ringcam", date:"Sep 29", color:"#185FA5", type:"", name:"Ring Cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Sep_cs3", date:"Sep 25 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Sep_st2", date:"Sep 25 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending.", amt:"+$1,650", amtCls:"inc"},
          {id:"Sep_xf2", date:"Sep 25 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Second Stearns. Fund end of month and next month start.", amt:"$723", amtCls:"trn"},
          {id:"Sep_groc3", date:"Sep 27 Sun", color:"#0F6E56", type:"", name:"Groceries run 3", tag:"Spending", tagCls:"t-sp", sub:"Final grocery run of September.", amt:"~$200", amtCls:"exp"},
          {id:"Sep_fuel3", date:"Sep 29 Tue", color:"#0F6E56", type:"", name:"Fuel fill 3", tag:"Spending", tagCls:"t-sp", sub:"~$75. Top off before October.", amt:"~$75", amtCls:"exp"},
          {id:"Sep_shop2", date:"Sep 27 Sun", color:"#0F6E56", type:"", name:"Shopping window 2 — $150", tag:"Spending", tagCls:"t-sp", sub:"$150. $300 cap hit for September.", amt:"~$150", amtCls:"exp"},
          {id:"Sep_cs4", date:"Sep 30 Wed", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Sep_apex2", date:"Sep 30 Wed", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Sep_save", date:"Sep 30 Wed", color:"#7B3FA0", type:"sev", name:"Surplus → savings rebuild", tag:"SAVE", tagCls:"t-save", sub:"Distribute Autopay + ATN surplus to savings accounts. No deadline — comfortable pace.", amt:"~$700+ saved", amtCls:"sav"},
        ],
      },
    ],
  },
  {
    id: "october",
    name: "October 2026",
    income: "Income: ~$11,500 (incl. $2,800 bonus)",
    note: "Apex $7,400 · Stearns $3,300 · CS $1,000 · BONUS · Dani's house sale closes",
    phase: "post",
    phaseTxt: "Bonus month. All $2,800 to savings. Dani's house closes ~late October — ~$50k to Liberty. Shop home+auto bundle insurance this month. Consider cell plan switch.",
    balStrips: [
      {
        label: "Oct end · All accounts settled",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Oct 1–10 · Mortgage · Early bills",
        events: [
          {id:"Oct_mort", date:"Oct 1", color:"#7B3FA0", type:"", name:"Mortgage", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. $3,000 PITI — taxes and insurance included.", amt:"-$3,000", amtCls:"exp"},
          {id:"Oct_neon", date:"Oct 1", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"Oct_trash", date:"Oct 1", color:"#7B3FA0", type:"", name:"Trash", tag:"Autopay", tagCls:"t-ap", sub:"~$12 — verify exact date from bill", amt:"-$12", amtCls:"exp"},
          {id:"Oct_water", date:"Oct 1", color:"#7B3FA0", type:"", name:"Water & Sewer", tag:"Autopay", tagCls:"t-ap", sub:"~$100 — verify exact date from bill", amt:"-$100", amtCls:"exp"},
          {id:"Oct_gas", date:"Oct 1", color:"#7B3FA0", type:"", name:"Gas (heat)", tag:"Autopay", tagCls:"t-ap", sub:"~$100 avg — higher in winter, lower in summer. Verify from bill.", amt:"-$100", amtCls:"exp"},
          {id:"Oct_amazon", date:"Oct 2", color:"#185FA5", type:"", name:"Amazon — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$16", amt:"-$16", amtCls:"exp"},
          {id:"Oct_selfin", date:"Oct 2", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"Oct_simpfin", date:"Oct 3", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"Oct_cell", date:"Oct 5", color:"#185FA5", type:"", name:"Cell Phone — Verizon", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$350. Switch to Mint/Visible after closing.", amt:"-$350", amtCls:"exp"},
          {id:"Oct_lead", date:"Oct 4", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"Oct_gone", date:"Oct 4", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"Oct_wash", date:"Oct 6", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
          {id:"Oct_groc1", date:"Oct 3 Sat", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"Month starts with ~$723 in Spending from Sep transfer.", amt:"~$250", amtCls:"exp"},
          {id:"Oct_fuel1", date:"Oct 7 Wed", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75. Balance ~$370 before Stearns.", amt:"~$75", amtCls:"exp"},
          {id:"Oct_origin", date:"Oct 8", color:"#F59E0B", type:"", name:"Origin Financial", tag:"", tagCls:"", sub:"Auto-charge ~$33 from Personal Savings.", amt:"-$33", amtCls:"exp"},
          {id:"Oct_autos", date:"Oct 9", color:"#185FA5", type:"", name:"Auto Insurance", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300.", amt:"-$300", amtCls:"exp"},
          {id:"Oct_plaid", date:"Oct 9", color:"#185FA5", type:"", name:"Plaid", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$6", amt:"-$6", amtCls:"exp"},
          {id:"Oct_paypal", date:"Oct 9&ndash;12", color:"#185FA5", type:"", name:"PayPal charges", tag:"Above the Norm", tagCls:"t-atn", sub:"Multiple charges. ~$42 total. Verify each one.", amt:"-$42", amtCls:"exp"},
          {id:"Oct_spotify", date:"Oct 10", color:"#185FA5", type:"", name:"Spotify", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$25", amt:"-$25", amtCls:"exp"},
          {id:"Oct_cs0", date:"Oct 2 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
        ],
      },
      {
        label: "Oct 11–15 · Stearns paycheck · Transfer to Spending",
        events: [
          {id:"Oct_st1", date:"Oct 9 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"Oct_xf1", date:"Oct 9 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Stearns check. Fund mid-month discretionary.", amt:"$723", amtCls:"trn"},
          {id:"Oct_cs1", date:"Oct 9 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Oct_cs1k", date:"Oct 9 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related groceries and activities. ~$100-150.", amt:"~$100-150", amtCls:"exp"},
          {id:"Oct_anth", date:"Oct 13", color:"#0F6E56", type:"", name:"Anthropic", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$20", amt:"-$20", amtCls:"exp"},
          {id:"Oct_shop1", date:"Oct 15 Thu", color:"#0F6E56", type:"", name:"Shopping window — $150", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$900 after Stearns. Best window.", amt:"~$150", amtCls:"exp"},
        ],
      },
      {
        label: "Oct 15–22 · Apex paycheck · Auto loans · Bills · Groceries",
        events: [
          {id:"Oct_apex1", date:"Oct 15 Thu", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Oct_yost", date:"Oct 15 Thu", color:"#7B3FA0", type:"", name:"Yost & Baill", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$100", amt:"-$100", amtCls:"exp"},
          {id:"Oct_fid", date:"Oct 16", color:"#7B3FA0", type:"", name:"Fidelity Roth IRA", tag:"Autopay", tagCls:"t-ap", sub:"Confirm $325 transfer. Verify it's invested, not sitting in cash.", amt:"-$325", amtCls:"exp"},
          {id:"Oct_cricut", date:"Oct 17", color:"#185FA5", type:"", name:"Cricut", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$11", amt:"-$11", amtCls:"exp"},
          {id:"Oct_gplay", date:"Oct 18", color:"#0F6E56", type:"", name:"Google Play", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Oct_cs2", date:"Oct 16 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Oct_automike", date:"Oct 18 Sun", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
          {id:"Oct_autodani", date:"Oct 19 Mon", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"Oct_elec", date:"Oct 23 Fri", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339", amt:"-$339", amtCls:"exp"},
          {id:"Oct_groc2", date:"Oct 17 Sat", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$700 after Stearns transfer.", amt:"~$200", amtCls:"exp"},
          {id:"Oct_fuel2", date:"Oct 19 Mon", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75. Balance ~$600.", amt:"~$75", amtCls:"exp"},
          {id:"Oct_inet", date:"Oct 22 Thu", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
          {id:"oct_sams", date:"Oct", color:"#0F6E56", type:"", name:"Sam's Club membership renewal", tag:"Spending", tagCls:"t-sp", sub:"Annual fee ~$65. Cheaper per-unit than standard grocery stores at your spend level. Worth keeping.", amt:"-$65", amtCls:"exp"},
        ],
      },
      {
        label: "Oct 22–31 · Late bills · Stearns · Apex · BONUS · Dani sale → HYSA",
        events: [
          {id:"Oct_railway", date:"Oct 27", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Oct_blinkfit", date:"Oct 28", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Oct_apple", date:"Oct 25", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"Oct_pets", date:"Oct 24 Sat", color:"#0F6E56", type:"", name:"Pets", tag:"Spending", tagCls:"t-sp", sub:"~$125", amt:"~$125", amtCls:"exp"},
          {id:"Oct_blink", date:"Oct 26", color:"#185FA5", type:"", name:"Blink cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Oct_ringcam", date:"Oct 29", color:"#185FA5", type:"", name:"Ring Cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Oct_cs3", date:"Oct 23 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Oct_dani", date:"~late Oct", color:"#085041", type:"hev", name:"Dani's house closes — ~$50k net", tag:"WINDFALL", tagCls:"t-hse", sub:"⭐ Route ALL ~$50k into the HYSA (opened in Sep), NOT Liberty/Stearns. At 4.5% vs 0.84% that's ~$1,856/yr more interest on this money alone. Budget $10-15k for furnishings; leave the rest as emergency fund earning 4.5%. Do NOT rush to pay down principal — at current rates it's a wash vs HYSA.", amt:"+~$50,000", amtCls:"hse"},
          {id:"Oct_st2", date:"Oct 23 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending.", amt:"+$1,650", amtCls:"inc"},
          {id:"Oct_xf2", date:"Oct 23 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Second Stearns. Fund end of month and next month start.", amt:"$723", amtCls:"trn"},
          {id:"Oct_groc3", date:"Oct 28 Wed", color:"#0F6E56", type:"", name:"Groceries run 3", tag:"Spending", tagCls:"t-sp", sub:"Final grocery run of October.", amt:"~$200", amtCls:"exp"},
          {id:"Oct_fuel3", date:"Oct 29 Thu", color:"#0F6E56", type:"", name:"Fuel fill 3", tag:"Spending", tagCls:"t-sp", sub:"~$75. Top off before November.", amt:"~$75", amtCls:"exp"},
          {id:"Oct_shop2", date:"Oct 26 Mon", color:"#0F6E56", type:"", name:"Shopping window 2 — $150", tag:"Spending", tagCls:"t-sp", sub:"$150. $300 cap hit.", amt:"~$150", amtCls:"exp"},
          {id:"Oct_cs4", date:"Oct 30 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Oct_apex2", date:"Oct 30 Fri", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Oct_bonus", date:"Oct 30 Fri", color:"#7B3FA0", type:"bev", name:"Apex BONUS $2,800 — all to savings", tag:"BONUS", tagCls:"t-bon", sub:"Split $700 each: Stearns ·4182, ·3046, Personal Savings, Liberty. No deadline — comfortable pace.", amt:"+$2,800 → SAVE", amtCls:"bon"},
          {id:"Oct_save", date:"Oct 30 Fri", color:"#7B3FA0", type:"sev", name:"Surplus → savings rebuild", tag:"SAVE", tagCls:"t-save", sub:"Distribute Autopay + ATN surplus to savings accounts. No deadline — comfortable pace.", amt:"~$700+ saved", amtCls:"sav"},
        ],
      },
    ],
  },
  {
    id: "november",
    name: "November 2026",
    income: "Income: $8,975",
    note: "Apex $4,600 · Stearns $3,575 · CS $800 · Steady · Savings building",
    phase: "post",
    phaseTxt: "Steady month. ~$1,179 surplus. Savings growing on comfortable pace. No deadline.",
    balStrips: [
      {
        label: "Nov end · All accounts settled",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Nov 1–10 · Mortgage · Early bills",
        events: [
          {id:"Nov_mort", date:"Nov 1", color:"#7B3FA0", type:"", name:"Mortgage", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. $3,000 PITI — taxes and insurance included.", amt:"-$3,000", amtCls:"exp"},
          {id:"Nov_neon", date:"Nov 1", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"Nov_trash", date:"Nov 1", color:"#7B3FA0", type:"", name:"Trash", tag:"Autopay", tagCls:"t-ap", sub:"~$12 — verify exact date from bill", amt:"-$12", amtCls:"exp"},
          {id:"Nov_water", date:"Nov 1", color:"#7B3FA0", type:"", name:"Water & Sewer", tag:"Autopay", tagCls:"t-ap", sub:"~$100 — verify exact date from bill", amt:"-$100", amtCls:"exp"},
          {id:"Nov_gas", date:"Nov 1", color:"#7B3FA0", type:"", name:"Gas (heat)", tag:"Autopay", tagCls:"t-ap", sub:"~$100 avg — higher in winter, lower in summer. Verify from bill.", amt:"-$100", amtCls:"exp"},
          {id:"Nov_amazon", date:"Nov 2", color:"#185FA5", type:"", name:"Amazon — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$16", amt:"-$16", amtCls:"exp"},
          {id:"Nov_selfin", date:"Nov 2", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"Nov_simpfin", date:"Nov 3", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"Nov_cell", date:"Nov 5", color:"#185FA5", type:"", name:"Cell Phone — Verizon", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$350. Switch to Mint/Visible after closing.", amt:"-$350", amtCls:"exp"},
          {id:"Nov_lead", date:"Nov 4", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"Nov_gone", date:"Nov 4", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"Nov_wash", date:"Nov 6", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
          {id:"Nov_groc1", date:"Nov 3 Tue", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"Good window — Spending funded from Oct transfer.", amt:"~$250", amtCls:"exp"},
          {id:"Nov_fuel1", date:"Nov 7 Sat", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75. Balance ~$370 before Stearns.", amt:"~$75", amtCls:"exp"},
          {id:"Nov_origin", date:"Nov 8", color:"#F59E0B", type:"", name:"Origin Financial", tag:"", tagCls:"", sub:"Auto-charge ~$33 from Personal Savings.", amt:"-$33", amtCls:"exp"},
          {id:"Nov_autos", date:"Nov 9", color:"#185FA5", type:"", name:"Auto Insurance", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300.", amt:"-$300", amtCls:"exp"},
          {id:"Nov_plaid", date:"Nov 9", color:"#185FA5", type:"", name:"Plaid", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$6", amt:"-$6", amtCls:"exp"},
          {id:"Nov_paypal", date:"Nov 9&ndash;12", color:"#185FA5", type:"", name:"PayPal charges", tag:"Above the Norm", tagCls:"t-atn", sub:"Multiple charges. ~$42 total. Verify each one.", amt:"-$42", amtCls:"exp"},
          {id:"Nov_spotify", date:"Nov 10", color:"#185FA5", type:"", name:"Spotify", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$25", amt:"-$25", amtCls:"exp"},
          {id:"Nov_cs0", date:"Nov 6 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
        ],
      },
      {
        label: "Nov 11–15 · Stearns paycheck · Transfer to Spending",
        events: [
          {id:"Nov_st1", date:"Nov 13 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"Nov_xf1", date:"Nov 13 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Stearns check. Fund mid-month discretionary.", amt:"$723", amtCls:"trn"},
          {id:"Nov_cs1", date:"Nov 13 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Nov_cs1k", date:"Nov 13 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related groceries and activities. ~$100-150.", amt:"~$100-150", amtCls:"exp"},
          {id:"Nov_anth", date:"Nov 13", color:"#0F6E56", type:"", name:"Anthropic", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$20", amt:"-$20", amtCls:"exp"},
          {id:"Nov_shop1", date:"Nov 14 Sat", color:"#0F6E56", type:"", name:"Shopping window — $150", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$870. Best window.", amt:"~$150", amtCls:"exp"},
        ],
      },
      {
        label: "Nov 15–22 · Apex paycheck · Auto loans · Bills · Groceries",
        events: [
          {id:"Nov_apex1", date:"Nov 14 Sat", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Nov_yost", date:"Nov 14 Sat", color:"#7B3FA0", type:"", name:"Yost & Baill", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$100", amt:"-$100", amtCls:"exp"},
          {id:"Nov_fid", date:"Nov 16", color:"#7B3FA0", type:"", name:"Fidelity Roth IRA", tag:"Autopay", tagCls:"t-ap", sub:"Confirm $325 transfer. Verify it's invested, not sitting in cash.", amt:"-$325", amtCls:"exp"},
          {id:"Nov_cricut", date:"Nov 17", color:"#185FA5", type:"", name:"Cricut", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$11", amt:"-$11", amtCls:"exp"},
          {id:"Nov_gplay", date:"Nov 18", color:"#0F6E56", type:"", name:"Google Play", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Nov_cs2", date:"Nov 20 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Nov_automike", date:"Nov 18 Wed", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
          {id:"Nov_autodani", date:"Nov 19 Thu", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"Nov_elec", date:"Nov 27 Fri", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339", amt:"-$339", amtCls:"exp"},
          {id:"Nov_groc2", date:"Nov 17 Tue", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$690 after Stearns transfer.", amt:"~$200", amtCls:"exp"},
          {id:"Nov_fuel2", date:"Nov 19 Thu", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75. Balance ~$490.", amt:"~$75", amtCls:"exp"},
          {id:"Nov_inet", date:"Nov 22 Sun", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
        ],
      },
      {
        label: "Nov 22–30 · Late bills · Stearns · Apex · Save + HYSA",
        events: [
          {id:"eff_sweep_nov", date:"Nov 30 Mon", color:"#BA7517", type:"sev", name:"⭐ Sweep idle cash → HYSA", tag:"", tagCls:"", sub:"Move Child Support balance above ~$2,500 and Spending above ~$1,000 into the HYSA. These accounts quietly accumulate (~$475/mo in CS, ~$40/mo in Spending) and earn nothing where they sit. Keep kid-expense buffer in CS; sweep the rest.", amt:"→ HYSA", amtCls:"sav"},
          {id:"Nov_railway", date:"Nov 27", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Nov_blinkfit", date:"Nov 28", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Nov_apple", date:"Nov 25", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"Nov_pets", date:"Nov 24 Tue", color:"#0F6E56", type:"", name:"Pets", tag:"Spending", tagCls:"t-sp", sub:"~$125", amt:"~$125", amtCls:"exp"},
          {id:"Nov_blink", date:"Nov 26", color:"#185FA5", type:"", name:"Blink cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Nov_ringcam", date:"Nov 29", color:"#185FA5", type:"", name:"Ring Cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Nov_cs3", date:"Nov 27 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Nov_st2", date:"Nov 27 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending.", amt:"+$1,650", amtCls:"inc"},
          {id:"Nov_xf2", date:"Nov 27 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Second Stearns. Fund end of month and next month start.", amt:"$723", amtCls:"trn"},
          {id:"Nov_groc3", date:"Nov 28 Sat", color:"#0F6E56", type:"", name:"Groceries run 3", tag:"Spending", tagCls:"t-sp", sub:"~$200. Holiday week — stay within caps.", amt:"~$200", amtCls:"exp"},
          {id:"Nov_fuel3", date:"Nov 29 Sun", color:"#0F6E56", type:"", name:"Fuel fill 3", tag:"Spending", tagCls:"t-sp", sub:"~$75. Top off before December.", amt:"~$75", amtCls:"exp"},
          {id:"Nov_shop2", date:"Nov 28 Sat", color:"#0F6E56", type:"", name:"Shopping window 2 — $150", tag:"Spending", tagCls:"t-sp", sub:"$150. Holiday shopping. Stay at $300 cap.", amt:"~$150", amtCls:"exp"},
          {id:"Nov_cs4", date:"Nov 30 Mon", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Nov_apex2", date:"Nov 30 Mon", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Nov_save", date:"Nov 30 Mon", color:"#7B3FA0", type:"sev", name:"Surplus → savings rebuild", tag:"SAVE", tagCls:"t-save", sub:"Distribute Autopay + ATN surplus to savings accounts. No deadline — comfortable pace.", amt:"~$700+ saved", amtCls:"sav"},
        ],
      },
    ],
  },
  {
    id: "december",
    name: "December 2026",
    income: "Income: $8,975",
    note: "Apex $4,600 · Stearns $3,575 · CS $800 · Year end · Savings fully rebuilt",
    phase: "post",
    phaseTxt: "Final month of plan. Savings at target. $0 debt. Jan 2027 bonus finishes the job. Settled, stable, building.",
    balStrips: [
      {
        label: "Dec end · All accounts settled",
        note: "",
        items: [
        ],
      },
    ],
    weeks: [
      {
        label: "Dec 1–10 · Mortgage · Early bills",
        events: [
          {id:"Dec_mort", date:"Dec 1", color:"#7B3FA0", type:"", name:"Mortgage", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. $3,000 PITI — taxes and insurance included.", amt:"-$3,000", amtCls:"exp"},
          {id:"Dec_neon", date:"Dec 1", color:"#0F6E56", type:"", name:"Neon Tech", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$3.76", amt:"-$3.76", amtCls:"exp"},
          {id:"Dec_trash", date:"Dec 1", color:"#7B3FA0", type:"", name:"Trash", tag:"Autopay", tagCls:"t-ap", sub:"~$12 — verify exact date from bill", amt:"-$12", amtCls:"exp"},
          {id:"Dec_water", date:"Dec 1", color:"#7B3FA0", type:"", name:"Water & Sewer", tag:"Autopay", tagCls:"t-ap", sub:"~$100 — verify exact date from bill", amt:"-$100", amtCls:"exp"},
          {id:"Dec_gas", date:"Dec 1", color:"#7B3FA0", type:"", name:"Gas (heat)", tag:"Autopay", tagCls:"t-ap", sub:"~$100 avg — higher in winter, lower in summer. Verify from bill.", amt:"-$100", amtCls:"exp"},
          {id:"Dec_amazon", date:"Dec 2", color:"#185FA5", type:"", name:"Amazon — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$16", amt:"-$16", amtCls:"exp"},
          {id:"Dec_selfin", date:"Dec 2", color:"#0F6E56", type:"", name:"Self Financial", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$6.95", amt:"-$6.95", amtCls:"exp"},
          {id:"Dec_simpfin", date:"Dec 3", color:"#185FA5", type:"", name:"SimpleFin Bridge", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$1.50", amt:"-$1.50", amtCls:"exp"},
          {id:"Dec_cell", date:"Dec 5", color:"#185FA5", type:"", name:"Cell Phone — Verizon", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$350. Switch to Mint/Visible after closing.", amt:"-$350", amtCls:"exp"},
          {id:"Dec_lead", date:"Dec 4", color:"#7B3FA0", type:"", name:"Lead Bank Self Lend", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$32", amt:"-$32", amtCls:"exp"},
          {id:"Dec_gone", date:"Dec 4", color:"#0F6E56", type:"", name:"Google One", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$2.49", amt:"-$2.49", amtCls:"exp"},
          {id:"Dec_wash", date:"Dec 6", color:"#0F6E56", type:"", name:"Wash N Tan", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$60", amt:"-$60", amtCls:"exp"},
          {id:"Dec_groc1", date:"Dec 3 Thu", color:"#0F6E56", type:"", name:"Groceries run 1", tag:"Spending", tagCls:"t-sp", sub:"Good window — Spending funded from Nov transfer.", amt:"~$250", amtCls:"exp"},
          {id:"Dec_fuel1", date:"Dec 7 Mon", color:"#0F6E56", type:"", name:"Fuel fill 1", tag:"Spending", tagCls:"t-sp", sub:"~$75.", amt:"~$75", amtCls:"exp"},
          {id:"Dec_origin", date:"Dec 8", color:"#F59E0B", type:"", name:"Origin Financial", tag:"", tagCls:"", sub:"Auto-charge ~$33 from Personal Savings.", amt:"-$33", amtCls:"exp"},
          {id:"Dec_autos", date:"Dec 9", color:"#185FA5", type:"", name:"Auto Insurance", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$300.", amt:"-$300", amtCls:"exp"},
          {id:"Dec_plaid", date:"Dec 9", color:"#185FA5", type:"", name:"Plaid", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$6", amt:"-$6", amtCls:"exp"},
          {id:"Dec_paypal", date:"Dec 9&ndash;12", color:"#185FA5", type:"", name:"PayPal charges", tag:"Above the Norm", tagCls:"t-atn", sub:"Multiple charges. ~$42 total. Verify each one.", amt:"-$42", amtCls:"exp"},
          {id:"Dec_spotify", date:"Dec 10", color:"#185FA5", type:"", name:"Spotify", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$25", amt:"-$25", amtCls:"exp"},
          {id:"Dec_cs0", date:"Dec 4 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
        ],
      },
      {
        label: "Dec 11–15 · Stearns paycheck · Transfer to Spending",
        events: [
          {id:"Dec_st1", date:"Dec 11 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending immediately.", amt:"+$1,650", amtCls:"inc"},
          {id:"Dec_xf1", date:"Dec 11 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Stearns check. Fund mid-month discretionary.", amt:"$723", amtCls:"trn"},
          {id:"Dec_cs1", date:"Dec 11 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Dec_cs1k", date:"Dec 11 Fri", color:"#BA7517", type:"", name:"Kids expenses from CS", tag:"Child Support", tagCls:"t-cs", sub:"Child-related groceries and activities. ~$100-150.", amt:"~$100-150", amtCls:"exp"},
          {id:"Dec_anth", date:"Dec 13", color:"#0F6E56", type:"", name:"Anthropic", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$20", amt:"-$20", amtCls:"exp"},
          {id:"Dec_shop1", date:"Dec 13 Sun", color:"#0F6E56", type:"", name:"Shopping window — $150", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$870. Holiday shopping. Stay at $300 cap.", amt:"~$150", amtCls:"exp"},
        ],
      },
      {
        label: "Dec 15–22 · Apex paycheck · Auto loans · Bills · Groceries",
        events: [
          {id:"Dec_apex1", date:"Dec 15 Tue", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Dec_yost", date:"Dec 15 Tue", color:"#7B3FA0", type:"", name:"Yost & Baill", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$100", amt:"-$100", amtCls:"exp"},
          {id:"Dec_fid", date:"Dec 16", color:"#7B3FA0", type:"", name:"Fidelity Roth IRA", tag:"Autopay", tagCls:"t-ap", sub:"Confirm $325 transfer. Verify it's invested, not sitting in cash.", amt:"-$325", amtCls:"exp"},
          {id:"Dec_cricut", date:"Dec 17", color:"#185FA5", type:"", name:"Cricut", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$11", amt:"-$11", amtCls:"exp"},
          {id:"Dec_gplay", date:"Dec 18", color:"#0F6E56", type:"", name:"Google Play", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Dec_cs2", date:"Dec 18 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Dec_automike", date:"Dec 18 Fri", color:"#7B3FA0", type:"", name:"Auto Loan — Mike", tag:"Autopay", tagCls:"t-ap", sub:"Pay manually. ~$725", amt:"-$725", amtCls:"exp"},
          {id:"Dec_autodani", date:"Dec 19 Sat", color:"#185FA5", type:"", name:"Auto Loan — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$750", amt:"-$750", amtCls:"exp"},
          {id:"Dec_elec", date:"Dec 25 Fri", color:"#185FA5", type:"", name:"Electricity + Student Loan + Amazon Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339", amt:"-$339", amtCls:"exp"},
          {id:"Dec_groc2", date:"Dec 17 Thu", color:"#0F6E56", type:"", name:"Groceries run 2", tag:"Spending", tagCls:"t-sp", sub:"Balance ~$640. Comfortable.", amt:"~$200", amtCls:"exp"},
          {id:"Dec_fuel2", date:"Dec 19 Sat", color:"#0F6E56", type:"", name:"Fuel fill 2", tag:"Spending", tagCls:"t-sp", sub:"~$75. Balance ~$540.", amt:"~$75", amtCls:"exp"},
          {id:"Dec_inet", date:"Dec 22 Tue", color:"#185FA5", type:"", name:"Internet — Spectrum", tag:"Above the Norm", tagCls:"t-atn", sub:"Pay manually. ~$65", amt:"-$65", amtCls:"exp"},
          {id:"dec_yearend", date:"Dec 31 Thu", color:"#0C447C", type:"sev", name:"Year-end savings push — distribute all surplus", tag:"SAVE", tagCls:"t-save", sub:"Sweep all surplus above operating floors into the HYSA: Child Support over ~$2,500, Spending over ~$1,000, Autopay over ~$1,500. Jan 2027 bonus adds another $2,800. Everything now earning 4.5% — settled, stable, compounding.", amt:"~$1,500 saved", amtCls:"sav"},
        ],
      },
      {
        label: "Dec 22–31 · Late bills · Stearns · Apex · Year-end sweep",
        events: [
          {id:"Dec_railway", date:"Dec 27", color:"#0F6E56", type:"", name:"Railway", tag:"Spending", tagCls:"t-sp", sub:"Auto-charge ~$5", amt:"-$5", amtCls:"exp"},
          {id:"Dec_blinkfit", date:"Dec 28", color:"#185FA5", type:"", name:"Blink Fitness", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Dec_apple", date:"Dec 25", color:"#7B3FA0", type:"", name:"AppleCare", tag:"Autopay", tagCls:"t-ap", sub:"Auto-charge ~$15", amt:"-$15", amtCls:"exp"},
          {id:"Dec_pets", date:"Dec 24 Thu", color:"#0F6E56", type:"", name:"Pets", tag:"Spending", tagCls:"t-sp", sub:"~$125", amt:"~$125", amtCls:"exp"},
          {id:"Dec_blink", date:"Dec 26", color:"#185FA5", type:"", name:"Blink cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Dec_ringcam", date:"Dec 29", color:"#185FA5", type:"", name:"Ring Cam", tag:"Above the Norm", tagCls:"t-atn", sub:"Auto-charge ~$12", amt:"-$12", amtCls:"exp"},
          {id:"Dec_cs3", date:"Dec 25 Fri", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Dec_st2", date:"Dec 25 Fri", color:"#185FA5", type:"", name:"Stearns paycheck — Dani", tag:"Above the Norm", tagCls:"t-atn", sub:"Transfer $723 to Spending.", amt:"+$1,650", amtCls:"inc"},
          {id:"Dec_xf2", date:"Dec 25 Fri", color:"#185FA5", type:"", name:"Transfer $723 → Spending", tag:"Spending", tagCls:"t-sp", sub:"Second Stearns. Fund end of month and next month start.", amt:"$723", amtCls:"trn"},
          {id:"Dec_groc3", date:"Dec 27 Sun", color:"#0F6E56", type:"", name:"Groceries run 3", tag:"Spending", tagCls:"t-sp", sub:"~$200. Year-end stock up.", amt:"~$200", amtCls:"exp"},
          {id:"Dec_fuel3", date:"Dec 29 Tue", color:"#0F6E56", type:"", name:"Fuel fill 3", tag:"Spending", tagCls:"t-sp", sub:"~$75. Last fill of the year.", amt:"~$75", amtCls:"exp"},
          {id:"Dec_shop2", date:"Dec 23 Wed", color:"#0F6E56", type:"", name:"Shopping window 2 — $150", tag:"Spending", tagCls:"t-sp", sub:"$150. $300 cap hit. Holiday week.", amt:"~$150", amtCls:"exp"},
          {id:"Dec_cs4", date:"Dec 31 Thu", color:"#BA7517", type:"", name:"Child support — $200", tag:"Child Support", tagCls:"t-cs", sub:"Weekly CS.", amt:"+~$200", amtCls:"inc"},
          {id:"Dec_apex2", date:"Dec 31 Thu", color:"#7B3FA0", type:"", name:"Apex paycheck", tag:"Autopay", tagCls:"t-ap", sub:"", amt:"+$2,300", amtCls:"inc"},
          {id:"Dec_save", date:"Dec 31 Thu", color:"#7B3FA0", type:"sev", name:"Surplus → savings rebuild", tag:"SAVE", tagCls:"t-save", sub:"Distribute Autopay + ATN surplus to savings accounts. No deadline — comfortable pace.", amt:"~$700+ saved", amtCls:"sav"},
        ],
      },
    ],
  },
]
// ── main component ─────────────────────────────────────────
export default function BudgetCalendar() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [dates, setDates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DATES_KEY) || '{}') } catch { return {} }
  })
  const [syncing, setSyncing] = useState(false)

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
      } catch { /* use localStorage */ }
    }
    loadRemote()
  }, [])

  // ── persist: localStorage + debounced backend save ─────
  const saveTimer = useRef(null)
  function persistState(newChecked, newDates) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newChecked))
    localStorage.setItem(DATES_KEY,   JSON.stringify(newDates))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSyncing(true)
      await syncSave(newChecked, newDates)
      setSyncing(false)
    }, 800)
  }

  const toggle = useCallback((id) => {
    setChecked(prev => {
      const next = { ...prev }
      next[id] ? delete next[id] : next[id] = true
      setDates(d => { persistState(next, d); return d })
      return next
    })
  }, [])

  const saveDate = useCallback((id, val) => {
    setDates(prev => {
      const next = { ...prev }
      val ? next[id] = val : delete next[id]
      setChecked(c => { persistState(c, next); return c })
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

  const resetDates = () => {
    if (!window.confirm(`Reset all ${Object.keys(dates).length} date edits?`)) return
    setDates({})
    localStorage.removeItem(DATES_KEY)
    setChecked(c => { persistState(c, {}); return c })
  }

  const allIds    = MONTHS.flatMap(m => m.weeks.flatMap(w => w.events.map(e => e.id)))
  const total     = allIds.length
  const done      = allIds.filter(id => checked[id]).length
  const pct       = total ? Math.round((done / total) * 100) : 0
  const editCount = Object.keys(dates).length

  return (
    <SwShell>
      {/* ── head ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budget Plan</div>
          <h1 className={s.title}>June 15 through December 2026</h1>
          <div className={s.subtitle}>Mike + Dani · Offer Jun 14 · Citi payoff Jun 15 · Inspection before Jun 20 · Apply Jul 1 · 401k ~Jul 10 · Close ~Aug 14 · Mortgage Sep 1 · Dani house sale ~Oct · Savings rebuild no deadline</div>
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
        <span className={s.progCount}>{done} / {total}</span>
        {syncing && <span className={s.syncBadge}>syncing…</span>}
        <button className={s.resetBtn} onClick={reset}>Reset checks</button>
        {editCount > 0 && (
          <button className={s.resetBtn} onClick={resetDates}>Reset dates ({editCount})</button>
        )}
      </div>

      {/* ── account legend ── */}
      <div className={s.legend} style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        {[
          {color:'#7B3FA0', name:'Autopay ·9785',        detail:`Apex lands here · Mortgage · Mike's car · Yost · Lead Bank · Roth`,   bal:'$8.12 — Apex Jun 15',                 balOk:false},
          {color:'#185FA5', name:'Above the Norm ·4510',  detail:`Stearns lands here · Dani's car · Utilities · Insurance · Subs`,      bal:'$175.00',                             balOk:false},
          {color:'#0F6E56', name:'Spending ·1712',         detail:'Funded $723×2/mo from ATN · Groceries · Fuel · Shopping',             bal:'$28.11 — critical until Jun 15',      balOk:false},
          {color:'#BA7517', name:'Child Support ·9893',    detail:'CS income · $1,000 floor · Kids & family',                            bal:'$890 — below floor, recovers Jun 19', balOk:false},
          {color:'#0C9BAE', name:'Savings (total)',         detail:'Personal $929 · ·1244 $5,100 · ·3046 $440 · ·4182 $900 · Liberty $5,900', bal:'$13,269 liquid · 401k $42,000',  balOk:true},
        ].map((a,i) => (
          <div key={i} className={s.legendItem} style={{'--ac':a.color}}>
            <div className={s.lheader}><div className={s.ldot}/><div className={s.lname}>{a.name}</div></div>
            <div className={s.ldetail}>{a.detail}</div>
            <div className={`${s.lbal} ${a.balOk ? s.lbalOk : s.lbalWarn}`}>{a.bal}</div>
          </div>
        ))}
      </div>

      {/* ── months ── */}
      <div className={s.months}>
        {MONTHS.map(month => (
          <div key={month.id} className={s.month}>
            <div className={s.mhdr}>
              <div className={s.mname}>{month.name}</div>
              <div className={s.mmeta}>
                <div className={s.mincome}>{month.income}</div>
                <div className={s.mnote}>{month.note}</div>
              </div>
            </div>
            <div className={`${s.pbanner} ${s[month.phase]}`}>{month.phaseTxt}</div>

            {month.weeks.map((week, wi) => (
              <div key={wi} className={s.week}>
                <div className={s.wlabel}>{week.label}</div>
                {week.events.map(ev => (
                  <Ev key={ev.id} ev={ev}
                    done={!!checked[ev.id]}
                    onToggle={toggle}
                    dateOverride={dates[ev.id]}
                    onDateSave={saveDate} />
                ))}
              </div>
            ))}

            {month.balStrips?.map((bs, bi) => (
              <BalStrip key={bi} {...bs} />
            ))}

            {month.mbar && <div className={s.mbar}>{month.mbar}</div>}

            {month.surplus && (
              <div className={s.surp}>
                <span>{month.surplus}</span>
                <strong>{month.surplusVal}</strong>
              </div>
            )}

            {month.sstrip && (
              <div className={s.sstrip}>
                {month.sstrip.map((sv,i) => (
                  <div key={i}><div className={s.slabel}>{sv.l}</div><div className={s.sval}>{sv.v}</div></div>
                ))}
              </div>
            )}

            {month.footer && (
              <div className={s.mfooter}>
                {month.footer.map((f,i) => (
                  <div key={i}>
                    <div className={s.flabel}><div className={s.fdot} style={{background:f.color}}/>{['Autopay','Above the Norm','Spending','Child Support'][i] || ''}</div>
                    <div className={`${s.fbal} ${f.cls === 'ok' ? s.fok : f.cls === 'low' ? s.flow : s.fwarn}`}>{f.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SwShell>
  )
}
