import { useState, useCallback } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import s from './BudgetCalendar.module.css'

const STORAGE_KEY = 'budget_v4_1'

// ── account colours ────────────────────────────────────────
const C = {
  ap:  '#b07fd8', // Autopay     — purple
  atn: '#5ba8e8', // Above Norm  — blue
  sp:  '#62e0b5', // Spending    — mint
  cs:  '#e8b862', // Child Supp  — amber
  sv:  '#67c8d8', // Savings     — cyan
  ps:  '#e8a840', // Personal Sv — gold
  act: '#F59E0B', // Action      — yellow
  hse: '#1D9E75', // House       — green
}

// ── balance-strip helper ───────────────────────────────────
function BalStrip({ label, items, note }) {
  return (
    <div className={s.balStrip}>
      <div className={s.balLabel}>{label}</div>
      <div className={s.balGrid}>
        {items.map((it, i) => (
          <div key={i} className={`${s.balItem} ${it.total ? s.balTotal : ''}`}>
            <div className={s.balName}>{it.name}</div>
            <div className={s.balVal} style={it.color ? { color: it.color } : {}}>{it.val}</div>
          </div>
        ))}
      </div>
      {note && <div className={s.balNote}>{note}</div>}
    </div>
  )
}

// ── event component ────────────────────────────────────────
function Ev({ ev, done, onToggle }) {
  const rowCls = [
    s.ev,
    ev.type === 'sev'  ? s.evSave  : '',
    ev.type === 'mile' ? s.evMile  : '',
    ev.type === 'bev'  ? s.evBonus : '',
    ev.type === 'hev'  ? s.evHouse : '',
    ev.type === 'today'? s.evToday : '',
    done               ? s.evDone  : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowCls} onClick={() => onToggle(ev.id)} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggle(ev.id) }}>
      <div className={`${s.chk} ${done ? s.chkDone : ''}`} aria-hidden="true"/>
      <span className={s.edate}>{ev.date}</span>
      <div className={s.edot} style={{ background: ev.color || C.ap }}/>
      <div className={s.ebody}>
        <div className={s.ename}>
          {ev.name}
          {ev.tag && <span className={`${s.tag} ${s[ev.tagCls] || s.tagDef}`}>{ev.tag}</span>}
        </div>
        {ev.sub && <div className={s.esub}>{ev.sub}</div>}
      </div>
      <span className={`${s.eamt} ${s[ev.amtCls] || ''}`}>{ev.amt}</span>
    </div>
  )
}

// ── data ───────────────────────────────────────────────────
const MONTHS = [
  // ══════════════════════════════════════════════════════
  // JUNE
  // ══════════════════════════════════════════════════════
  {
    id: 'jun', name: 'June 2026 — Remaining',
    income: '~$8,050 (2 Apex + 1 Stearns + CS)',
    note: 'Autopay ·9785 · ATN ·4510 · CS ·9893 · Citi payoff Jun 15 · Inspection · Offer Jun 14',
    phase: 'pre', phaseTxt: 'Citi paid off Jun 15. Inspection ~$400 before Jun 20. Offer Jun 14. FICO 2 updates ~Jul 1. Do NOT apply for mortgage until after Jul 1 score update.',
    surplus: 'June — lean month post Citi payoff + inspection', surplusVal: 'Gets better Jul 1 with score update + better mortgage rate',
    sstrip: [{l:'Personal Savings ·4685',v:'~$200 (used $729 for Citi)'},{l:'Stearns ·1244',v:'~$5,100'},{l:'Stearns ·3046 / ·4182',v:'~$1,032 (used $608 for Citi)'},{l:'Liberty Savings',v:'~$5,900'}],
    footer: [{acct:'atn',bal:'~$0 after bills'},{acct:'ap',bal:'~$800 est.'},{acct:'sp',bal:'~$300 est.'},{acct:'cs',bal:'~$1,100 est.'}],
    weeks: [
      { label: 'Jun 14–15 · Offer · Apex payday · Citi payoff · Inspection', events: [
        {id:'buf_jun14', date:'Jun 14 Sun', color:C.sv, type:'sev', name:'Transfer $1,000 from Stearns ·1244 → ATN', tag:'Above the Norm', tagCls:'tagAtn', sub:'ONE-TIME June pre-fund. Gives ATN $1,175 buffer before Citi payoff. Returned to ·1244 on Jul 1.', amt:'$1,000', amtCls:'trn'},
        {id:'ev1', date:'Jun 14 Sun', color:C.act, type:'today', name:'Make offer on 611 8th Ave N', tag:'ACTION', tagCls:'tagAct', sub:'Earnest money from savings. Do NOT formally apply for mortgage until Jul 1 after FICO 2 updates.', amt:'action', amtCls:'trn'},
        {id:'ev2', date:'Jun 15 Mon', color:C.ap, type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'tagAp', sub:'Autopay: $8 + $2,300 = $2,308.', amt:'+$2,300', amtCls:'inc'},
        {id:'ev3', date:'Jun 15 Mon', color:C.act, type:'today', name:'PAY CITI IN FULL — $1,720', tag:'DO TODAY', tagCls:'tagNow', sub:'Transfer $608 from Stearns ·4182 first. Then pay: Personal Savings $929 + ATN $175 + Autopay $8 + ·4182 $608 = $1,720. Card hits $0. Score boost ~Jul 1–10.', amt:'-$1,720', amtCls:'bon'},
        {id:'ev4', date:'Jun 15 Mon', color:C.sp, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Fund June discretionary. Spending: $28 + $723 = $751.', amt:'$723', amtCls:'trn'},
        {id:'buf_jun15', date:'Jun 15 Mon', color:C.ap, type:'sev', name:'Transfer $1,000 from Autopay → ATN', tag:'Above the Norm', tagCls:'tagAtn', sub:'ONE-TIME June seed from Apex paycheck. Keeps ATN positive through all June bills. Returned to Autopay on Jul 1.', amt:'$1,000', amtCls:'trn'},
        {id:'ev5', date:'Jun 15 Mon', color:C.sp, type:'', name:'Neon Tech', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$3.76', amt:'-$3.76', amtCls:'exp'},
        {id:'ev6', date:'Jun 15 Mon', color:C.sp, type:'', name:'Self Financial', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$6.95', amt:'-$6.95', amtCls:'exp'},
        {id:'ev7', date:'Jun 15 Mon', color:C.atn, type:'', name:'SimpleFin Bridge', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$1.50', amt:'-$1.50', amtCls:'exp'},
        {id:'ev8', date:'Jun 16–18', color:C.act, type:'today', name:'Home inspection — ~$400', tag:'ACTION', tagCls:'tagAct', sub:'Pay from Autopay. Check basement and foundation thoroughly. Use findings as negotiating leverage on price.', amt:'-$400', amtCls:'exp'},
        {id:'ev9', date:'Jun 16–18', color:C.ap, type:'', name:'Lead Bank Self Lend', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$32', amt:'-$32', amtCls:'exp'},
        {id:'ev10', date:'Jun 16–18', color:C.sp, type:'', name:'Google One', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$2.49', amt:'-$2.49', amtCls:'exp'},
        {id:'ev11', date:'Jun 18 Thu', color:C.ap, type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$725', amt:'-$725', amtCls:'exp'},
      ]},
      { bal: {label:'After Jun 15–18 · Citi paid · Inspection · Apex landed', items:[
        {name:'Autopay ·9785',val:'$1,143',color:C.ap},{name:'Above the Norm ·4510',val:'~$0 (Stearns Jun 19)',color:C.atn},{name:'Spending ·1712',val:'~$738',color:C.sp},{name:'Child Support ·9893',val:'$890',color:C.cs},
        {name:'Personal Savings ·4685',val:'$0',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$13,463',total:true}
      ], note:'ATN near $0 — normal. Stearns Jun 19 fully covers it. Jun 28 Citi $0 reports → score update.'} },
      { label: 'Jun 19–22 · Stearns paycheck · Dani car · Bills · Groceries', events: [
        {id:'ev12', date:'Jun 19 Fri', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending immediately.', amt:'+$1,650', amtCls:'inc'},
        {id:'ev13', date:'Jun 19 Fri', color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Mid-month discretionary fund.', amt:'$723', amtCls:'trn'},
        {id:'ev14', date:'Jun 19 Fri', color:C.atn, type:'', name:'Auto Loan — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$750', amt:'-$750', amtCls:'exp'},
        {id:'ev15', date:'Jun 19 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'CS back above $1,000 floor ✓', amt:'+~$200', amtCls:'inc'},
        {id:'ev16', date:'Jun 19 Fri', color:C.sp, type:'', name:'Wash N Tan', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$60', amt:'-$60', amtCls:'exp'},
        {id:'ev17', date:'Jun 20 Sat', color:C.sp, type:'', name:'Groceries run 1', tag:'Spending', tagCls:'tagSp', sub:'~$200. Spending ~$1,200 after transfers. Comfortable.', amt:'~$200', amtCls:'exp'},
        {id:'ev18', date:'Jun 20 Sat', color:C.sp, type:'', name:'Fuel fill 1', tag:'Spending', tagCls:'tagSp', sub:'~$75. Good window.', amt:'~$75', amtCls:'exp'},
        {id:'ev19', date:'Jun 20 Sat', color:C.atn, type:'', name:'Electricity + Student Loan + Amazon Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339. Pay manually.', amt:'-$339', amtCls:'exp'},
        {id:'ev20', date:'Jun 22 Mon', color:C.atn, type:'', name:'Internet — Spectrum', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$65', amt:'-$65', amtCls:'exp'},
      ]},
      { bal: {label:'After Jun 19–22 · Stearns landed · Car loan · Bills · Groceries', items:[
        {name:'Autopay ·9785',val:'$1,143',color:C.ap},{name:'Above the Norm ·4510',val:'~$400',color:C.atn},{name:'Spending ·1712',val:'~$1,126',color:C.sp},{name:'Child Support ·9893',val:'$1,090 ✓',color:C.cs},
        {name:'Personal Savings ·4685',val:'$0',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$14,491',total:true}
      ], note:'CS back above $1,000 floor. Spending comfortable.'} },
      { label: 'Jun 23–28 · AppleCare · CS · Shopping · Score update', events: [
        {id:'ev22', date:'Jun 26 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev23', date:'Jun 26 Fri', color:C.cs, type:'', name:'Kids groceries / expenses from CS', tag:'Child Support', tagCls:'tagCs', sub:'Child-related spending. ~$100-150.', amt:'~$100-150', amtCls:'exp'},
        {id:'ev24', date:'Jun 26 Fri', color:C.sp, type:'', name:'Shopping window', tag:'Spending', tagCls:'tagSp', sub:'~$150 misc. Balance ~$700. Safe to spend.', amt:'~$150', amtCls:'exp'},
        {id:'ev26', date:'Jun 25 Thu', color:C.ap, type:'', name:'AppleCare', tag:'Autopay', tagCls:'tagAp', sub:'Auto-charge ~$15', amt:'-$15', amtCls:'exp'},
        {id:'ev30', date:'Jun 27 Sat', color:C.sp, type:'', name:'Railway', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
        {id:'ev31', date:'Jun 27 Sat', color:C.sp, type:'', name:'Groceries run 2', tag:'Spending', tagCls:'tagSp', sub:'~$200. Balance ~$500. Fine.', amt:'~$200', amtCls:'exp'},
        {id:'ev32', date:'Jun 28 Sun', color:C.hse, type:'mile', name:'Citi statement closes — $0 reports', tag:'SCORE UPDATE', tagCls:'tagScore', sub:'FICO 2 update incoming. Expect +50–80 pts by Jul 1–10. Do NOT apply for mortgage before this.', amt:'↑ FICO 2', amtCls:'inc'},
      ]},
      { bal: {label:'After Jun 23–28 · All bills paid · Citi $0 reports to Experian', items:[
        {name:'Autopay ·9785',val:'$1,128',color:C.ap},{name:'Above the Norm ·4510',val:'~$0 (all bills cleared)',color:C.atn},{name:'Spending ·1712',val:'~$771',color:C.sp},{name:'Child Support ·9893',val:'$1,165',color:C.cs},
        {name:'Personal Savings ·4685',val:'$0',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$14,796',total:true}
      ], note:'Jun 28: Citi statement closes at $0. FICO 2 update expected Jul 1–10. DO NOT apply before then.'} },
      { label: 'Jun 30 · Second Apex · Stearns · CS · June bills', events: [
        {id:'ev21', date:'Jun 30 Tue', color:C.atn, type:'', name:'Auto Insurance — Progressive', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$300. Shop for home+auto bundle after closing.', amt:'-$300', amtCls:'exp'},
        {id:'ev25', date:'Jun 30 Tue', color:C.atn, type:'', name:'Yost & Baill', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$100', amt:'-$100', amtCls:'exp'},
        {id:'ev35', date:'Jun 30 Tue', color:C.atn, type:'', name:'Spotify', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$25', amt:'-$25', amtCls:'exp'},
        {id:'ev27', date:'Jun 30 Tue', color:C.atn, type:'', name:'Cell Phone — Verizon', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$350. Shopping for better plan.', amt:'-$350', amtCls:'exp'},
        {id:'ev28', date:'Jun 30 Tue', color:C.atn, type:'', name:'Blink cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev29', date:'Jun 30 Tue', color:C.atn, type:'', name:'PayPal charges', tag:'Above the Norm', tagCls:'tagAtn', sub:'~$42 total. Verify all charges.', amt:'-$42', amtCls:'exp'},
        {id:'ev33', date:'Jun 30 Tue', color:C.atn, type:'', name:'Ring Cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev34', date:'Jun 30 Tue', color:C.atn, type:'', name:'Plaid', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$6', amt:'-$6', amtCls:'exp'},
        {id:'ev36', date:'Jun 30 Tue', color:C.ap, type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'tagAp', sub:'Second Apex of month.', amt:'+$2,300', amtCls:'inc'},
        {id:'ev37', date:'Jun 30 Tue', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Stearns biweekly.', amt:'+$1,650', amtCls:'inc'},
        {id:'ev38', date:'Jun 30 Tue', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev39', date:'Jun 30 Tue', color:C.atn, type:'', name:'Blink Fitness', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'orig_jun30', date:'Jun 30 Tue', color:C.sp, type:'', name:'Origin Financial', tag:'Spending', tagCls:'tagSp', sub:'June only: pay from Spending (psav is $0). Returns to Personal Savings from Jul 8 onward. ~$33', amt:'-$33', amtCls:'exp'},
        {id:'ev41', date:'Jun 30 Tue', color:C.sp, type:'', name:'Fuel fill 2', tag:'Spending', tagCls:'tagSp', sub:'~$75. Paychecks landed — good window.', amt:'~$75', amtCls:'exp'},
        {id:'ev42', date:'Jun 30 Tue', color:C.atn, type:'', name:'Transfer $723 → Spending for July', tag:'Spending', tagCls:'tagSp', sub:'Fund July discretionary from ATN surplus.', amt:'$723', amtCls:'trn'},
      ]},
      { bal: {label:'June 30 END · Second Apex + Stearns · July funded', items:[
        {name:'Autopay ·9785',val:'$3,428',color:C.ap},{name:'Above the Norm ·4510',val:'~$1,541',color:C.atn},{name:'Spending ·1712',val:'~$1,419',color:C.sp},{name:'Child Support ·9893',val:'$1,365',color:C.cs},
        {name:'Personal Savings ·4685',val:'$0',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$19,485',total:true}
      ], note:'Strong finish. Jul 1 application ready. Rate lock coming. Savings intact.'} },
    ],
  },
  // ══════════════════════════════════════════════════════
  // JULY
  // ══════════════════════════════════════════════════════
  {
    id: 'jul', name: 'July 2026',
    income: '~$13,350 (2 Apex + bonus + 2 Stearns + CS)',
    note: 'RENTAL PERIOD · Submit application Jul 1 · 401k withdrawal ~Jul 10 · Bonus Jul 31 → savings · Last Stearns before closing',
    phase: 'pre', phaseTxt: 'Submit application Jul 1 after FICO 2 updates. Get exact cash to close from lender — pull 401k only for the gap ($13,269 in savings first). Bonus $2,800 all to savings rebuild. Last rent Aug 1.',
    surplus: 'July surplus incl. $2,800 bonus · Closing funds staged', surplusVal: '~$3,500+ · 401k + savings cover closing · Bonus to savings',
    sstrip: [{l:'Personal Savings ·4685',v:'~$1,629 (rebuilt $700)'},{l:'Stearns ·1244',v:'~$5,100'},{l:'Stearns ·3046 / ·4182',v:'~$1,832 (rebuilt $700 + ·4182 recovered)'},{l:'Liberty Savings',v:'~$6,600 (rebuilt $700)'}],
    footer: [{acct:'atn',bal:'~$1,500 est.'},{acct:'ap',bal:'~$2,000 est.'},{acct:'sp',bal:'~$400 est.'},{acct:'cs',bal:'~$1,200 est.'}],
    weeks: [
      { label: 'Jul 1–4 · Submit application · Rent · Returns · Stearns · Groceries', events: [
        {id:'buf_jul1a', date:'Jul 1 Wed', color:C.sv, type:'', name:'Return $1,000 → Stearns ·1244', tag:'Above the Norm', tagCls:'tagAtn', sub:'Return June 14 pre-fund loan. s1244 back to $5,100 ✓', amt:'$1,000 returned', amtCls:'trn'},
        {id:'buf_jul1b', date:'Jul 1 Wed', color:C.ap, type:'', name:'Return $1,000 → Autopay', tag:'Autopay', tagCls:'tagAp', sub:'Return June 15 Autopay seed. Autopay replenished.', amt:'$1,000 returned', amtCls:'trn'},
        {id:'buf_jul1c', date:'Jul 1 Wed', color:C.ap, type:'sev', name:'$1,000 buffer: Autopay → ATN', tag:'Above the Norm', tagCls:'tagAtn', sub:'July regular monthly buffer. Keeps ATN positive all month. Returned end of July.', amt:'$1,000', amtCls:'trn'},
        {id:'ev43', date:'Jul 1 Wed', color:C.hse, type:'mile', name:'Submit formal mortgage application', tag:'KEY DATE', tagCls:'tagScore', sub:'FICO 2 updated. Lock rate ~6%. Ask lender: re-quote without points buydown at 700+ score. Get exact cash to close before pulling 401k.', amt:'action', amtCls:'inc'},
        {id:'ev44', date:'Jul 1 Wed', color:C.ap, type:'', name:'Rent — second to last payment', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. $1,910. Final rent Aug 1.', amt:'-$1,910', amtCls:'exp'},
        {id:'ev45', date:'Jul 1 Wed', color:C.sp, type:'', name:'Neon Tech', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$3.76', amt:'-$3.76', amtCls:'exp'},
        {id:'ev46', date:'Jul 1 Wed', color:C.ap, type:'', name:'Trash', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$12 (rental period)', amt:'-$12', amtCls:'exp'},
        {id:'ev47', date:'Jul 2 Thu', color:C.atn, type:'', name:'Amazon — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$16', amt:'-$16', amtCls:'exp'},
        {id:'ev48', date:'Jul 2 Thu', color:C.sp, type:'', name:'Self Financial', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$6.95', amt:'-$6.95', amtCls:'exp'},
        {id:'ev49', date:'Jul 3 Fri', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending immediately.', amt:'+$1,650', amtCls:'inc'},
        {id:'ev50', date:'Jul 3 Fri', color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Fund first half of July discretionary.', amt:'$723', amtCls:'trn'},
        {id:'ev51', date:'Jul 3 Fri', color:C.atn, type:'', name:'SimpleFin Bridge', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$1.50', amt:'-$1.50', amtCls:'exp'},
        {id:'ev52', date:'Jul 3 Fri', color:C.ap, type:'', name:"Renter's Insurance — State Farm", tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$85. LAST FEW MONTHS — cancel after closing.', amt:'-$85', amtCls:'exp'},
        {id:'ev53', date:'Jul 3 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev54', date:'Jul 4 Sat', color:C.sp, type:'', name:'Groceries run 1', tag:'Spending', tagCls:'tagSp', sub:'~$250. Spending ~$1,400 after transfer. Great window.', amt:'~$250', amtCls:'exp'},
        {id:'ev55', date:'Jul 4 Sat', color:C.sp, type:'', name:'Fuel fill 1', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
        {id:'ev56', date:'Jul 4 Sat', color:C.ap, type:'', name:'Lead Bank Self Lend', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$32', amt:'-$32', amtCls:'exp'},
        {id:'ev57', date:'Jul 4 Sat', color:C.sp, type:'', name:'Google One', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$2.49', amt:'-$2.49', amtCls:'exp'},
        {id:'ev58', date:'Jul 5 Sun', color:C.atn, type:'', name:'Cell Phone — Verizon', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$350.', amt:'-$350', amtCls:'exp'},
        {id:'ev59', date:'Jul 6 Mon', color:C.sp, type:'', name:'Wash N Tan', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$60', amt:'-$60', amtCls:'exp'},
      ]},
      { bal: {label:'After Jul 1–6 · Rent paid · App submitted · Stearns · Groceries', items:[
        {name:'Autopay ·9785',val:'$1,389',color:C.ap},{name:'Above the Norm ·4510',val:'~$500',color:C.atn},{name:'Spending ·1712',val:'~$1,744',color:C.sp},{name:'Child Support ·9893',val:'$1,565',color:C.cs},
        {name:'Personal Savings ·4685',val:'$0',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$16,930',total:true}
      ], note:'Rent paid for the last time next month (Aug 1). Application in. Waiting for rate lock.'} },
      { label: 'Jul 7–14 · Insurance · 401k withdrawal · PayPal · Shopping', events: [
        {id:'orig_jul8', date:'Jul 8 Wed', color:C.sp, type:'', name:'Origin Financial', tag:'Spending', tagCls:'tagSp', sub:'July only: pay from Spending while psav is still recovering. From Aug 8 onward returns to Personal Savings. ~$33', amt:'-$33', amtCls:'exp'},
        {id:'ev61', date:'Jul 9 Thu', color:C.atn, type:'', name:'Auto Insurance — Progressive', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$300.', amt:'-$300', amtCls:'exp'},
        {id:'ev62', date:'Jul 9 Thu', color:C.atn, type:'', name:'Plaid', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$6', amt:'-$6', amtCls:'exp'},
        {id:'ev63', date:'Jul 10 Fri', color:C.atn, type:'', name:'Spotify', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$25', amt:'-$25', amtCls:'exp'},
        {id:'ev64', date:'Jul 10 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev65', date:'Jul 10 Fri', color:C.cs, type:'', name:'Kids groceries / expenses from CS', tag:'Child Support', tagCls:'tagCs', sub:'Child-related spending from CS.', amt:'~$100-150', amtCls:'exp'},
        {id:'ev66', date:'Jul 10 Fri', color:C.ap, type:'mile', name:'Initiate 401k withdrawal', tag:'ACTION', tagCls:'tagScore', sub:'Only after lender confirms exact cash to close. Savings cover $13,269 — pull only the gap. Best case: ~$5,955 gross → net ~$3,731. Arrives 3–5 business days.', amt:'+net ~$3,731', amtCls:'inc'},
        {id:'ev67', date:'Jul 11 Sat', color:C.atn, type:'', name:'PayPal charges', tag:'Above the Norm', tagCls:'tagAtn', sub:'~$42 total. Verify all charges.', amt:'-$42', amtCls:'exp'},
        {id:'ev68', date:'Jul 11 Sat', color:C.sp, type:'', name:'Shopping window', tag:'Spending', tagCls:'tagSp', sub:'~$150 misc. Balance ~$900. Good window.', amt:'~$150', amtCls:'exp'},
        {id:'ev69', date:'Jul 13 Mon', color:C.sp, type:'', name:'Anthropic', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$20', amt:'-$20', amtCls:'exp'},
      ]},
      { bal: {label:'After Jul 7–14 · 401k net arrived · Closing fund ready', items:[
        {name:'Autopay ·9785',val:'$1,389',color:C.ap},{name:'Above the Norm ·4510',val:'~$200',color:C.atn},{name:'Spending ·1712',val:'~$1,574',color:C.sp},{name:'Child Support ·9893',val:'$1,640',color:C.cs},
        {name:'Personal Savings ·4685',val:'$3,665 (401k landed)',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$20,200',total:true}
      ], note:'401k net ~$3,731 staged in Personal Savings. Total closing fund: ~$20,200. Ready to wire Aug 14.'} },
      { label: 'Jul 15–22 · Apex paycheck · Yost · Stearns · Auto loans · Bills', events: [
        {id:'ev70', date:'Jul 15 Wed', color:C.ap, type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'tagAp', amt:'+$2,300', amtCls:'inc'},
        {id:'ev71', date:'Jul 15 Wed', color:C.ap, type:'', name:'Yost & Baill', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$100', amt:'-$100', amtCls:'exp'},
        {id:'ev72', date:'Jul 15 Wed', color:C.atn, type:'', name:'Cricut', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$11', amt:'-$11', amtCls:'exp'},
        {id:'ev73', date:'Jul 16 Thu', color:C.ap, type:'', name:'Fidelity Roth IRA', tag:'Autopay', tagCls:'tagAp', sub:'Confirm $325 transfer. Retirement contribution.', amt:'-$325', amtCls:'exp'},
        {id:'ev74', date:'Jul 17 Fri', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending immediately.', amt:'+$1,650', amtCls:'inc'},
        {id:'ev75', date:'Jul 17 Fri', color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Fund second half of July.', amt:'$723', amtCls:'trn'},
        {id:'ev76', date:'Jul 17 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev77', date:'Jul 17 Fri', color:C.sp, type:'', name:'Google Play', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
        {id:'ev78', date:'Jul 18 Sat', color:C.sp, type:'', name:'Groceries run 2', tag:'Spending', tagCls:'tagSp', sub:'~$200. Spending ~$1,100 after transfer.', amt:'~$200', amtCls:'exp'},
        {id:'ev79', date:'Jul 18 Sat', color:C.sp, type:'', name:'Fuel fill 2', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
        {id:'ev80', date:'Jul 18 Sat', color:C.ap, type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$725', amt:'-$725', amtCls:'exp'},
        {id:'ev81', date:'Jul 19 Sun', color:C.atn, type:'', name:'Auto Loan — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$750', amt:'-$750', amtCls:'exp'},
        {id:'ev82', date:'Jul 20 Mon', color:C.atn, type:'', name:'Electricity + Student Loan + Amazon Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339. Pay manually.', amt:'-$339', amtCls:'exp'},
        {id:'ev83', date:'Jul 22 Wed', color:C.atn, type:'', name:'Internet — Spectrum', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$65', amt:'-$65', amtCls:'exp'},
      ]},
      { bal: {label:'After Jul 15–22 · Apex + Stearns · Auto loans · Bills · Groceries', items:[
        {name:'Autopay ·9785',val:'$2,539',color:C.ap},{name:'Above the Norm ·4510',val:'~$400',color:C.atn},{name:'Spending ·1712',val:'~$2,017',color:C.sp},{name:'Child Support ·9893',val:'$1,840',color:C.cs},
        {name:'Personal Savings ·4685',val:'$3,665',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$440 / $292',color:C.sv},{name:'Liberty Savings',val:'$5,900',color:C.sv},
        {name:'Liquid total',val:'~$22,193',total:true}
      ], note:'All July bills current. Closing fund untouched. On track.'} },
      { label: 'Jul 23–31 · CS · AppleCare · Pets · Apex + BONUS · Stearns · Save', events: [
        {id:'ev84', date:'Jul 24 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev85', date:'Jul 24 Fri', color:C.cs, type:'', name:'Kids expenses from CS', tag:'Child Support', tagCls:'tagCs', sub:'Child-related spending.', amt:'~$100-150', amtCls:'exp'},
        {id:'ev86', date:'Jul 25 Sat', color:C.ap, type:'', name:'AppleCare', tag:'Autopay', tagCls:'tagAp', sub:'Auto-charge ~$15', amt:'-$15', amtCls:'exp'},
        {id:'ev87', date:'Jul 25 Sat', color:C.sp, type:'', name:'Pets', tag:'Spending', tagCls:'tagSp', sub:'~$125. Balance ~$700. Good window.', amt:'~$125', amtCls:'exp'},
        {id:'ev88', date:'Jul 26 Sun', color:C.atn, type:'', name:'Blink cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev89', date:'Jul 27 Mon', color:C.sp, type:'', name:'Railway', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
        {id:'ev90', date:'Jul 27 Mon', color:C.sp, type:'', name:'Shopping window 2', tag:'Spending', tagCls:'tagSp', sub:'~$150 misc. Balance ~$600. Fine.', amt:'~$150', amtCls:'exp'},
        {id:'ev91', date:'Jul 28 Tue', color:C.atn, type:'', name:'Blink Fitness', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev92', date:'Jul 29 Wed', color:C.atn, type:'', name:'Ring Cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev93', date:'Jul 31 Fri', color:C.ap, type:'bev', name:'Apex paycheck + BONUS', tag:'BONUS MONTH', tagCls:'tagBon', sub:'Regular $2,300 + bonus $2,800 = $5,100 in Autopay today.', amt:'+$5,100', amtCls:'bon'},
        {id:'ev94', date:'Jul 31 Fri', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev95', date:'Jul 31 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev96', date:'Jul 31 Fri', color:C.sp, type:'', name:'Groceries run 3', tag:'Spending', tagCls:'tagSp', sub:'~$200. Last July grocery run.', amt:'~$200', amtCls:'exp'},
        {id:'ev97', date:'Jul 31 Fri', color:C.sp, type:'', name:'Fuel fill 3', tag:'Spending', tagCls:'tagSp', sub:'~$75. Top off before August.', amt:'~$75', amtCls:'exp'},
        {id:'ev98', date:'Jul 31 Fri', color:C.atn, type:'', name:'Transfer $723 → Spending for August', tag:'Spending', tagCls:'tagSp', sub:'Fund early August discretionary.', amt:'$723', amtCls:'trn'},
        {id:'buf_jul31', date:'Aug 1 Sat', color:C.ap, type:'', name:'Return $1,000 buffer → Autopay', tag:'Autopay', tagCls:'tagAp', sub:'Return July ATN buffer on Aug 1. Bonus transfers complete, ATN fully settled.', amt:'$1,000 returned', amtCls:'trn'},
        {id:'ev99', date:'Jul 31 Fri', color:C.ap, type:'sev', name:'BONUS $2,800 → savings rebuild', tag:'SAVE', tagCls:'tagSave', sub:'Split: Stearns ·4182 $700 + ·3046 $700 + Personal Savings $700 + Liberty $700. Biggest single savings move of the year.', amt:'+$2,800 → SAVE', amtCls:'sav'},
      ]},
      { bal: {label:'July 31 END · Bonus $2,800 split to savings · August funded', items:[
        {name:'Autopay ·9785',val:'$4,824',color:C.ap},{name:'Above the Norm ·4510',val:'~$1,581',color:C.atn},{name:'Spending ·1712',val:'~$2,185',color:C.sp},{name:'Child Support ·9893',val:'$2,115',color:C.cs},
        {name:'Personal Savings ·4685',val:'$4,365',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$1,140 / $992',color:C.sv},{name:'Liberty Savings',val:'$6,600',color:C.sv},
        {name:'Liquid total',val:'~$28,902',total:true}
      ], note:'Bonus deployed to 4 savings accounts. Total liquid highest of the year. Closing Aug 14 fully funded.'} },
    ],
  },
  // ══════════════════════════════════════════════════════
  // AUGUST
  // ══════════════════════════════════════════════════════
  {
    id: 'aug', name: 'August 2026',
    income: '~$8,700 (2 Apex + 2 Stearns + CS)',
    note: "RENTAL → CLOSING · Last rent Aug 1 · List Dani's house ~Aug 1 · Close ~Aug 14 · First mortgage Sep 1",
    phase: 'closing', phaseTxt: "Last rent Aug 1 — never again. List Dani's house ~Aug 1. Close on new home ~Aug 14. Cancel renter's insurance same day. Mortgage autopay set up. First mortgage payment Sep 1.",
    mbar: "Closed ~Aug 14. Keys in hand. Renter's insurance cancelled. Mortgage set up. First payment Sep 1.",
    surplus: 'August — closing month · Savings depleted to fund closing', surplusVal: 'Rebuild starts Sep 1 with ~$1,179/mo surplus',
    sstrip: [{l:'Personal Savings ·4685',v:'~$200 (used for closing)'},{l:'Stearns ·1244',v:'~$200 (used for closing)'},{l:'Stearns ·3046 / ·4182',v:'~$100 (used for closing)'},{l:'Liberty Savings',v:'~$900 (used for closing)'}],
    footer: [{acct:'atn',bal:'~$1,200 est.'},{acct:'ap',bal:'~$400 est.'},{acct:'sp',bal:'~$600 est.'},{acct:'cs',bal:'~$1,200 est.'}],
    weeks: [
      { label: "Aug 1–7 · LAST rent · Early bills · Groceries · List Dani's house", events: [
        {id:'buf_aug1', date:'Aug 1 Sat', color:C.ap, type:'sev', name:'$1,000 buffer: Autopay → ATN', tag:'Above the Norm', tagCls:'tagAtn', sub:'Monthly ATN buffer. Do this FIRST on Aug 1 before paying bills. Returned end of August.', amt:'$1,000', amtCls:'trn'},
        {id:'ev100', date:'Aug 1 Sat', color:C.ap, type:'', name:'Rent — FINAL PAYMENT EVER', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. $1,910. Next housing payment is mortgage Sep 1.', amt:'-$1,910', amtCls:'exp'},
        {id:'ev101', date:'Aug 1 Sat', color:C.sp, type:'', name:'Neon Tech', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$3.76', amt:'-$3.76', amtCls:'exp'},
        {id:'ev102', date:'Aug 1 Sat', color:C.atn, type:'', name:'Amazon — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$16', amt:'-$16', amtCls:'exp'},
        {id:'ev103', date:'~Aug 1', color:C.act, type:'today', name:"List Dani's house for sale", tag:'ACTION', tagCls:'tagAct', sub:'Target list date. Expected close late October. Net ~$50k proceeds. Separate from operating budget — goes to furnishings + optional principal payment.', amt:'action', amtCls:'trn'},
        {id:'ev104', date:'Aug 2 Sun', color:C.sp, type:'', name:'Self Financial', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$6.95', amt:'-$6.95', amtCls:'exp'},
        {id:'ev105', date:'Aug 3 Mon', color:C.ap, type:'', name:"Renter's Insurance — FINAL payment", tag:'Autopay', tagCls:'tagAp', sub:"Pay manually ~$85. CANCEL after closing ~Aug 14.", amt:'-$85', amtCls:'exp'},
        {id:'ev106', date:'Aug 3 Mon', color:C.atn, type:'', name:'SimpleFin Bridge', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$1.50', amt:'-$1.50', amtCls:'exp'},
        {id:'ev107', date:'Aug 4 Tue', color:C.ap, type:'', name:'Lead Bank Self Lend', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$32', amt:'-$32', amtCls:'exp'},
        {id:'ev108', date:'Aug 4 Tue', color:C.sp, type:'', name:'Google One', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$2.49', amt:'-$2.49', amtCls:'exp'},
        {id:'ev109', date:'Aug 5 Wed', color:C.atn, type:'', name:'Cell Phone — Verizon', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$350.', amt:'-$350', amtCls:'exp'},
        {id:'ev110', date:'Aug 6 Thu', color:C.sp, type:'', name:'Wash N Tan', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$60', amt:'-$60', amtCls:'exp'},
        {id:'ev111', date:'Aug 6 Thu', color:C.sp, type:'', name:'Groceries run 1', tag:'Spending', tagCls:'tagSp', sub:'~$250. Spending ~$1,000 from Jul 31 transfer. Comfortable.', amt:'~$250', amtCls:'exp'},
        {id:'ev112', date:'Aug 6 Thu', color:C.sp, type:'', name:'Fuel fill 1', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
        {id:'ev113', date:'Aug 7 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev114', date:'Aug 7 Fri', color:C.cs, type:'', name:'Kids expenses from CS', tag:'Child Support', tagCls:'tagCs', sub:'Child-related spending.', amt:'~$100-150', amtCls:'exp'},
      ]},
      { bal: {label:"After Aug 1–7 · LAST RENT PAID · Dani's house listed", items:[
        {name:'Autopay ·9785',val:'$2,797',color:C.ap},{name:'Above the Norm ·4510',val:'~$900',color:C.atn},{name:'Spending ·1712',val:'~$1,787',color:C.sp},{name:'Child Support ·9893',val:'$2,190',color:C.cs},
        {name:'Personal Savings ·4685',val:'$4,332',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$1,140 / $992',color:C.sv},{name:'Liberty Savings',val:'$6,600',color:C.sv},
        {name:'Liquid total',val:'~$25,838',total:true}
      ], note:"Rent: never again. Renter's insurance: paid for last time Aug 3. Dani's house listed ~Aug 1."} },
      { label: 'Aug 8–13 · Insurance · PayPal · Shopping · Confirm wire', events: [
        {id:'ev115', date:'Aug 8 Sat', color:C.ps, type:'', name:'Origin Financial', tag:'Personal Savings', tagCls:'tagPs', sub:'Auto-charge ~$33 from Personal Savings.', amt:'-$33', amtCls:'exp'},
        {id:'ev116', date:'Aug 9 Sun', color:C.atn, type:'', name:'Auto Insurance — Progressive', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$300.', amt:'-$300', amtCls:'exp'},
        {id:'ev117', date:'Aug 9 Sun', color:C.atn, type:'', name:'Plaid', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$6', amt:'-$6', amtCls:'exp'},
        {id:'ev118', date:'Aug 10 Mon', color:C.atn, type:'', name:'Spotify', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$25', amt:'-$25', amtCls:'exp'},
        {id:'ev119', date:'Aug 11 Tue', color:C.atn, type:'', name:'PayPal charges', tag:'Above the Norm', tagCls:'tagAtn', sub:'~$42 total. Verify.', amt:'-$42', amtCls:'exp'},
        {id:'ev120', date:'Aug 11 Tue', color:C.sp, type:'', name:'Shopping window', tag:'Spending', tagCls:'tagSp', sub:'~$150 misc. Balance ~$450. OK.', amt:'~$150', amtCls:'exp'},
        {id:'ev121', date:'Aug 13 Thu', color:C.sp, type:'', name:'Anthropic', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$20', amt:'-$20', amtCls:'exp'},
        {id:'ev122', date:'~Aug 13', color:C.hse, type:'mile', name:'Confirm exact cash to close with lender', tag:'ACTION', tagCls:'tagScore', sub:'Verify final wire amount before closing day. Confirm all savings transfers are settled. 401k funds should have arrived.', amt:'confirm', amtCls:'trn'},
      ]},
      { bal: {label:'After Aug 8–13 · All pre-closing bills current · Confirm wire today', items:[
        {name:'Autopay ·9785',val:'$2,797',color:C.ap},{name:'Above the Norm ·4510',val:'~$527',color:C.atn},{name:'Spending ·1712',val:'~$1,617',color:C.sp},{name:'Child Support ·9893',val:'$2,190',color:C.cs},
        {name:'Personal Savings ·4685',val:'$4,332',color:C.sv},{name:'Stearns ·1244',val:'$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$1,140 / $992',color:C.sv},{name:'Liberty Savings',val:'$6,600',color:C.sv},
        {name:'Liquid total',val:'~$25,295',total:true}
      ], note:'Confirm exact cash-to-close with lender today. Wire from: Liberty $6,600 + Stearns ·1244 $5,100 + remainder from ·3046/·4182/psav. Closing tomorrow.'} },
      { label: "~Aug 14 · CLOSING DAY · Both paychecks · Cancel renter's ins", events: [
        {id:'ev123', date:'~Aug 14 Fri', color:C.hse, type:'hev', name:'CLOSING DAY — wire cash to close', tag:'CLOSING', tagCls:'tagHse', sub:"Wire from pooled savings ($13,269) + 401k net. Sign documents. GET KEYS. Set up mortgage autopay from Autopay account.", amt:'-~$17–20k', amtCls:'hse'},
        {id:'ev124', date:'Aug 14 Fri', color:C.ap, type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'tagAp', amt:'+$2,300', amtCls:'inc'},
        {id:'ev125', date:'Aug 14 Fri', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending.', amt:'+$1,650', amtCls:'inc'},
        {id:'ev126', date:'Aug 14 Fri', color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Fund mid-August discretionary.', amt:'$723', amtCls:'trn'},
        {id:'ev127', date:'Aug 14 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev128', date:'Aug 14 Fri', color:C.ap, type:'', name:"CANCEL renter's insurance — State Farm", tag:'ACTION', tagCls:'tagAct', sub:"Call to cancel immediately. Homeowner's insurance now baked into PITI. Saves ~$85/mo going forward.", amt:'CANCEL', amtCls:'trn'},
        {id:'ev129', date:'Aug 15 Sat', color:C.ap, type:'', name:'Yost & Baill', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$100', amt:'-$100', amtCls:'exp'},
        {id:'ev130', date:'Aug 15 Sat', color:C.atn, type:'', name:'Cricut', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$11', amt:'-$11', amtCls:'exp'},
        {id:'ev131', date:'Aug 16 Sun', color:C.ap, type:'', name:'Fidelity Roth IRA', tag:'Autopay', tagCls:'tagAp', sub:'Confirm $325 transfer.', amt:'-$325', amtCls:'exp'},
        {id:'ev132', date:'Aug 17 Mon', color:C.sp, type:'', name:'Groceries run 2', tag:'Spending', tagCls:'tagSp', sub:'~$200. Post-closing week — Spending ~$900. Comfortable.', amt:'~$200', amtCls:'exp'},
        {id:'ev133', date:'Aug 17 Mon', color:C.sp, type:'', name:'Google Play', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
        {id:'ev134', date:'Aug 18 Tue', color:C.ap, type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$725', amt:'-$725', amtCls:'exp'},
        {id:'ev135', date:'Aug 19 Wed', color:C.atn, type:'', name:'Auto Loan — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$750', amt:'-$750', amtCls:'exp'},
        {id:'ev136', date:'Aug 19 Wed', color:C.sp, type:'', name:'Fuel fill 2', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
        {id:'ev137', date:'Aug 20 Thu', color:C.atn, type:'', name:'Electricity + Student Loan + Amazon Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339.', amt:'-$339', amtCls:'exp'},
      ]},
      { bal: {label:'After Aug 14–20 · CLOSED · Keys in hand · Savings used for closing', items:[
        {name:'Autopay ·9785',val:'$4,032',color:C.ap},{name:'Above the Norm ·4510',val:'~$618',color:C.atn},{name:'Spending ·1712',val:'~$2,135',color:C.sp},{name:'Child Support ·9893',val:'$2,390',color:C.cs},
        {name:'Personal Savings ·4685',val:'$4,332',color:C.sv},{name:'Stearns ·1244',val:'~$0',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$1,140 / $992',color:C.sv},{name:'Liberty Savings',val:'~$0',color:C.sv},
        {name:'Liquid total',val:'~$15,639',total:true}
      ], note:"Closed! Liberty and ·1244 used for closing. Mortgage set up. Renter's insurance cancelled. First mortgage payment Sep 1."} },
      { label: 'Aug 21–31 · CS · Internet · Apex · Stearns · Savings rebuild', events: [
        {id:'buf_aug29', date:'Sep 1 Tue', color:C.ap, type:'', name:'Return $1,000 buffer → Autopay', tag:'Autopay', tagCls:'tagAp', sub:'Return August buffer on Sep 1 — gives ATN clean month end. Autopay is well-funded after Apex Aug 29.', amt:'$1,000 returned', amtCls:'trn'},
        {id:'ev138', date:'Aug 21 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev139', date:'Aug 21 Fri', color:C.cs, type:'', name:'Kids expenses from CS', tag:'Child Support', tagCls:'tagCs', sub:'Child-related spending.', amt:'~$100-150', amtCls:'exp'},
        {id:'ev140', date:'Aug 28 Fri', color:C.atn, type:'', name:'Internet — Spectrum', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$65', amt:'-$65', amtCls:'exp'},
        {id:'ev141', date:'Aug 22 Sat', color:C.sp, type:'', name:'Shopping window 2', tag:'Spending', tagCls:'tagSp', sub:'~$150 misc. New house — may need household items.', amt:'~$150', amtCls:'exp'},
        {id:'ev142', date:'Aug 25 Tue', color:C.ap, type:'', name:'AppleCare', tag:'Autopay', tagCls:'tagAp', sub:'Auto-charge ~$15', amt:'-$15', amtCls:'exp'},
        {id:'ev143', date:'Aug 25 Tue', color:C.sp, type:'', name:'Pets', tag:'Spending', tagCls:'tagSp', sub:'~$125.', amt:'~$125', amtCls:'exp'},
        {id:'ev144', date:'Aug 28 Fri', color:C.atn, type:'', name:'Blink cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev145', date:'Aug 27 Thu', color:C.sp, type:'', name:'Railway', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
        {id:'ev146', date:'Aug 28 Fri', color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending.', amt:'+$1,650', amtCls:'inc'},
        {id:'ev147', date:'Aug 28 Fri', color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Fund end of August and September start.', amt:'$723', amtCls:'trn'},
        {id:'ev148', date:'Aug 28 Fri', color:C.atn, type:'', name:'Blink Fitness', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev149', date:'Aug 28 Fri', color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
        {id:'ev150', date:'Aug 28 Fri', color:C.sp, type:'', name:'Groceries run 3', tag:'Spending', tagCls:'tagSp', sub:'~$200. Last August grocery run.', amt:'~$200', amtCls:'exp'},
        {id:'ev151', date:'Aug 29 Sat', color:C.sp, type:'', name:'Fuel fill 3', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
        {id:'ev152', date:'Aug 29 Sat', color:C.ap, type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'tagAp', amt:'+$2,300', amtCls:'inc'},
        {id:'ev153', date:'Aug 29 Sat', color:C.atn, type:'', name:'Ring Cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
        {id:'ev154', date:'Aug 31 Mon', color:C.ap, type:'sev', name:'Surplus → savings rebuild', tag:'SAVE', tagCls:'tagSave', sub:'~$412/mo surplus. Distribute to lowest accounts. No deadline — comfortable pace.', amt:'~$412 saved', amtCls:'sav'},
      ]},
      { bal: {label:'August 31 END · First home month done · Savings rebuild started', items:[
        {name:'Autopay ·9785',val:'$6,117',color:C.ap},{name:'Above the Norm ·4510',val:'~$1,394',color:C.atn},{name:'Spending ·1712',val:'~$2,303',color:C.sp},{name:'Child Support ·9893',val:'$2,665',color:C.cs},
        {name:'Personal Savings ·4685',val:'$4,632',color:C.sv},{name:'Stearns ·1244',val:'~$0',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'$1,140 / $992',color:C.sv},{name:'Liberty Savings',val:'~$0',color:C.sv},
        {name:'Liquid total',val:'~$19,243',total:true}
      ], note:'~$412 surplus saved this month. Comfortable start. No deadline on savings rebuild.'} },
    ],
  },
  // Sep, Oct, Nov, Dec use the same repeating pattern — build them as a factory
  ...([ 
    {
      id:'sep', name:'September 2026',
      income:'$8,975', note:'Apex $4,600 · Stearns $3,575 · CS $800 · NEW HOME · First mortgage · No rent',
      phase:'post', phaseTxt:'First full month as homeowners. Mortgage $3,000 replaces rent $1,910. Surplus ~$1,179/mo. Buffer $1,000 from Autopay on 1st. Savings rebuilding at comfortable pace.',
      surplus:"September surplus · First full mortgage month · No rent", surplusVal:"~$1,179/mo surplus · Savings rebuilding steadily",
      sstrip:[{l:'Personal Savings ·4685',v:'~$4,565'},{l:'Stearns ·1244',v:'~$5,100'},{l:'Stearns ·3046 / ·4182',v:'~$992 / $0'},{l:'Liberty Savings',v:'~$0'}],
      endBal:{label:'Sep end · All accounts settled', items:[
        {name:'Autopay ·9785',val:'~$6,238',color:C.ap},{name:'Above the Norm ·4510',val:'~$57',color:C.atn},{name:'Spending ·1712',val:'~$2,245',color:C.sp},{name:'Child Support ·9893',val:'~$3,165',color:C.cs},
        {name:'Personal Savings ·4685',val:'~$4,565',color:C.sv},{name:'Stearns ·1244',val:'~$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'~$992 / $0',color:C.sv},{name:'Liberty Savings',val:'~$0',color:C.sv},
        {name:'Liquid total',val:'~$22,362',total:true}
      ], note:'First full mortgage month complete. Savings growing. ATN running lean but positive — buffer doing its job.'},
      footer:[{acct:'atn',bal:'~$2,000 est.'},{acct:'ap',bal:'~$700 est.'},{acct:'sp',bal:'~$900 est.'},{acct:'cs',bal:'~$1,200 est.'}],
      pfx:'Sep',
    },
    {
      id:'oct', name:'October 2026',
      income:'~$11,500 (incl. $2,800 bonus)', note:"Apex $7,400 · Stearns $3,300 · CS $1,000 · BONUS · Dani's house sale closes",
      phase:'post', phaseTxt:"Bonus month. All $2,800 to savings. Dani's house closes ~late October — ~$50k to Liberty. Shop home+auto bundle insurance this month. Consider cell plan switch.",
      surplus:"October surplus incl. $2,800 bonus", surplusVal:"~$4,310 · Savings past halfway to $5k targets",
      sstrip:[{l:'Personal Savings ·4685',v:'~$5,366'},{l:'Stearns ·1244',v:'~$5,100'},{l:'Stearns ·3046 / ·4182',v:'~$1,400'},{l:'Liberty Savings',v:'~$51,400'}],
      endBal:{label:'Oct end · All accounts settled', items:[
        {name:'Autopay ·9785',val:'~$6,244',color:C.ap},{name:'Above the Norm ·4510',val:'~$246',color:C.atn},{name:'Spending ·1712',val:'~$2,263',color:C.sp},{name:'Child Support ·9893',val:'~$3,665',color:C.cs},
        {name:'Personal Savings ·4685',val:'~$5,366',color:C.sv},{name:'Stearns ·1244',val:'~$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'~$1,400',color:C.sv},{name:'Liberty Savings',val:'~$51,400',color:C.sv},
        {name:'Liquid total',val:'~$75,684',total:true}
      ], note:"Bonus $2,800 deployed to savings. Dani's house ~$50k in Liberty. Shop home+auto insurance bundle this month."},
      footer:[{acct:'atn',bal:'~$2,500 est.'},{acct:'ap',bal:'~$800 est.'},{acct:'sp',bal:'~$900 est.'},{acct:'cs',bal:'~$1,400 est.'}],
      pfx:'Oct',
      danisHouse: true,
      bonus: true,
      samsClubb: true,
    },
    {
      id:'nov', name:'November 2026',
      income:'$8,975', note:'Apex $4,600 · Stearns $3,575 · CS $800 · Steady · Savings building',
      phase:'post', phaseTxt:'Steady month. ~$1,179 surplus. Savings growing on comfortable pace. No deadline.',
      surplus:"November surplus · Savings building", surplusVal:"~$1,179 · All accounts healthy",
      sstrip:[{l:'Personal Savings ·4685',v:'~$5,599'},{l:'Stearns ·1244',v:'~$5,100'},{l:'Stearns ·3046 / ·4182',v:'~$1,400'},{l:'Liberty Savings',v:'~$51,400'}],
      endBal:{label:'Nov end · All accounts settled', items:[
        {name:'Autopay ·9785',val:'~$6,250',color:C.ap},{name:'Above the Norm ·4510',val:'~$434',color:C.atn},{name:'Spending ·1712',val:'~$2,281',color:C.sp},{name:'Child Support ·9893',val:'~$4,165',color:C.cs},
        {name:'Personal Savings ·4685',val:'~$5,599',color:C.sv},{name:'Stearns ·1244',val:'~$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'~$1,400',color:C.sv},{name:'Liberty Savings',val:'~$51,400',color:C.sv},
        {name:'Liquid total',val:'~$76,629',total:true}
      ], note:'Steady. All accounts healthy. Savings growing. ATN building up slowly — buffer working perfectly.'},
      footer:[{acct:'atn',bal:'~$2,200 est.'},{acct:'ap',bal:'~$700 est.'},{acct:'sp',bal:'~$900 est.'},{acct:'cs',bal:'~$1,400 est.'}],
      pfx:'Nov',
    },
    {
      id:'dec', name:'December 2026',
      income:'$8,975', note:'Apex $4,600 · Stearns $3,575 · CS $800 · Year end · Savings fully rebuilt',
      phase:'post', phaseTxt:'Final month of plan. Savings at target. $0 debt. Jan 2027 bonus finishes the job. Settled, stable, building.',
      mbar:'Year end — $0 card debt · New home settled · All savings targets hit or exceeded · January 2027 bonus adds another $2,800 · Plan complete ✓',
      surplus:'December year-end position', surplusVal:'Stable · Homeowners · $0 debt · Savings rebuilt · Jan 2027 bonus closes the loop ✓',
      sstrip:[{l:'Personal Savings ·4685',v:'~$5,766 ✓'},{l:'Stearns ·1244',v:'~$5,100'},{l:'Stearns ·3046 / ·4182',v:'~$1,400'},{l:'Liberty Savings',v:'~$51,400'}],
      endBal:{label:'Dec end · All accounts settled', items:[
        {name:'Autopay ·9785',val:'~$6,256',color:C.ap},{name:'Above the Norm ·4510',val:'~$634',color:C.atn},{name:'Spending ·1712',val:'~$2,299',color:C.sp},{name:'Child Support ·9893',val:'~$4,665',color:C.cs},
        {name:'Personal Savings ·4685',val:'~$5,766',color:C.sv},{name:'Stearns ·1244',val:'~$5,100',color:C.sv},{name:'Stearns ·3046 / ·4182',val:'~$1,400',color:C.sv},{name:'Liberty Savings',val:'~$51,400',color:C.sv},
        {name:'Liquid total',val:'~$77,520',total:true}
      ], note:'Year end. $0 card debt. New home settled. All savings targets hit or exceeded. January 2027 bonus adds another $2,800. Plan complete ✓'},
      footer:[{acct:'atn',bal:'~$2,500 est.'},{acct:'ap',bal:'~$800 est.'},{acct:'sp',bal:'~$900 est.'},{acct:'cs',bal:'~$1,400 est.'}],
      pfx:'Dec',
    },
  ].map(m => buildRepeatMonth(m))),
]

function buildRepeatMonth(m) {
  const p = m.pfx
  const isOct = m.id === 'oct'
  const isDec = m.id === 'dec'

  const stearns1Date = {Sep:'Sep 11 Fri',Oct:'Oct 9 Fri',Nov:'Nov 13 Fri',Dec:'Dec 11 Fri'}[p]
  const stearns2Date = {Sep:'Sep 25 Fri',Oct:'Oct 23 Fri',Nov:'Nov 27 Fri',Dec:'Dec 25 Fri'}[p]
  const apex1Date = {Sep:'Sep 15 Tue',Oct:'Oct 15 Thu',Nov:'Nov 14 Sat',Dec:'Dec 15 Tue'}[p]
  const apex2Date = {Sep:'Sep 30 Wed',Oct:'Oct 30 Fri',Nov:'Nov 30 Mon',Dec:'Dec 31 Thu'}[p]
  const autoMikeDate = {Sep:'Sep 18 Fri',Oct:'Oct 18 Sun',Nov:'Nov 18 Wed',Dec:'Dec 18 Fri'}[p]
  const autoDaniDate = {Sep:'Sep 19 Sat',Oct:'Oct 19 Mon',Nov:'Nov 19 Thu',Dec:'Dec 19 Sat'}[p]
  const inetDate = {Sep:'Sep 22 Tue',Oct:'Oct 22 Thu',Nov:'Nov 22 Sun',Dec:'Dec 22 Tue'}[p]

  const weeks = [
    { label: `${p} 1–10 · Mortgage · Buffer · Early bills`, events: [
      {id:`${p}_buf`, date:`${p} 1`, color:C.ap, type:'sev', name:'$1,000 buffer: Autopay → ATN', tag:'Above the Norm', tagCls:'tagAtn', sub:'Monthly ATN buffer. Do FIRST before any bills. Returned end of month.', amt:'$1,000', amtCls:'trn'},
      {id:`${p}_mort`, date:`${p} 1`, color:C.ap, type:'', name:'Mortgage', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. $3,000 PITI — taxes and insurance included.', amt:'-$3,000', amtCls:'exp'},
      {id:`${p}_neon`, date:`${p} 1`, color:C.sp, type:'', name:'Neon Tech', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$3.76', amt:'-$3.76', amtCls:'exp'},
      {id:`${p}_trash`, date:`${p} 1`, color:C.ap, type:'', name:'Trash', tag:'Autopay', tagCls:'tagAp', sub:'~$12 — verify exact date from bill', amt:'-$12', amtCls:'exp'},
      {id:`${p}_water`, date:`${p} 1`, color:C.ap, type:'', name:'Water & Sewer', tag:'Autopay', tagCls:'tagAp', sub:'~$100 — verify exact date from bill', amt:'-$100', amtCls:'exp'},
      {id:`${p}_gas`, date:`${p} 1`, color:C.ap, type:'', name:'Gas (heat)', tag:'Autopay', tagCls:'tagAp', sub:'~$100 avg — higher in winter, lower in summer. Verify from bill.', amt:'-$100', amtCls:'exp'},
      {id:`${p}_amazon`, date:`${p} 2`, color:C.atn, type:'', name:'Amazon — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$16', amt:'-$16', amtCls:'exp'},
      {id:`${p}_selfin`, date:`${p} 2`, color:C.sp, type:'', name:'Self Financial', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$6.95', amt:'-$6.95', amtCls:'exp'},
      {id:`${p}_simpfin`, date:`${p} 3`, color:C.atn, type:'', name:'SimpleFin Bridge', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$1.50', amt:'-$1.50', amtCls:'exp'},
      {id:`${p}_cell`, date:`${p} 5`, color:C.atn, type:'', name:'Cell Phone — Verizon', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$350. Switch to Mint/Visible after closing.', amt:'-$350', amtCls:'exp'},
      {id:`${p}_lead`, date:`${p} 4`, color:C.ap, type:'', name:'Lead Bank Self Lend', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$32', amt:'-$32', amtCls:'exp'},
      {id:`${p}_gone`, date:`${p} 4`, color:C.sp, type:'', name:'Google One', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$2.49', amt:'-$2.49', amtCls:'exp'},
      {id:`${p}_wash`, date:`${p} 6`, color:C.sp, type:'', name:'Wash N Tan', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$60', amt:'-$60', amtCls:'exp'},
      {id:`${p}_groc1`, date:`${p} 3 Thu`, color:C.sp, type:'', name:'Groceries run 1', tag:'Spending', tagCls:'tagSp', sub:`Good window — Spending funded from prev transfer.`, amt:'~$250', amtCls:'exp'},
      {id:`${p}_fuel1`, date:`${p} 7`, color:C.sp, type:'', name:'Fuel fill 1', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
      {id:`${p}_origin`, date:`${p} 8`, color:C.ps, type:'', name:'Origin Financial', tag:'Personal Savings', tagCls:'tagPs', sub:'Auto-charge ~$33 from Personal Savings.', amt:'-$33', amtCls:'exp'},
      {id:`${p}_autos`, date:`${p} 9`, color:C.atn, type:'', name:'Auto Insurance', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$300.', amt:'-$300', amtCls:'exp'},
      {id:`${p}_plaid`, date:`${p} 9`, color:C.atn, type:'', name:'Plaid', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$6', amt:'-$6', amtCls:'exp'},
      {id:`${p}_paypal`, date:`${p} 9–12`, color:C.atn, type:'', name:'PayPal charges', tag:'Above the Norm', tagCls:'tagAtn', sub:'Multiple charges. ~$42 total. Verify each one.', amt:'-$42', amtCls:'exp'},
      {id:`${p}_spotify`, date:`${p} 10`, color:C.atn, type:'', name:'Spotify', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$25', amt:'-$25', amtCls:'exp'},
      {id:`${p}_cs0`, date:`${p} 4 Fri`, color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
      ...(isOct ? [{id:'oct_sams', date:'Oct', color:C.sp, type:'', name:"Sam's Club membership renewal", tag:'Spending', tagCls:'tagSp', sub:'Annual fee ~$65. Cheaper per-unit than standard grocery stores at your spend level. Worth keeping.', amt:'-$65', amtCls:'exp'}] : []),
    ]},
    { label: `${stearns1Date} · Stearns paycheck · Transfer to Spending`, events: [
      {id:`${p}_st1`, date:stearns1Date, color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending immediately.', amt:'+$1,650', amtCls:'inc'},
      {id:`${p}_xf1`, date:stearns1Date, color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Stearns check. Fund mid-month discretionary.', amt:'$723', amtCls:'trn'},
      {id:`${p}_cs1`, date:stearns1Date, color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
      {id:`${p}_cs1k`, date:stearns1Date, color:C.cs, type:'', name:'Kids expenses from CS', tag:'Child Support', tagCls:'tagCs', sub:'Child-related groceries and activities. ~$100-150.', amt:'~$100-150', amtCls:'exp'},
      {id:`${p}_anth`, date:`${p} 13`, color:C.sp, type:'', name:'Anthropic', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$20', amt:'-$20', amtCls:'exp'},
      {id:`${p}_shop1`, date:`${p} 14`, color:C.sp, type:'', name:'Shopping window — $150', tag:'Spending', tagCls:'tagSp', sub:'Balance ~$900 after Stearns transfer. Best window of month.', amt:'~$150', amtCls:'exp'},
    ]},
    { label: `${apex1Date} · Apex paycheck · Auto loans · Bills · Groceries`, events: [
      {id:`${p}_apex1`, date:apex1Date, color:C.ap, type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'tagAp', amt:'+$2,300', amtCls:'inc'},
      {id:`${p}_yost`, date:apex1Date, color:C.ap, type:'', name:'Yost & Baill', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$100', amt:'-$100', amtCls:'exp'},
      {id:`${p}_fid`, date:`${p} 16`, color:C.ap, type:'', name:'Fidelity Roth IRA', tag:'Autopay', tagCls:'tagAp', sub:"Confirm $325 transfer. Verify it's invested, not sitting in cash.", amt:'-$325', amtCls:'exp'},
      {id:`${p}_cricut`, date:`${p} 17`, color:C.atn, type:'', name:'Cricut', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$11', amt:'-$11', amtCls:'exp'},
      {id:`${p}_gplay`, date:`${p} 18`, color:C.sp, type:'', name:'Google Play', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
      {id:`${p}_cs2`, date:`${p} 18 Fri`, color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
      {id:`${p}_automike`, date:autoMikeDate, color:C.ap, type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'tagAp', sub:'Pay manually. ~$725', amt:'-$725', amtCls:'exp'},
      {id:`${p}_autodani`, date:autoDaniDate, color:C.atn, type:'', name:'Auto Loan — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$750', amt:'-$750', amtCls:'exp'},
      {id:`${p}_elec`, date:`${p} 20`, color:C.atn, type:'', name:'Electricity + Student Loan + Amazon Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Electricity $200 + Student Loan $123 + Amazon Dani $16 = $339', amt:'-$339', amtCls:'exp'},
      {id:`${p}_groc2`, date:`${p} 17 Thu`, color:C.sp, type:'', name:'Groceries run 2', tag:'Spending', tagCls:'tagSp', sub:'Balance ~$700 after Stearns transfer.', amt:'~$200', amtCls:'exp'},
      {id:`${p}_fuel2`, date:`${p} 19`, color:C.sp, type:'', name:'Fuel fill 2', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
      {id:`${p}_inet`, date:inetDate, color:C.atn, type:'', name:'Internet — Spectrum', tag:'Above the Norm', tagCls:'tagAtn', sub:'Pay manually. ~$65', amt:'-$65', amtCls:'exp'},
    ]},
    { label: `${p} late · Late bills · Stearns · Apex · Return buffer · Save`, events: [
      {id:`${p}_railway`, date:`${p} 27`, color:C.sp, type:'', name:'Railway', tag:'Spending', tagCls:'tagSp', sub:'Auto-charge ~$5', amt:'-$5', amtCls:'exp'},
      {id:`${p}_blinkfit`, date:`${p} 28`, color:C.atn, type:'', name:'Blink Fitness', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
      {id:`${p}_apple`, date:`${p} 25`, color:C.ap, type:'', name:'AppleCare', tag:'Autopay', tagCls:'tagAp', sub:'Auto-charge ~$15', amt:'-$15', amtCls:'exp'},
      {id:`${p}_pets`, date:`${p} 24 Thu`, color:C.sp, type:'', name:'Pets', tag:'Spending', tagCls:'tagSp', sub:'~$125', amt:'~$125', amtCls:'exp'},
      {id:`${p}_blink`, date:`${p} 26`, color:C.atn, type:'', name:'Blink cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
      {id:`${p}_ringcam`, date:`${p} 29`, color:C.atn, type:'', name:'Ring Cam', tag:'Above the Norm', tagCls:'tagAtn', sub:'Auto-charge ~$12', amt:'-$12', amtCls:'exp'},
      {id:`${p}_cs3`, date:`${p} 25 Fri`, color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
      ...(isOct ? [{id:'Oct_dani', date:'~late Oct', color:C.hse, type:'hev', name:"Dani's house closes — ~$50k net", tag:'WINDFALL', tagCls:'tagHse', sub:"Separate from budget. Keep in Liberty HYSA. Budget $10-15k for furnishings. Leave rest as emergency fund. Do NOT rush to pay down principal.", amt:'+~$50,000', amtCls:'hse'}] : []),
      {id:`${p}_st2`, date:stearns2Date, color:C.atn, type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'tagAtn', sub:'Transfer $723 to Spending.', amt:'+$1,650', amtCls:'inc'},
      {id:`${p}_xf2`, date:stearns2Date, color:C.atn, type:'', name:'Transfer $723 → Spending', tag:'Spending', tagCls:'tagSp', sub:'Second Stearns. Fund end of month and next month start.', amt:'$723', amtCls:'trn'},
      {id:`${p}_groc3`, date:`${p} 27`, color:C.sp, type:'', name:'Groceries run 3', tag:'Spending', tagCls:'tagSp', sub:'Final grocery run.', amt:'~$200', amtCls:'exp'},
      {id:`${p}_fuel3`, date:`${p} 29`, color:C.sp, type:'', name:'Fuel fill 3', tag:'Spending', tagCls:'tagSp', sub:'~$75.', amt:'~$75', amtCls:'exp'},
      {id:`${p}_shop2`, date:`${p} 27`, color:C.sp, type:'', name:'Shopping window 2 — $150', tag:'Spending', tagCls:'tagSp', sub:'$150. $300 cap hit.', amt:'~$150', amtCls:'exp'},
      {id:`${p}_cs4`, date:apex2Date, color:C.cs, type:'', name:'Child support — $200', tag:'Child Support', tagCls:'tagCs', sub:'Weekly CS.', amt:'+~$200', amtCls:'inc'},
      {id:`${p}_apex2`, date:apex2Date, color:C.ap, type:'mile', name:`Apex paycheck${isOct ? '' : ''}`, tag:'Autopay', tagCls:'tagAp', amt:'+$2,300', amtCls:'inc'},
      ...(isOct ? [{id:'Oct_bonus', date:apex2Date, color:C.ap, type:'bev', name:'Apex BONUS $2,800 — all to savings', tag:'BONUS', tagCls:'tagBon', sub:'Split $700 each: Stearns ·4182, ·3046, Personal Savings, Liberty. No deadline — comfortable pace.', amt:'+$2,800 → SAVE', amtCls:'bon'}] : []),
      {id:`${p}_bufret`, date:apex2Date, color:C.ap, type:'', name:'Return $1,000 buffer → Autopay', tag:'Autopay', tagCls:'tagAp', sub:'Return monthly ATN buffer. Do LAST — after both Apex and Stearns have landed.', amt:'$1,000 returned', amtCls:'trn'},
      {id:`${p}_save`, date:apex2Date, color:C.ap, type:'sev', name:'Surplus → savings rebuild', tag:'SAVE', tagCls:'tagSave', sub:'Distribute Autopay + ATN surplus to savings accounts. No deadline — comfortable pace.', amt:`${isDec ? '~$1,500' : '~$700+'} saved`, amtCls:'sav'},
    ]},
  ]

  return { ...m, weeks }
}

// ── main component ─────────────────────────────────────────
export default function BudgetCalendar() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })

  // Count all checkable events
  const allIds = MONTHS.flatMap(m =>
    m.weeks.flatMap(w => w.events ? w.events.map(e => e.id) : [])
  )
  const total = allIds.length
  const done  = allIds.filter(id => checked[id]).length
  const pct   = total ? Math.round((done / total) * 100) : 0

  const toggle = useCallback((id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (!next[id]) delete next[id]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const reset = () => {
    if (!window.confirm('Clear all checkmarks?')) return
    setChecked({})
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <SwShell>
      {/* ── head ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budget Plan</div>
          <h1 className={s.title}>June 15 through December 2026</h1>
          <div className={s.subtitle}>Mike + Dani · Offer Jun 14 · Citi payoff Jun 15 · Apply Jul 1 · 401k ~Jul 10 · Close ~Aug 14 · Mortgage Sep 1 · Dani house sale ~Oct · Savings rebuild no deadline</div>
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
        <button className={s.resetBtn} onClick={reset}>Reset</button>
      </div>

      {/* ── account legend ── */}
      <div className={s.legend} style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        {[
          {color:C.ap,  label:'Autopay ·9785',       detail:`Apex lands here · Mortgage · Mike's car · Yost · Lead Bank · Roth`, bal:'$8.12 — Apex Jun 15',                  balOk:false},
          {color:C.atn, label:'Above the Norm ·4510', detail:`Stearns lands here · Dani's car · Utilities · Insurance · Subs`,    bal:'$175.00',                              balOk:false},
          {color:C.sp,  label:'Spending ·1712',       detail:'Funded $723×2/mo from ATN · Groceries · Fuel · Shopping',           bal:'$28.11 — critical until Jun 15',       balOk:false},
          {color:C.cs,  label:'Child Support ·9893',  detail:'CS income · $1,000 floor · Kids & family',                          bal:'$890 — below floor, recovers Jun 19',  balOk:false},
          {color:C.sv,  label:'Savings (total)',       detail:'Personal $929 · ·1244 $5,100 · ·3046 $440 · ·4182 $900 · Liberty $5,900', bal:'$13,269 liquid · 401k $42,000', balOk:true},
        ].map((a,i) => (
          <div key={i} className={s.legendItem} style={{'--ac':a.color}}>
            <div className={s.lheader}>
              <div className={s.ldot}/>
              <div className={s.lname}>{a.label}</div>
            </div>
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
              <div key={wi}>
                {/* balance strip (no label = it's a bal-only row) */}
                {week.bal ? (
                  <BalStrip {...week.bal} />
                ) : (
                  <div className={s.week}>
                    <div className={s.wlabel}>{week.label}</div>
                    {week.events.map(ev => (
                      <Ev key={ev.id} ev={ev} done={!!checked[ev.id]} onToggle={toggle} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {month.mbar && <div className={s.mbar}>{month.mbar}</div>}
            {month.endBal && <BalStrip {...month.endBal} />}

            <div className={s.surp}>
              <span>{month.surplus}</span>
              <strong>{month.surplusVal}</strong>
            </div>

            {month.sstrip && (
              <div className={s.sstrip}>
                {month.sstrip.map((sv,i) => (
                  <div key={i}><div className={s.slabel}>{sv.l}</div><div className={s.sval}>{sv.v}</div></div>
                ))}
              </div>
            )}

            <div className={s.mfooter}>
              {month.footer.map(f => {
                const colors = {atn:C.atn, ap:C.ap, sp:C.sp, cs:C.cs}
                const labels = {atn:'Above the Norm',ap:'Autopay',sp:'Spending',cs:'Child Support'}
                return (
                  <div key={f.acct}>
                    <div className={s.flabel}><div className={s.fdot} style={{background:colors[f.acct]}}/>{labels[f.acct]}</div>
                    <div className={`${s.fbal} ${f.bal.includes('warn') || f.bal.includes('~$0') || f.bal.includes('lean') ? s.fwarn : s.fok}`}>{f.bal}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </SwShell>
  )
}
