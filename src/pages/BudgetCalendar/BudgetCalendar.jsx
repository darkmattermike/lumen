import { useState, useCallback } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import s from './BudgetCalendar.module.css'

const STORAGE_KEY = 'budget_v4_lumen'

// ── account palette (Stillwater-mapped) ───────────────────
const ACCT = {
  atn: { color: '#5ba8e8', label: 'Above the Norm ·4510',  detail: 'Stearns lands here · Yost · Student loan · MN 529',    bal: '$0 after Citi payoff',   balOk: false },
  ap:  { color: '#b07fd8', label: 'Autopay ·9785',          detail: 'Apex lands here · Mortgage (Sep+) · All auto-bills',    bal: '$8 · Apex Jun 15 funds it', balOk: false },
  sp:  { color: '#62e0b5', label: 'Spending ·1712',         detail: 'Groceries · Fuel · Discretionary · Funded by transfer', bal: '$268 after Citi payoff', balOk: false },
  cs:  { color: '#e8b862', label: 'Child Support ·9893',    detail: 'CS income · $1,000 floor · Can cover groceries',        bal: '$897 — recovers Jun 19', balOk: false },
}

// ── months ─────────────────────────────────────────────────
const MONTHS = [
  {
    id:'jun', name:'June 2026 — Remaining',
    income:'Remaining income: $6,650',
    note:'Apex $4,600 · Stearns $1,650 · CS $400 · Accounts lean after Citi payoff',
    phase:'pre', phaseTxt:'Citi paid off today. Accounts lean — Jun 15 Apex is critical. Make offer this week. Do NOT submit formal mortgage application until after Jul 1 when FICO 2 updates.',
    surplus:'June surplus after Citi payoff', surplusVal:'~$300 toward savings · Lean month — gets better from Jul 1',
    footer:[{acct:'atn',bal:'~$800 est.',ok:true},{acct:'ap',bal:'~$350 est.',ok:false},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,100 est.',ok:true}],
    weeks:[
      { label:'Jun 13 — Today · Citi payoff · Make offer', events:[
        {id:'ev1', date:'Jun 13\nTODAY', acct:'atn', type:'today', name:'Pay Citi $1,720 in full', tag:'NOW', tagCls:'now', sub:'Above the Norm $711 + Personal Savings $929 + Spending $80. Card at $0. Score boost hits ~Jul 1–10.', amt:'-$1,720', amtCls:'bon'},
        {id:'ev2', date:'Jun 13', acct:'atn', type:'today', name:'Make offer on home', tag:'ACTION', tagCls:'act', sub:'Earnest money from current savings. Formal application after Jul 1 to capture improved FICO 2 and lower rate.', amt:'action', amtCls:'trn'},
      ]},
      { label:'Jun 15 · Apex paycheck — critical funding day', events:[
        {id:'ev3', date:'Jun 15 Mon', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', sub:'Autopay was $8 — transfer $500 → Above the Norm immediately for Yost + student loan + MN 529', amt:'+$2,300', amtCls:'inc'},
        {id:'ev4', date:'Jun 15 Mon', acct:'atn', type:'', name:'Transfer $500 → Above the Norm', tag:'Above the Norm', tagCls:'atn', sub:'Fund Yost $100 + Student Loan $123 + MN 529 $100 + buffer', amt:'transfer', amtCls:'trn'},
        {id:'ev5', date:'Jun 15 Mon', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev6', date:'Jun 18 Thu', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
      ]},
      { label:'Jun 19 · Stearns paycheck · Auto Loan Dani · CS back above floor', events:[
        {id:'ev7', date:'Jun 19 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev8', date:'Jun 19 Fri', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev9', date:'Jun 19 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', sub:'CS account back above $1,000 floor ✓', amt:'+~$200', amtCls:'inc'},
        {id:'ev10', date:'Jun 20 Sat', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
        {id:'ev11', date:'Jun 22 Mon', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
      ]},
      { label:'Jun 25–30 · Final bills · Jun 28 Citi statement closes → score updates · Second Apex', events:[
        {id:'ev12', date:'Jun 25 Thu', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev13', date:'Jun 25 Thu', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev14', date:'Jun 26 Fri', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev15', date:'Jun 26 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev16', date:'Jun 28 Sun', acct:'sp', type:'mile', name:'Citi statement closes — $0 reports to bureaus', tag:'SCORE UPDATE', tagCls:'score', sub:'FICO 2 boost ~50–80 pts. Submit formal mortgage application AFTER this date — target rate ~6%.', amt:'↑ Score', amtCls:'inc'},
        {id:'ev17', date:'Jun 29 Mon', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev18', date:'Jun 30 Tue', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev19', date:'Jun 30 Tue', acct:'atn', type:'sev', name:'Transfer $800 → Spending · $300 → savings rebuild', tag:'SAVE', tagCls:'save', sub:'Fund July discretionary. Start savings rebuild — $300 to whichever account is lowest.', amt:'$300 saved', amtCls:'sav'},
      ]},
    ],
  },
  {
    id:'jul', name:'July 2026',
    income:'Income: $13,350 (incl. $2,800 bonus)',
    note:'Apex $7,400 · Stearns $4,950 · CS $1,000 · Bonus · Submit application · 401k withdrawal',
    phase:'pre', phaseTxt:'Submit formal application after Jul 1 with updated score. Initiate 401k withdrawal once cash to close confirmed. Rent still active — last payment is August 1.',
    surplus:'July surplus incl. bonus · Closing funds staged', surplusVal:'~$3,500+ · 401k + savings cover $20,633 closing costs',
    footer:[{acct:'atn',bal:'~$2,500 est.',ok:true},{acct:'ap',bal:'~$800 est.',ok:true},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,300 est.',ok:true}],
    savings:[{label:'Personal Savings ·4685',val:'~$1,000 rebuilt'},{label:'Market Savings ·4182',val:'~$1,700 est.'},{label:'Market Savings ·3046',val:'~$1,200 est.'},{label:'Untracked savings',val:'~$1,000 rebuilt'}],
    weeks:[
      { label:'Jul 1–5 · Submit application · Rent · Dani paycheck', events:[
        {id:'ev20', date:'Jul 1 Wed', acct:'sp', type:'mile', name:'Submit formal mortgage application', tag:'KEY DATE', tagCls:'score', sub:'FICO 2 updated. Lock rate at ~6%. Get confirmed cash to close figure before pulling 401k.', amt:'action', amtCls:'inc'},
        {id:'ev21', date:'Jul 1 Wed', acct:'ap', type:'', name:'Rent — second to last payment', tag:'Autopay', tagCls:'ap', sub:'Last rent payment is August 1', amt:'-$1,910', amtCls:'exp'},
        {id:'ev22', date:'Jul 2 Thu', acct:'ap', type:'', name:'Amazon — Dani', tag:'Autopay', tagCls:'ap', amt:'-$16', amtCls:'exp'},
        {id:'ev23', date:'Jul 3 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev24', date:'Jul 3 Fri', acct:'ap', type:'', name:"Renter's Insurance", tag:'Autopay', tagCls:'ap', amt:'-$85', amtCls:'exp'},
        {id:'ev25', date:'Jul 3 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev26', date:'Jul 5 Sun', acct:'ap', type:'', name:'Cell Phone', tag:'Autopay', tagCls:'ap', amt:'-$350', amtCls:'exp'},
      ]},
      { label:'Jul 7–13 · Insurance · Spotify · Initiate 401k withdrawal', events:[
        {id:'ev27', date:'Jul 9 Thu', acct:'ap', type:'', name:'Auto Insurance', tag:'Autopay', tagCls:'ap', amt:'-$300', amtCls:'exp'},
        {id:'ev28', date:'Jul 10 Fri', acct:'ap', type:'', name:'Spotify', tag:'Autopay', tagCls:'ap', amt:'-$25', amtCls:'exp'},
        {id:'ev29', date:'Jul 10 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev30', date:'~Jul 10', acct:'ap', type:'mile', name:'Initiate 401k withdrawal — ~$16,340 gross', tag:'ACTION', tagCls:'score', sub:'Net ~$10,236 after taxes/penalties. Wait for confirmed cash to close from lender first. Funds land 3–5 business days.', amt:'+~$10,236 net', amtCls:'inc'},
      ]},
      { label:'Jul 15–20 · Apex paycheck · Yost · Auto loans · Bills cluster', events:[
        {id:'ev31', date:'Jul 15 Wed', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev32', date:'Jul 15 Wed', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev33', date:'Jul 17 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev34', date:'Jul 17 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev35', date:'Jul 18 Sat', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
        {id:'ev36', date:'Jul 19 Sun', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev37', date:'Jul 20 Mon', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
      ]},
      { label:'Jul 22–31 · Final bills · Apex + BONUS · Dani paycheck · Save bonus', events:[
        {id:'ev38', date:'Jul 22 Wed', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
        {id:'ev39', date:'Jul 24 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev40', date:'Jul 25 Sat', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev41', date:'Jul 25 Sat', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev42', date:'Jul 26 Sun', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev43', date:'Jul 29 Wed', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev44', date:'Jul 31 Fri', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev45', date:'Jul 31 Fri', acct:'cs', type:'bev', name:'Apex BONUS — all to savings rebuild', tag:'BONUS', tagCls:'bon', sub:'Split $2,800 evenly across ·4685, ·4182, ·3046, and untracked (~$700 each). Biggest single savings move of the year.', amt:'+$2,800 → SAVE', amtCls:'bon'},
        {id:'ev46', date:'Jul 31 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev47', date:'Jul 31 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev48', date:'Jul 31 Fri', acct:'sp', type:'sev', name:'Transfer $800 → Spending for August', tag:'Spending', tagCls:'sp', amt:'transfer', amtCls:'trn'},
      ]},
    ],
  },
  {
    id:'aug', name:'August 2026',
    income:'Income: $8,700',
    note:'Apex $4,600 · Stearns $3,300 · CS $800 · CLOSE ~Aug 14 · Last rent Aug 1 · First mortgage Sep 1',
    phase:'closing', phaseTxt:"Closing month. Last rent Aug 1. Close ~Aug 14 — wire $20,633. First mortgage Sep 1. Cancel renter's insurance after closing. Set up mortgage autopay.",
    mbar:'Closed ~Aug 14. Rent done. Mortgage starts Sep 1. Cancel renter\'s insurance. Set mortgage autopay from Autopay account.',
    surplus:'August surplus after closing costs', surplusVal:'~$500 toward savings · Mortgage begins Sep 1',
    footer:[{acct:'atn',bal:'~$1,500 est.',ok:true},{acct:'ap',bal:'~$600 est.',ok:true},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,200 est.',ok:true}],
    savings:[{label:'Personal Savings ·4685',val:'~$1,125 rebuilding'},{label:'Market Savings ·4182',val:'~$1,825 est.'},{label:'Market Savings ·3046',val:'~$1,325 est.'},{label:'Untracked savings',val:'~$1,125 rebuilding'}],
    weeks:[
      { label:'Aug 1–10 · LAST rent · Early bills', events:[
        {id:'ev49', date:'Aug 1 Sat', acct:'ap', type:'', name:'Rent — FINAL PAYMENT', tag:'Autopay', tagCls:'ap', sub:'Last rent payment ever. Mortgage begins Sep 1.', amt:'-$1,910', amtCls:'exp'},
        {id:'ev50', date:'Aug 2 Sun', acct:'ap', type:'', name:'Amazon — Dani', tag:'Autopay', tagCls:'ap', amt:'-$16', amtCls:'exp'},
        {id:'ev51', date:'Aug 3 Mon', acct:'ap', type:'', name:"Renter's Insurance — CANCEL after closing", tag:'Autopay', tagCls:'ap', sub:"Cancel after Aug 14 closing — homeowner's insurance now baked into mortgage PITI", amt:'-$85', amtCls:'exp'},
        {id:'ev52', date:'Aug 5 Wed', acct:'ap', type:'', name:'Cell Phone', tag:'Autopay', tagCls:'ap', amt:'-$350', amtCls:'exp'},
        {id:'ev53', date:'Aug 7 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev54', date:'Aug 9 Sun', acct:'ap', type:'', name:'Auto Insurance', tag:'Autopay', tagCls:'ap', amt:'-$300', amtCls:'exp'},
        {id:'ev55', date:'Aug 10 Mon', acct:'ap', type:'', name:'Spotify', tag:'Autopay', tagCls:'ap', amt:'-$25', amtCls:'exp'},
      ]},
      { label:'~Aug 14 · CLOSING DAY · Both paychecks · Wire funds', events:[
        {id:'ev56', date:'~Aug 14', acct:'sp', type:'hev', name:'CLOSING DAY — Wire $20,633 cash to close', tag:'CLOSING', tagCls:'hse', sub:"Savings $10,397 + 401k net $10,236. Sign docs. Get keys. Cancel renter's insurance. Set up mortgage autopay from Autopay account.", amt:'-$20,633', amtCls:'hse'},
        {id:'ev57', date:'Aug 14 Fri', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev58', date:'Aug 14 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev59', date:'Aug 14 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev60', date:'Aug 15 Sat', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev61', date:'Aug 18 Tue', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
        {id:'ev62', date:'Aug 19 Wed', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev63', date:'Aug 20 Thu', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
      ]},
      { label:'Aug 21–31 · Final bills · Second paychecks · Savings rebuild', events:[
        {id:'ev64', date:'Aug 21 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev65', date:'Aug 22 Sat', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
        {id:'ev66', date:'Aug 25 Tue', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev67', date:'Aug 25 Tue', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev68', date:'Aug 26 Wed', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev69', date:'Aug 28 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev70', date:'Aug 28 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev71', date:'Aug 29 Sat', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev72', date:'Aug 31 Mon', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev73', date:'Aug 31 Mon', acct:'atn', type:'sev', name:'Transfer $800 → Spending · $500 → savings rebuild', tag:'SAVE', tagCls:'save', sub:'Fund September. Split $500 across savings accounts.', amt:'$500 saved', amtCls:'sav'},
      ]},
    ],
  },
  {
    id:'sep', name:'September 2026',
    income:'Income: $8,700',
    note:'Apex $4,600 · Stearns $3,300 · CS $800 · First mortgage · No rent · ~$1,510/mo surplus',
    phase:'post', phaseTxt:'First full month as homeowners. Mortgage $3,000 replaces rent $1,910 (+$1,090). Renters insurance gone (−$85). Monthly surplus ~$1,510. Steady savings rebuild.',
    surplus:"September surplus · First full mortgage month · No rent", surplusVal:"~$1,510/mo surplus · Savings rebuilding steadily",
    footer:[{acct:'atn',bal:'~$2,000 est.',ok:true},{acct:'ap',bal:'~$700 est.',ok:true},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,200 est.',ok:true}],
    savings:[{label:'Personal Savings ·4685',val:'~$1,825 rebuilding'},{label:'Market Savings ·4182',val:'~$2,525 est.'},{label:'Market Savings ·3046',val:'~$2,025 est.'},{label:'Untracked savings',val:'~$1,825 rebuilding'}],
    weeks:[
      { label:'Sep 1 · First mortgage payment', events:[
        {id:'ev74', date:'Sep 1 Tue', acct:'ap', type:'mile', name:'Mortgage — FIRST PAYMENT', tag:'Autopay', tagCls:'ap', sub:"Set up autopay from Autopay account. $3,000/mo PITI — taxes and insurance included. No separate renter's insurance.", amt:'-$3,000', amtCls:'exp'},
        {id:'ev75', date:'Sep 2 Wed', acct:'ap', type:'', name:'Amazon — Dani', tag:'Autopay', tagCls:'ap', amt:'-$16', amtCls:'exp'},
        {id:'ev76', date:'Sep 4 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev77', date:'Sep 5 Sat', acct:'ap', type:'', name:'Cell Phone', tag:'Autopay', tagCls:'ap', amt:'-$350', amtCls:'exp'},
        {id:'ev78', date:'Sep 9 Wed', acct:'ap', type:'', name:'Auto Insurance', tag:'Autopay', tagCls:'ap', amt:'-$300', amtCls:'exp'},
        {id:'ev79', date:'Sep 10 Thu', acct:'ap', type:'', name:'Spotify', tag:'Autopay', tagCls:'ap', amt:'-$25', amtCls:'exp'},
      ]},
      { label:'Sep 11 · Dani paycheck', events:[
        {id:'ev80', date:'Sep 11 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev81', date:'Sep 11 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
      ]},
      { label:'Sep 15–20 · Apex paycheck · Yost · Auto loans · Bills cluster', events:[
        {id:'ev82', date:'Sep 15 Tue', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev83', date:'Sep 15 Tue', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev84', date:'Sep 18 Fri', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
        {id:'ev85', date:'Sep 18 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev86', date:'Sep 19 Sat', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev87', date:'Sep 20 Sun', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
      ]},
      { label:'Sep 22–30 · Final bills · Dani paycheck · Apex paycheck · Save surplus', events:[
        {id:'ev88', date:'Sep 22 Tue', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
        {id:'ev89', date:'Sep 25 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev90', date:'Sep 25 Fri', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev91', date:'Sep 25 Fri', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev92', date:'Sep 25 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev93', date:'Sep 26 Sat', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev94', date:'Sep 29 Tue', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev95', date:'Sep 30 Wed', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev96', date:'Sep 30 Wed', acct:'atn', type:'sev', name:'Transfer $800 → Spending · $700 → savings rebuild', tag:'SAVE', tagCls:'save', sub:'No deadline — comfortable pace. Distribute across whichever accounts are lowest.', amt:'$700 saved', amtCls:'sav'},
      ]},
    ],
  },
  {
    id:'oct', name:'October 2026',
    income:'Income: $11,500 (incl. $2,800 bonus)',
    note:"Apex $7,400 · Stearns $3,300 · CS $1,000 · Bonus month · Savings accelerate",
    phase:'post', phaseTxt:"Bonus month — all $2,800 to savings rebuild. Dani's house sale proceeds (~$50k if closed) go to furnishings + optional principal payment, separate from regular budget.",
    surplus:"October surplus incl. $2,800 bonus", surplusVal:"~$4,310 · Savings past halfway to $5k targets",
    footer:[{acct:'atn',bal:'~$2,500 est.',ok:true},{acct:'ap',bal:'~$800 est.',ok:true},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,400 est.',ok:true}],
    savings:[{label:'Personal Savings ·4685',val:'~$3,225 est.'},{label:'Market Savings ·4182',val:'~$3,425 est.'},{label:'Market Savings ·3046',val:'~$2,925 est.'},{label:'Untracked savings',val:'~$3,225 est.'}],
    weeks:[
      { label:'Oct 1–10 · Mortgage · Early bills · Dani paycheck', events:[
        {id:'ev97', date:'Oct 1 Thu', acct:'ap', type:'', name:'Mortgage', tag:'Autopay', tagCls:'ap', amt:'-$3,000', amtCls:'exp'},
        {id:'ev98', date:'Oct 2 Fri', acct:'ap', type:'', name:'Amazon — Dani', tag:'Autopay', tagCls:'ap', amt:'-$16', amtCls:'exp'},
        {id:'ev99', date:'Oct 2 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev100', date:'Oct 5 Mon', acct:'ap', type:'', name:'Cell Phone', tag:'Autopay', tagCls:'ap', amt:'-$350', amtCls:'exp'},
        {id:'ev101', date:'Oct 9 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev102', date:'Oct 9 Fri', acct:'ap', type:'', name:'Auto Insurance', tag:'Autopay', tagCls:'ap', amt:'-$300', amtCls:'exp'},
        {id:'ev103', date:'Oct 9 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev104', date:'Oct 10 Sat', acct:'ap', type:'', name:'Spotify', tag:'Autopay', tagCls:'ap', amt:'-$25', amtCls:'exp'},
      ]},
      { label:'Oct 15–20 · Apex paycheck · Yost · Auto loans · Bills cluster', events:[
        {id:'ev105', date:'Oct 15 Thu', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev106', date:'Oct 15 Thu', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev107', date:'Oct 16 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev108', date:'Oct 18 Sun', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
        {id:'ev109', date:'Oct 19 Mon', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev110', date:'Oct 20 Tue', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
      ]},
      { label:"Oct 22–31 · Final bills · Dani paycheck · Apex + BONUS · All bonus to savings", events:[
        {id:'ev111', date:'Oct 22 Thu', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
        {id:'ev112', date:'Oct 23 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev113', date:'Oct 23 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev114', date:'Oct 25 Sun', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev115', date:'Oct 25 Sun', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev116', date:'Oct 26 Mon', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev117', date:'Oct 29 Thu', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev118', date:'Oct 30 Fri', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev119', date:'Oct 30 Fri', acct:'cs', type:'bev', name:'Apex BONUS — all to savings rebuild', tag:'BONUS', tagCls:'bon', sub:"Split $2,800 across savings accounts. Gets ·4685 and untracked approaching $3k each.", amt:'+$2,800 → SAVE', amtCls:'bon'},
        {id:'ev120', date:'Oct 30 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev121', date:'Oct 30 Fri', acct:'sp', type:'sev', name:'Transfer $800 → Spending for November', tag:'Spending', tagCls:'sp', amt:'transfer', amtCls:'trn'},
      ]},
    ],
  },
  {
    id:'nov', name:'November 2026',
    income:'Income: $8,700',
    note:"Apex $4,600 · Stearns $3,300 · CS $800 · Steady · Dani's house sale may close",
    phase:'post', phaseTxt:"Steady month. $1,510 surplus. Dani's house closes ~this month — proceeds go toward furnishings + optional principal-only mortgage payment, separate from regular budget.",
    surplus:"November surplus · Dani's house proceeds separate", surplusVal:"~$1,510 · Savings approaching $4k each · Nearly there",
    footer:[{acct:'atn',bal:'~$2,200 est.',ok:true},{acct:'ap',bal:'~$700 est.',ok:true},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,400 est.',ok:true}],
    savings:[{label:'Personal Savings ·4685',val:'~$3,925 est.'},{label:'Market Savings ·4182',val:'~$4,125 est.'},{label:'Market Savings ·3046',val:'~$3,625 est.'},{label:'Untracked savings',val:'~$3,925 est.'}],
    weeks:[
      { label:'Nov 1–10 · Mortgage · Early bills', events:[
        {id:'ev122', date:'Nov 1 Sun', acct:'ap', type:'', name:'Mortgage', tag:'Autopay', tagCls:'ap', amt:'-$3,000', amtCls:'exp'},
        {id:'ev123', date:'Nov 2 Mon', acct:'ap', type:'', name:'Amazon — Dani', tag:'Autopay', tagCls:'ap', amt:'-$16', amtCls:'exp'},
        {id:'ev124', date:'Nov 5 Thu', acct:'ap', type:'', name:'Cell Phone', tag:'Autopay', tagCls:'ap', amt:'-$350', amtCls:'exp'},
        {id:'ev125', date:'Nov 6 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev126', date:'Nov 9 Mon', acct:'ap', type:'', name:'Auto Insurance', tag:'Autopay', tagCls:'ap', amt:'-$300', amtCls:'exp'},
        {id:'ev127', date:'Nov 10 Tue', acct:'ap', type:'', name:'Spotify', tag:'Autopay', tagCls:'ap', amt:'-$25', amtCls:'exp'},
      ]},
      { label:'Nov 13 · Dani paycheck', events:[
        {id:'ev128', date:'Nov 13 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev129', date:'Nov 13 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
      ]},
      { label:'Nov 14–20 · Apex paycheck · Yost · Auto loans · Bills cluster', events:[
        {id:'ev130', date:'Nov 14 Sat', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev131', date:'Nov 15 Sun', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev132', date:'Nov 18 Wed', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
        {id:'ev133', date:'Nov 19 Thu', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev134', date:'Nov 20 Fri', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
        {id:'ev135', date:'Nov 20 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
      ]},
      { label:"Nov 22–30 · Final bills · Dani paycheck · Apex · Dani's house sale closes", events:[
        {id:'ev136', date:'Nov 22 Sun', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
        {id:'ev137', date:'Nov 25 Wed', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev138', date:'Nov 25 Wed', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev139', date:'Nov 27 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev140', date:'Nov 27 Fri', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev141', date:'Nov 27 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev142', date:'Nov 29 Sun', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev143', date:'Nov 30 Mon', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev144', date:'~Nov', acct:'sp', type:'hev', name:"Dani's house closes — ~$50k net", tag:'WINDFALL', tagCls:'hse', sub:'Separate from regular budget. Allocate: furnishings + optional principal-only mortgage payment. Does not affect operating accounts.', amt:'+~$50,000', amtCls:'hse'},
        {id:'ev145', date:'Nov 30 Mon', acct:'atn', type:'sev', name:'Transfer $800 → Spending · $700 → savings rebuild', tag:'SAVE', tagCls:'save', amt:'$700 saved', amtCls:'sav'},
      ]},
    ],
  },
  {
    id:'dec', name:'December 2026',
    income:'Income: $8,700',
    note:'Apex $4,600 · Stearns $3,300 · CS $800 · Year end · Savings approaching $5k targets',
    phase:'post', phaseTxt:'Final month of plan. Savings closing in on $5k targets — January 2027 bonus puts all accounts over the line. Settled, stable, building. Continue this cadence into 2027.',
    mbar:'Year end — settled in new home · $0 card debt · All savings accounts ~$5k · Jan 2027 bonus finishes the job · Continue this plan in perpetuity',
    surplus:'December year-end position', surplusVal:'Stable · Homeowners · $0 debt · Savings rebuilt · Jan 2027 bonus closes the loop ✓',
    footer:[{acct:'atn',bal:'~$2,500 est.',ok:true},{acct:'ap',bal:'~$800 est.',ok:true},{acct:'sp',bal:'~$900 est.',ok:true},{acct:'cs',bal:'~$1,400 est.',ok:true}],
    savings:[{label:'Personal Savings ·4685',val:'~$5,125 ✓ target hit'},{label:'Market Savings ·4182',val:'~$5,325 ✓ target hit'},{label:'Market Savings ·3046',val:'~$4,825 → Jan bonus'},{label:'Untracked savings',val:'~$5,125 ✓ target hit'}],
    weeks:[
      { label:'Dec 1–10 · Mortgage · Early bills', events:[
        {id:'ev146', date:'Dec 1 Tue', acct:'ap', type:'', name:'Mortgage', tag:'Autopay', tagCls:'ap', amt:'-$3,000', amtCls:'exp'},
        {id:'ev147', date:'Dec 2 Wed', acct:'ap', type:'', name:'Amazon — Dani', tag:'Autopay', tagCls:'ap', amt:'-$16', amtCls:'exp'},
        {id:'ev148', date:'Dec 4 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev149', date:'Dec 5 Sat', acct:'ap', type:'', name:'Cell Phone', tag:'Autopay', tagCls:'ap', amt:'-$350', amtCls:'exp'},
        {id:'ev150', date:'Dec 9 Wed', acct:'ap', type:'', name:'Auto Insurance', tag:'Autopay', tagCls:'ap', amt:'-$300', amtCls:'exp'},
        {id:'ev151', date:'Dec 10 Thu', acct:'ap', type:'', name:'Spotify', tag:'Autopay', tagCls:'ap', amt:'-$25', amtCls:'exp'},
      ]},
      { label:'Dec 11 · Dani paycheck', events:[
        {id:'ev152', date:'Dec 11 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', amt:'+$1,650', amtCls:'inc'},
        {id:'ev153', date:'Dec 11 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
      ]},
      { label:'Dec 15–20 · Apex paycheck · Yost · Auto loans · Bills cluster', events:[
        {id:'ev154', date:'Dec 15 Tue', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev155', date:'Dec 15 Tue', acct:'atn', type:'', name:'Yost', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev156', date:'Dec 18 Fri', acct:'ap', type:'', name:'Auto Loan — Mike', tag:'Autopay', tagCls:'ap', amt:'-$725', amtCls:'exp'},
        {id:'ev157', date:'Dec 18 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev158', date:'Dec 19 Sat', acct:'ap', type:'', name:'Auto Loan — Dani', tag:'Autopay', tagCls:'ap', amt:'-$750', amtCls:'exp'},
        {id:'ev159', date:'Dec 20 Sun', acct:'ap', type:'', name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', tagCls:'ap', amt:'-$394', amtCls:'exp'},
      ]},
      { label:'Dec 22–31 · Final bills · Dani paycheck · Apex paycheck · Year-end savings push', events:[
        {id:'ev160', date:'Dec 22 Tue', acct:'ap', type:'', name:'Internet', tag:'Autopay', tagCls:'ap', amt:'-$65', amtCls:'exp'},
        {id:'ev161', date:'Dec 25 Fri', acct:'atn', type:'mile', name:'Stearns paycheck — Dani', tag:'Above the Norm', tagCls:'atn', sub:'Christmas Day — may land Dec 24 or Dec 26 depending on bank', amt:'+$1,650', amtCls:'inc'},
        {id:'ev162', date:'Dec 25 Fri', acct:'atn', type:'', name:'MN 529', tag:'Above the Norm', tagCls:'atn', amt:'-$100', amtCls:'exp'},
        {id:'ev163', date:'Dec 25 Fri', acct:'ap', type:'', name:'AppleCare', tag:'Autopay', tagCls:'ap', amt:'-$15', amtCls:'exp'},
        {id:'ev164', date:'Dec 25 Fri', acct:'cs', type:'', name:'Child support payment', tag:'Child Support', tagCls:'cs', amt:'+~$200', amtCls:'inc'},
        {id:'ev165', date:'Dec 26 Sat', acct:'ap', type:'', name:'Blink', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev166', date:'Dec 29 Tue', acct:'ap', type:'', name:'Ring Cam', tag:'Autopay', tagCls:'ap', amt:'-$12', amtCls:'exp'},
        {id:'ev167', date:'Dec 31 Thu', acct:'ap', type:'mile', name:'Apex paycheck', tag:'Autopay', tagCls:'ap', amt:'+$2,300', amtCls:'inc'},
        {id:'ev168', date:'Dec 31 Thu', acct:'atn', type:'sev', name:'Year-end savings push — distribute all surplus', tag:'SAVE', tagCls:'save', sub:'All surplus beyond operating buffer goes to savings accounts. Jan 2027 bonus puts all accounts over $5k.', amt:'~$1,500 saved', amtCls:'sav'},
      ]},
    ],
  },
]

const TAG_CLS = { atn:'tagAtn', ap:'tagAp', sp:'tagSp', cs:'tagCs', save:'tagSave', bon:'tagBon', hse:'tagHse', now:'tagNow', score:'tagScore', act:'tagAct' }

export default function BudgetCalendar() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })

  const allEvents = MONTHS.flatMap(m => m.weeks.flatMap(w => w.events))
  const total = allEvents.length
  const done  = Object.values(checked).filter(Boolean).length
  const pct   = total ? Math.round((done / total) * 100) : 0

  const toggle = useCallback((id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (!next[id]) delete next[id]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return (
    <SwShell>
      {/* ── head ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budget Plan</div>
          <h1 className={s.title}>June 13 through December 2026</h1>
          <div className={s.subtitle}>Mike + Dani · 4 accounts · Citi paid off today · Close ~Aug 14 · Mortgage Sep 1 · Rebuild savings through year end</div>
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
        <button className={s.resetBtn} onClick={() => { if(window.confirm('Clear all checkmarks?')){ setChecked({}); localStorage.removeItem(STORAGE_KEY) } }}>Reset</button>
      </div>

      {/* ── account legend ── */}
      <div className={s.legend}>
        {Object.entries(ACCT).map(([k,a]) => (
          <div key={k} className={s.legendItem} style={{'--ac':a.color}}>
            <div className={s.ldot}/>
            <div className={s.linfo}>
              <div className={s.lname}>{a.label}</div>
              <div className={s.ldetail}>{a.detail}</div>
            </div>
            <div className={`${s.lbal} ${a.balOk ? s.lbalOk : s.lbalWarn}`}>{a.bal}</div>
          </div>
        ))}
      </div>

      {/* ── months ── */}
      <div className={s.months}>
        {MONTHS.map(month => (
          <div key={month.id} className={s.month}>

            {/* header */}
            <div className={s.mhdr}>
              <div className={s.mname}>{month.name}</div>
              <div className={s.mmeta}>
                <div className={s.mincome}>{month.income}</div>
                <div className={s.mnote}>{month.note}</div>
              </div>
            </div>

            {/* phase banner */}
            <div className={`${s.pbanner} ${s[month.phase]}`}>{month.phaseTxt}</div>

            {/* weeks */}
            {month.weeks.map((week, wi) => (
              <div key={wi} className={s.week}>
                <div className={s.wlabel}>{week.label}</div>
                {week.events.map(ev => {
                  const isDone = !!checked[ev.id]
                  const acct = ACCT[ev.acct] || ACCT.atn
                  const rowCls = [
                    s.ev,
                    ev.type === 'today' ? s.evToday : '',
                    ev.type === 'mile'  ? s.evMile  : '',
                    ev.type === 'bev'   ? s.evBonus : '',
                    ev.type === 'hev'   ? s.evHouse : '',
                    ev.type === 'sev'   ? s.evSave  : '',
                    isDone              ? s.evDone  : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <div key={ev.id} className={rowCls} onClick={() => toggle(ev.id)} role="button" tabIndex={0}
                      onKeyDown={e => { if(e.key==='Enter'||e.key===' ') toggle(ev.id) }}>
                      <div className={`${s.chk} ${isDone ? s.chkDone : ''}`} aria-hidden="true"/>
                      <span className={s.edate}>{ev.date.split('\n').map((l,i)=><span key={i}>{l}{i===0&&ev.date.includes('\n')&&<br/>}</span>)}</span>
                      <div className={s.edot} style={{background: acct.color}}/>
                      <div className={s.ebody}>
                        <div className={s.ename}>
                          {ev.name}
                          {ev.tag && <span className={`${s.tag} ${s[TAG_CLS[ev.tagCls]||'tagDef']}`}>{ev.tag}</span>}
                        </div>
                        {ev.sub && <div className={s.esub}>{ev.sub}</div>}
                      </div>
                      <span className={`${s.eamt} ${s[ev.amtCls]||''}`}>{ev.amt}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* milestone bar */}
            {month.mbar && <div className={s.mbar}>{month.mbar}</div>}

            {/* savings strip */}
            {month.savings && (
              <div className={s.sstrip}>
                {month.savings.map((sv,i) => (
                  <div key={i}>
                    <div className={s.slabel}>{sv.label}</div>
                    <div className={s.sval}>{sv.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* surplus */}
            <div className={s.surp}>
              <span>{month.surplus}</span>
              <strong>{month.surplusVal}</strong>
            </div>

            {/* footer */}
            <div className={s.mfooter}>
              {month.footer.map(f => {
                const a = ACCT[f.acct]
                return (
                  <div key={f.acct}>
                    <div className={s.flabel}><div className={s.fdot} style={{background:a.color}}/>{a.label.split(' ·')[0]}</div>
                    <div className={`${s.fbal} ${f.ok ? s.fok : s.fwarn}`}>{f.bal}</div>
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
