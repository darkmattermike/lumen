import { useState, useEffect, useCallback } from 'react'
import SwShell from '../../components/SwShell/SwShell'
import s from './BudgetCalendar.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Budget Calendar (Stillwater · Dark)
   Jun 13 → Oct 2026 · 4 accounts · house close · debt payoff
   ────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'lumen_budget_cal_v3'

// ── account color tokens mapped to Stillwater palette ──
const ACCT = {
  atn: { color: '#5ba8e8', bg: 'rgba(91,168,232,.10)', label: 'Above the Norm ·4510' },
  ap:  { color: '#b07fd8', bg: 'rgba(176,127,216,.10)', label: 'Autopay ·9785'        },
  sp:  { color: '#62e0b5', bg: 'rgba(98,224,181,.10)',  label: 'Spending ·1712'        },
  cs:  { color: '#e8b862', bg: 'rgba(232,184,98,.10)',  label: 'Child Support ·9893'   },
}

// ── all 122 events ──────────────────────────────────────────
const MONTHS = [
  {
    id: 'jun',
    name: 'June 2026 — Remaining',
    income: 'Remaining income: $6,650',
    note: 'Apex $4,600 · Stearns $1,650 · CS $400 · Starting fresh after Citi payoff',
    phase: { cls: 'now', text: 'Citi paid off today. Accounts are lean — Jun 15 Apex paycheck is critical. Top up Autopay immediately after it lands.' },
    footer: [
      { acct: 'atn', bal: '~$3,325 est.', ok: true },
      { acct: 'ap',  bal: '~$150 est.',   ok: false },
      { acct: 'sp',  bal: '~$1,268 est.', ok: true },
      { acct: 'cs',  bal: '~$1,297 est.', ok: true },
    ],
    weeks: [
      {
        label: 'Today — June 13 · Citi payoff · Account reset',
        events: [
          { id:'ev1',  date:'Jun 13 Sat\nTODAY', acct:'cs',  type:'today',   name:'Starting balances after Citi payoff', tag:'NOW',          sub:'Above the Norm: $0 · Personal Savings: $0 · Spending: $268 · Child Support: $897 · Citi: $0 ✓', amt:'$1,720 gone → $0 debt', amtCls:'payoff' },
          { id:'ev2',  date:'Jun 13 Sat',         acct:'ap',  type:'payoff',  name:'Citi Double Cash paid in full',        tag:'CARD PAID OFF', sub:'From: Above the Norm $711 + Personal Savings $929 + Spending $80. FICO 2 will improve ~50-80 pts at next statement close (Jun 28)', amt:'-$1,720', amtCls:'payoff' },
          { id:'ev3',  date:'Jun 13 Sat',         acct:'cs',  type:'normal',  name:'Child Support account below $1,000 floor', tag:'Child Support', sub:'$897 — $103 under floor. Next CS payment lands Jun 19 (+~$200). Will be back above floor by Jun 19.', amt:'⚠ $897', amtCls:'warn' },
        ],
      },
      {
        label: 'June 15 · Apex paycheck — critical funding day',
        events: [
          { id:'ev4',  date:'Jun 15 Mon', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', sub:'Account was $0 — this $2,300 funds everything. Transfer $700 to Autopay immediately to cover bills.', amt:'+$2,300', amtCls:'income' },
          { id:'ev5',  date:'Jun 15 Mon', acct:'atn', type:'normal',    name:'Yost',                        tag:'Above the Norm', amt:'-$100', amtCls:'expense' },
          { id:'ev6',  date:'Jun 15 Mon', acct:'ap',  type:'normal',    name:'Transfer $700 → Autopay',     tag:'Autopay',        sub:'Fund Autopay for Auto Loan Dani, Electricity, Student Loan, Gym, Amazon, Internet, AppleCare, Blink, Ring Cam', amt:'transfer', amtCls:'transfer' },
        ],
      },
      {
        label: 'June 16–19 · Auto loans · Dani paycheck · CS payment',
        events: [
          { id:'ev7',  date:'Jun 18 Thu', acct:'atn', type:'normal',    name:'Auto Loan - Mike',            tag:'Above the Norm', amt:'-$725',  amtCls:'expense' },
          { id:'ev8',  date:'Jun 19 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev9',  date:'Jun 19 Fri', acct:'ap',  type:'normal',    name:'Auto Loan - Dani',            tag:'Autopay',        amt:'-$750',  amtCls:'expense' },
          { id:'ev10', date:'Jun 19 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  sub:'CS account back above $1,000 floor ✓', amt:'+~$200', amtCls:'income' },
        ],
      },
      {
        label: 'June 20–26 · Bill cluster · Citi statement closes Jun 28 → score updates',
        events: [
          { id:'ev11', date:'Jun 20 Sat', acct:'ap',  type:'normal',    name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay',      amt:'-$394', amtCls:'expense' },
          { id:'ev12', date:'Jun 22 Mon', acct:'ap',  type:'normal',    name:'Internet',                    tag:'Autopay',        amt:'-$65',  amtCls:'expense' },
          { id:'ev13', date:'Jun 25 Thu', acct:'atn', type:'normal',    name:'MN 529',                      tag:'Above the Norm', amt:'-$100', amtCls:'expense' },
          { id:'ev14', date:'Jun 25 Thu', acct:'ap',  type:'normal',    name:'AppleCare',                   tag:'Autopay',        amt:'-$15',  amtCls:'expense' },
          { id:'ev15', date:'Jun 26 Fri', acct:'ap',  type:'normal',    name:'Blink',                       tag:'Autopay',        amt:'-$12',  amtCls:'expense' },
          { id:'ev16', date:'Jun 26 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev17', date:'Jun 28 Sun', acct:'sp',  type:'milestone', name:'Citi statement closes — $0 balance reports to bureaus', tag:'SCORE UPDATE', sub:'FICO 2 boost of ~50–80 pts should reflect within 1–2 weeks. Target: 699–729 range.', amt:'↑ Score', amtCls:'income' },
          { id:'ev18', date:'Jun 29 Mon', acct:'ap',  type:'normal',    name:'Ring Cam',                    tag:'Autopay',        amt:'-$12',  amtCls:'expense' },
        ],
      },
      {
        label: 'June 30 · Second Apex check · Fund July',
        events: [
          { id:'ev19', date:'Jun 30 Tue', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev20', date:'Jun 30 Tue', acct:'sp',  type:'normal',    name:'Transfer $1,000 → Spending',  tag:'Spending',       sub:'Fund July groceries, fuel, discretionary', amt:'transfer', amtCls:'transfer' },
        ],
      },
    ],
  },
  {
    id: 'jul',
    name: 'July 2026',
    income: 'Income: $13,350 (incl. $2,800 bonus)',
    note: 'Apex $7,400 · Stearns $4,950 · CS $1,000 · House lists Jul 1 · No card payments',
    phase: { cls: 'phase2', text: 'No card payments this month — both cards $0. House lists Jul 1, closes ~Aug 14. Save full $2,800 bonus on Jul 31.' },
    savings: 'Savings buffer: $5,683 current + $2,800 bonus = $8,483 cushion beyond $55,000 target (once house closes)',
    savingsRight: 'House lists Jul 1 · Expected close ~Aug 14',
    footer: [
      { acct: 'atn', bal: '~$3,500 est.', ok: true },
      { acct: 'ap',  bal: '~$150 est.',   ok: false },
      { acct: 'sp',  bal: '~$900 est.',   ok: true },
      { acct: 'cs',  bal: '~$1,300 est.', ok: true },
    ],
    weeks: [
      {
        label: 'July 1–5 · Rent · Dani paycheck · Bills cluster',
        events: [
          { id:'ev21', date:'Jul 1 Wed',  acct:'atn', type:'normal',    name:'Rent',                        tag:'Above the Norm', amt:'-$1,910', amtCls:'expense' },
          { id:'ev22', date:'Jul 2 Thu',  acct:'ap',  type:'normal',    name:'Amazon - Dani',               tag:'Autopay',        amt:'-$16',   amtCls:'expense' },
          { id:'ev23', date:'Jul 3 Fri',  acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev24', date:'Jul 3 Fri',  acct:'ap',  type:'normal',    name:"Renter's Insurance",          tag:'Autopay',        amt:'-$85',   amtCls:'expense' },
          { id:'ev25', date:'Jul 3 Fri',  acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev26', date:'Jul 5 Fri',  acct:'ap',  type:'normal',    name:'Cell Phone',                  tag:'Autopay',        amt:'-$350',  amtCls:'expense' },
        ],
      },
      {
        label: 'July 6–13 · Insurance · Spotify',
        events: [
          { id:'ev27', date:'Jul 9 Thu',  acct:'ap',  type:'normal',    name:'Auto Insurance',              tag:'Autopay',        amt:'-$300',  amtCls:'expense' },
          { id:'ev28', date:'Jul 10 Fri', acct:'ap',  type:'normal',    name:'Spotify',                     tag:'Autopay',        amt:'-$25',   amtCls:'expense' },
          { id:'ev29', date:'Jul 10 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev30', date:'Jul 12 Sun', acct:'atn', type:'normal',    name:'Transfer $600 → Autopay',     tag:'Autopay',        sub:'Top up Autopay before mid-month bill cluster (auto loans, electricity, etc.)', amt:'transfer', amtCls:'transfer' },
        ],
      },
      {
        label: 'July 14–20 · Apex paycheck · Yost · Auto loans · Cluster bills',
        events: [
          { id:'ev31', date:'Jul 15 Wed', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev32', date:'Jul 15 Wed', acct:'atn', type:'normal',    name:'Yost',                        tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev33', date:'Jul 17 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev34', date:'Jul 17 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev35', date:'Jul 18 Sat', acct:'atn', type:'normal',    name:'Auto Loan - Mike',            tag:'Above the Norm', amt:'-$725',  amtCls:'expense' },
          { id:'ev36', date:'Jul 19 Sun', acct:'ap',  type:'normal',    name:'Auto Loan - Dani',            tag:'Autopay',        amt:'-$750',  amtCls:'expense' },
          { id:'ev37', date:'Jul 20 Mon', acct:'ap',  type:'normal',    name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', amt:'-$394', amtCls:'expense' },
        ],
      },
      {
        label: 'July 21–31 · Final bills · Apex paycheck + BONUS · Dani paycheck · Save bonus',
        events: [
          { id:'ev38', date:'Jul 22 Wed', acct:'ap',  type:'normal',    name:'Internet',                    tag:'Autopay',        amt:'-$65',   amtCls:'expense' },
          { id:'ev39', date:'Jul 24 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev40', date:'Jul 25 Sat', acct:'atn', type:'normal',    name:'MN 529',                      tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev41', date:'Jul 25 Sat', acct:'ap',  type:'normal',    name:'AppleCare',                   tag:'Autopay',        amt:'-$15',   amtCls:'expense' },
          { id:'ev42', date:'Jul 26 Sun', acct:'ap',  type:'normal',    name:'Blink',                       tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev43', date:'Jul 29 Wed', acct:'ap',  type:'normal',    name:'Ring Cam',                    tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev44', date:'Jul 31 Fri', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev45', date:'Jul 31 Fri', acct:'atn', type:'milestone', name:'Apex BONUS — save all',       tag:'BONUS',          sub:'Transfer $2,800 to savings immediately. Running total toward down payment buffer.', amt:'+$2,800 → SAVE', amtCls:'save' },
          { id:'ev46', date:'Jul 31 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev47', date:'Jul 31 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev48', date:'Jul 31 Fri', acct:'sp',  type:'normal',    name:'Transfer $1,000 → Spending',  tag:'Spending',       sub:'Fund August groceries, fuel, discretionary', amt:'transfer', amtCls:'transfer' },
        ],
      },
    ],
  },
  {
    id: 'aug',
    name: 'August 2026',
    income: 'Income: $58,700 (incl. $50k house)',
    note: 'Apex $4,600 · Stearns $3,300 · CS $800 · House closes ~Aug 14',
    phase: { cls: 'phase2', text: 'House closes ~Aug 14. $50k net profit lands. Reserve $30k down + $25k cushion. No card payments — both $0 since Jun 13.' },
    milestone: 'August complete — house closed · $55k reserved · both cars current · score climbing · Ready for Sep ✓',
    footer: [
      { acct: 'atn', bal: '$55k reserved + buffer', ok: true },
      { acct: 'ap',  bal: '~$150 · $0 debt',        ok: true },
      { acct: 'sp',  bal: '~$900 est.',              ok: true },
      { acct: 'cs',  bal: '~$1,300 est.',            ok: true },
    ],
    weeks: [
      {
        label: 'August 1–6 · Rent + early bills',
        events: [
          { id:'ev49', date:'Aug 1 Sat',  acct:'atn', type:'normal',    name:'Rent',                        tag:'Above the Norm', amt:'-$1,910', amtCls:'expense' },
          { id:'ev50', date:'Aug 2 Sun',  acct:'ap',  type:'normal',    name:'Amazon - Dani',               tag:'Autopay',        amt:'-$16',   amtCls:'expense' },
          { id:'ev51', date:'Aug 3 Mon',  acct:'ap',  type:'normal',    name:"Renter's Insurance",          tag:'Autopay',        amt:'-$85',   amtCls:'expense' },
          { id:'ev52', date:'Aug 5 Wed',  acct:'ap',  type:'normal',    name:'Cell Phone',                  tag:'Autopay',        amt:'-$350',  amtCls:'expense' },
          { id:'ev53', date:'Aug 7 Fri',  acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev54', date:'Aug 9 Sun',  acct:'ap',  type:'normal',    name:'Auto Insurance',              tag:'Autopay',        amt:'-$300',  amtCls:'expense' },
          { id:'ev55', date:'Aug 10 Mon', acct:'ap',  type:'normal',    name:'Spotify',                     tag:'Autopay',        amt:'-$25',   amtCls:'expense' },
        ],
      },
      {
        label: '~August 14 · HOUSE CLOSES · Both paychecks · Reserve funds',
        events: [
          { id:'ev56', date:'~Aug 14',    acct:'sp',  type:'milestone', name:'House sale closes — net profit received', tag:'HOUSE FUNDS', sub:'Immediately reserve: $30,000 down payment + $25,000 cushion = $55,000. Remaining $5,683+ is buffer.', amt:'+$50,000', amtCls:'house' },
          { id:'ev57', date:'Aug 14 Fri', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev58', date:'Aug 14 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev59', date:'Aug 14 Fri', acct:'atn', type:'normal',    name:'Yost',                        tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev60', date:'Aug 14 Fri', acct:'atn', type:'normal',    name:'Auto Loan - Mike',            tag:'Above the Norm', amt:'-$725',  amtCls:'expense' },
          { id:'ev61', date:'Aug 15 Sat', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
        ],
      },
      {
        label: 'August 16–21 · Bill cluster · Reserve confirmation',
        events: [
          { id:'ev62', date:'Aug 17 Mon', acct:'ap',  type:'normal',    name:'Auto Loan - Dani',            tag:'Autopay',        amt:'-$750',  amtCls:'expense' },
          { id:'ev63', date:'Aug 20 Thu', acct:'ap',  type:'normal',    name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', amt:'-$394', amtCls:'expense' },
          { id:'ev64', date:'Aug 22 Sat', acct:'ap',  type:'normal',    name:'Internet',                    tag:'Autopay',        amt:'-$65',   amtCls:'expense' },
          { id:'ev65', date:'Aug 22 Sat', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
        ],
      },
      {
        label: 'August 25–31 · Final bills · MN 529 · Final Apex + Stearns',
        events: [
          { id:'ev66', date:'Aug 25 Tue', acct:'atn', type:'normal',    name:'MN 529',                      tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev67', date:'Aug 25 Tue', acct:'ap',  type:'normal',    name:'AppleCare',                   tag:'Autopay',        amt:'-$15',   amtCls:'expense' },
          { id:'ev68', date:'Aug 26 Wed', acct:'ap',  type:'normal',    name:'Blink',                       tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev69', date:'Aug 28 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev70', date:'Aug 28 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev71', date:'Aug 29 Sat', acct:'ap',  type:'normal',    name:'Ring Cam',                    tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev72', date:'Aug 31 Mon', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev73', date:'Aug 31 Mon', acct:'sp',  type:'normal',    name:'Transfer $1,000 → Spending',  tag:'Spending',       sub:'Fund September discretionary', amt:'transfer', amtCls:'transfer' },
        ],
      },
    ],
  },
  {
    id: 'sep',
    name: 'September 2026',
    income: 'Income: $13,350 (incl. $2,800 bonus)',
    note: 'Apex $7,400 · Stearns $4,950 · CS $1,000 · House hunt begins · $55k reserved',
    phase: { cls: 'phase3', text: 'House hunt active. $55k fully reserved — untouchable. Both car loans current. Maintain discipline through Oct close.' },
    milestone: 'September complete — $55k locked · score 700+ target · $2,257/mo surplus tracking · Active house offers ✓',
    footer: [
      { acct: 'atn', bal: '~$4,000 est.', ok: true },
      { acct: 'ap',  bal: '~$150 est.',   ok: true },
      { acct: 'sp',  bal: '~$900 est.',   ok: true },
      { acct: 'cs',  bal: '~$1,300 est.', ok: true },
    ],
    weeks: [
      {
        label: 'September 1–5 · Rent · Bills',
        events: [
          { id:'ev74', date:'Sep 1 Tue',  acct:'atn', type:'normal',    name:'Rent',                        tag:'Above the Norm', amt:'-$1,910', amtCls:'expense' },
          { id:'ev75', date:'Sep 2 Wed',  acct:'ap',  type:'normal',    name:'Amazon - Dani',               tag:'Autopay',        amt:'-$16',   amtCls:'expense' },
          { id:'ev76', date:'Sep 3 Thu',  acct:'ap',  type:'normal',    name:"Renter's Insurance",          tag:'Autopay',        amt:'-$85',   amtCls:'expense' },
          { id:'ev77', date:'Sep 4 Fri',  acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev78', date:'Sep 4 Fri',  acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev79', date:'Sep 5 Sat',  acct:'ap',  type:'normal',    name:'Cell Phone',                  tag:'Autopay',        amt:'-$350',  amtCls:'expense' },
        ],
      },
      {
        label: 'September 6–13 · Insurance · Transfer · Spotify',
        events: [
          { id:'ev80', date:'Sep 9 Wed',  acct:'ap',  type:'normal',    name:'Auto Insurance',              tag:'Autopay',        amt:'-$300',  amtCls:'expense' },
          { id:'ev81', date:'Sep 10 Thu', acct:'ap',  type:'normal',    name:'Spotify',                     tag:'Autopay',        amt:'-$25',   amtCls:'expense' },
          { id:'ev82', date:'Sep 12 Sat', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev83', date:'Sep 12 Sat', acct:'atn', type:'normal',    name:'Transfer $600 → Autopay',     tag:'Autopay',        sub:'Top up before mid-month bill cluster', amt:'transfer', amtCls:'transfer' },
        ],
      },
      {
        label: 'September 14–20 · Apex paycheck · Auto loans · Bill cluster',
        events: [
          { id:'ev84', date:'Sep 15 Tue', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev85', date:'Sep 15 Tue', acct:'atn', type:'normal',    name:'Yost',                        tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev86', date:'Sep 16 Wed', acct:'atn', type:'normal',    name:'Auto Loan - Mike',            tag:'Above the Norm', amt:'-$725',  amtCls:'expense' },
          { id:'ev87', date:'Sep 18 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev88', date:'Sep 18 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev89', date:'Sep 19 Sat', acct:'ap',  type:'normal',    name:'Auto Loan - Dani',            tag:'Autopay',        amt:'-$750',  amtCls:'expense' },
          { id:'ev90', date:'Sep 20 Sun', acct:'ap',  type:'normal',    name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', amt:'-$394', amtCls:'expense' },
        ],
      },
      {
        label: 'September 21–30 · Final bills · Apex BONUS · Dani paycheck',
        events: [
          { id:'ev91', date:'Sep 22 Tue', acct:'ap',  type:'normal',    name:'Internet',                    tag:'Autopay',        amt:'-$65',   amtCls:'expense' },
          { id:'ev92', date:'Sep 24 Thu', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev93', date:'Sep 25 Fri', acct:'atn', type:'normal',    name:'MN 529',                      tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev94', date:'Sep 25 Fri', acct:'ap',  type:'normal',    name:'AppleCare',                   tag:'Autopay',        amt:'-$15',   amtCls:'expense' },
          { id:'ev95', date:'Sep 26 Sat', acct:'ap',  type:'normal',    name:'Blink',                       tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev96', date:'Sep 29 Tue', acct:'ap',  type:'normal',    name:'Ring Cam',                    tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev97', date:'Sep 30 Wed', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev98', date:'Sep 30 Wed', acct:'atn', type:'milestone', name:'Apex BONUS — save all',       tag:'BONUS',          sub:'Add to moving fund / extra cushion on top of the $55k already reserved.', amt:'+$2,800 → SAVE', amtCls:'save' },
          { id:'ev99', date:'Sep 30 Wed', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev100',date:'Sep 30 Wed', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev101',date:'Sep 30 Wed', acct:'sp',  type:'normal',    name:'Transfer $1,000 → Spending',  tag:'Spending',       sub:'Fund October discretionary', amt:'transfer', amtCls:'transfer' },
        ],
      },
    ],
  },
  {
    id: 'oct',
    name: 'October 2026',
    income: 'Income: $13,350 (incl. $2,800 bonus)',
    note: 'Apex $7,400 · Stearns $4,950 · CS $1,000 · Ready to buy Oct/Nov',
    phase: { cls: 'phase3', text: 'Ready to buy. $55k locked since Aug 14. Score 700+ target achieved. Surplus $2,257/mo ongoing. Make an offer when the right house appears.' },
    milestone: 'October complete — $0 card debt since Jun 13 · $30k down payment ready · $25k cushion secured · $11,283+ extra buffer · $2,257/mo ongoing surplus · Ready to buy ✓',
    footer: [
      { acct: 'atn', bal: '$55k reserved + $11k+ buffer', ok: true },
      { acct: 'ap',  bal: '~$150 · $0 debt',              ok: true },
      { acct: 'sp',  bal: '~$900 est.',                   ok: true },
      { acct: 'cs',  bal: '~$1,300 · Above floor ✓',      ok: true },
    ],
    weeks: [
      {
        label: 'October 1–5 · Rent · Dani paycheck · Bills',
        events: [
          { id:'ev102',date:'Oct 1 Thu',  acct:'atn', type:'normal',    name:'Rent',                        tag:'Above the Norm', amt:'-$1,910', amtCls:'expense' },
          { id:'ev103',date:'Oct 2 Fri',  acct:'ap',  type:'normal',    name:'Amazon - Dani',               tag:'Autopay',        amt:'-$16',   amtCls:'expense' },
          { id:'ev104',date:'Oct 2 Fri',  acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev105',date:'Oct 2 Fri',  acct:'ap',  type:'normal',    name:"Renter's Insurance",          tag:'Autopay',        amt:'-$85',   amtCls:'expense' },
          { id:'ev106',date:'Oct 2 Fri',  acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev107',date:'Oct 5 Mon',  acct:'ap',  type:'normal',    name:'Cell Phone',                  tag:'Autopay',        amt:'-$350',  amtCls:'expense' },
        ],
      },
      {
        label: 'October 6–13 · Insurance · Spotify',
        events: [
          { id:'ev108',date:'Oct 9 Fri',  acct:'ap',  type:'normal',    name:'Auto Insurance',              tag:'Autopay',        amt:'-$300',  amtCls:'expense' },
          { id:'ev109',date:'Oct 10 Sat', acct:'ap',  type:'normal',    name:'Spotify',                     tag:'Autopay',        amt:'-$25',   amtCls:'expense' },
          { id:'ev110',date:'Oct 10 Sat', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
        ],
      },
      {
        label: 'October 14–21 · Apex paycheck · Auto loans · Bill cluster',
        events: [
          { id:'ev111',date:'Oct 15 Thu', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev112',date:'Oct 20 Tue', acct:'ap',  type:'normal',    name:'Electricity + Student Loan + Gym + Amazon Mike', tag:'Autopay', amt:'-$394', amtCls:'expense' },
        ],
      },
      {
        label: 'October 22–31 · Final bills · Dani paycheck · Apex paycheck + BONUS',
        events: [
          { id:'ev113',date:'Oct 22 Thu', acct:'ap',  type:'normal',    name:'Internet',                    tag:'Autopay',        amt:'-$65',   amtCls:'expense' },
          { id:'ev114',date:'Oct 23 Fri', acct:'atn', type:'milestone', name:'Stearns paycheck — Dani',     tag:'Above the Norm', amt:'+$1,650', amtCls:'income' },
          { id:'ev115',date:'Oct 23 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
          { id:'ev116',date:'Oct 25 Sun', acct:'atn', type:'normal',    name:'MN 529',                      tag:'Above the Norm', amt:'-$100',  amtCls:'expense' },
          { id:'ev117',date:'Oct 25 Sun', acct:'ap',  type:'normal',    name:'AppleCare',                   tag:'Autopay',        amt:'-$15',   amtCls:'expense' },
          { id:'ev118',date:'Oct 26 Mon', acct:'ap',  type:'normal',    name:'Blink',                       tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev119',date:'Oct 29 Thu', acct:'ap',  type:'normal',    name:'Ring Cam',                    tag:'Autopay',        amt:'-$12',   amtCls:'expense' },
          { id:'ev120',date:'Oct 30 Fri', acct:'atn', type:'milestone', name:'Apex paycheck',               tag:'Above the Norm', amt:'+$2,300', amtCls:'income' },
          { id:'ev121',date:'Oct 30 Fri', acct:'atn', type:'milestone', name:'Apex BONUS — save all',       tag:'BONUS',          sub:'Add to moving fund / extra cushion on top of the $55k already reserved. Running surplus now $11,283+ beyond down payment target.', amt:'+$2,800 → SAVE', amtCls:'save' },
          { id:'ev122',date:'Oct 30 Fri', acct:'cs',  type:'normal',    name:'Child support payment',       tag:'Child Support',  amt:'+~$200', amtCls:'income' },
        ],
      },
    ],
  },
]

// ── tag → style map ────────────────────────────────────────
function tagClass(tag) {
  if (!tag) return ''
  const t = tag.toLowerCase()
  if (t.includes('above') || t.includes('atn')) return s.tagAtn
  if (t.includes('autopay') || t.includes('ap'))  return s.tagAp
  if (t.includes('spending') || t.includes('sp'))  return s.tagSp
  if (t.includes('child support') || t.includes('cs')) return s.tagCs
  if (t.includes('card paid') || t.includes('payoff')) return s.tagPayoff
  if (t.includes('bonus'))    return s.tagBonus
  if (t.includes('house'))    return s.tagHouse
  if (t.includes('score') || t.includes('now') || t.includes('today')) return s.tagNow
  return s.tagDefault
}

// ── main component ─────────────────────────────────────────
export default function BudgetCalendar() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })

  const total = MONTHS.reduce((s, m) => s + m.weeks.reduce((ws, w) => ws + w.events.length, 0), 0)
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

  const resetAll = () => {
    if (!window.confirm('Clear all checkmarks?')) return
    setChecked({})
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <SwShell>
      {/* ── page head ── */}
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Budget Calendar</div>
          <h1 className={s.title}>Jun 13 → Oct 2026</h1>
          <div className={s.subtitle}>4 accounts · Citi paid off today · House closes ~Aug 14 · Ready to buy Oct/Nov</div>
        </div>
        <div className={s.summary}>
          <div className={s.stat}><div className={s.statKey}>Events</div><div className={s.statVal}>{total}</div></div>
          <div className={s.stat}><div className={s.statKey}>Done</div><div className={`${s.statValIn} ${s.statVal}`}>{done}</div></div>
          <div className={s.stat}><div className={s.statKey}>Remaining</div><div className={s.statVal}>{total - done}</div></div>
        </div>
      </div>

      {/* ── progress strip ── */}
      <div className={s.progressStrip}>
        <span className={s.progressLabel}>Progress</span>
        <div className={s.progressTrack}>
          <div className={s.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={s.progressCount}>{done} / {total} done</span>
        <button className={s.resetBtn} onClick={resetAll}>Reset all</button>
      </div>

      {/* ── today payoff banner ── */}
      <div className={s.payoffBanner}>
        <span>TODAY — Pay off Citi $1,719.84 immediately. Use: Above the Norm $711 + Personal Savings $929 + Spending $80 = $1,720. Card is $0. Score boost incoming.</span>
        <div className={s.payoffRight}>Savings buffer: $7,403 → $5,683 after payoff<br />Still covers $30k down + $25k cushion from house proceeds ✓</div>
      </div>

      {/* ── account legend ── */}
      <div className={s.legend}>
        {Object.entries(ACCT).map(([key, a]) => (
          <div key={key} className={s.legendItem} style={{ '--acct-color': a.color, '--acct-bg': a.bg }}>
            <div className={s.legendDot} />
            <div className={s.legendInfo}>
              <div className={s.legendName}>{a.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── months ── */}
      <div className={s.months}>
        {MONTHS.map(month => (
          <div key={month.id} className={s.month}>
            {/* month header */}
            <div className={s.monthHead}>
              <div className={s.monthName}>{month.name}</div>
              <div className={s.monthMeta}>
                <div className={s.monthIncome}>{month.income}</div>
                <div className={s.monthNote}>{month.note}</div>
              </div>
            </div>

            {/* phase banner */}
            <div className={`${s.phaseBanner} ${s[month.phase.cls]}`}>{month.phase.text}</div>

            {/* weeks */}
            {month.weeks.map((week, wi) => (
              <div key={wi} className={s.week}>
                <div className={s.weekLabel}>{week.label}</div>
                {week.events.map(ev => {
                  const isDone = !!checked[ev.id]
                  const acct   = ACCT[ev.acct] || ACCT.atn
                  return (
                    <div
                      key={ev.id}
                      className={[
                        s.event,
                        ev.type === 'today'     ? s.eventToday     : '',
                        ev.type === 'payoff'    ? s.eventPayoff    : '',
                        ev.type === 'milestone' ? s.eventMilestone : '',
                        isDone                  ? s.eventDone      : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => toggle(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggle(ev.id) }}
                    >
                      <div className={`${s.check} ${isDone ? s.checkDone : ''}`} aria-hidden="true">
                        {isDone && <span>✓</span>}
                      </div>
                      <span className={s.evDate}>{ev.date.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && ev.date.includes('\n') ? <br /> : ''}</span>)}</span>
                      <div className={s.evDot} style={{ background: acct.color }} />
                      <div className={s.evBody}>
                        <div className={s.evName}>
                          {ev.name}
                          {ev.tag && <span className={`${s.tag} ${tagClass(ev.tag)}`}>{ev.tag}</span>}
                        </div>
                        {ev.sub && <div className={s.evSub}>{ev.sub}</div>}
                      </div>
                      <span className={`${s.evAmt} ${s[`amt-${ev.amtCls}`] || ''}`}>{ev.amt}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* savings impact */}
            {month.savings && (
              <div className={s.savingsImpact}>
                <span>{month.savings}</span>
                <span>{month.savingsRight}</span>
              </div>
            )}

            {/* milestone bar */}
            {month.milestone && (
              <div className={s.milestoneBar}>{month.milestone}</div>
            )}

            {/* month footer */}
            <div className={s.monthFooter}>
              {month.footer.map(f => {
                const a = ACCT[f.acct]
                return (
                  <div key={f.acct}>
                    <div className={s.footerLabel}>
                      <div className={s.footerDot} style={{ background: a.color }} />
                      {a.label.split(' ·')[0]}
                    </div>
                    <div className={`${s.footerBal} ${f.ok ? s.footerBalOk : s.footerBalWarn}`}>{f.bal}</div>
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
