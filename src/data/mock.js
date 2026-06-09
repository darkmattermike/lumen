/* Mock data shaped exactly like the live Lumen API. A small in-memory store
   backs the four data pages so create/edit/delete behave for real when running
   standalone (no VITE_API_URL). Resets on page reload. */

const ymd = (d) => {
  const z = new Date(d)
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`
}
const shift = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d }
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

/* ───────────────────────── stores ───────────────────────── */
let _tx = (() => {
  let id = 1
  const rows = []
  const add = (daysAgo, name, amount, category) => rows.push({
    id: id++, name, cleaned_name: name, amount, date: ymd(shift(-daysAgo)),
    category, tx_type: amount > 0 ? 'income' : 'expense',
    account_name: 'Everyday Checking', account_mask: '4821', account_institution: 'Chase', account_icon: '🏦',
  })
  add(0, 'Whole Foods Market', -84.20, 'Groceries')
  add(0, 'Blue Bottle Coffee',  -6.50, 'Coffee')
  add(0, 'Cafe Verve',          -8.00, 'Coffee')
  add(1, 'Lyft',          -23.40, 'Transport')
  add(1, 'Spotify',       -11.99, 'Subscriptions')
  add(2, "Trader Joe's",  -52.10, 'Groceries')
  add(3, 'Shell',         -44.30, 'Gas')
  add(3, 'Amazon',        -31.20, 'Shopping')
  add(4, 'Chipotle',      -14.85, 'Dining')
  add(5, 'Paycheck',     1600.00, 'Income')
  add(5, 'Target',        -68.40, 'Shopping')
  add(6, 'Electric',      -30.00, 'Utilities')
  add(7, 'Gym',           -29.00, 'Health')
  add(8, 'Nopa',          -72.00, 'Dining')
  return rows
})()

let _accounts = [
  { id: 1, name: 'Everyday Checking',  type: 'depository', balance: 4318.77,  mask: '4821', institution: 'Chase',       icon: '🏦', is_debt: false, include_in_balance: true,  forecast_role: 'protected', interest_rate: 0,    limit_amt: 0,    minimum_payment: 0 },
  { id: 2, name: 'High-Yield Savings', type: 'depository', balance: 12850.00, mask: '9930', institution: 'Ally',        icon: '🐷', is_debt: false, include_in_balance: true,  forecast_role: 'source',    interest_rate: 4.2,  limit_amt: 0,    minimum_payment: 0 },
  { id: 3, name: 'Sapphire Card',      type: 'credit',     balance: 1284.55,  mask: '1102', institution: 'Chase',       icon: '💳', is_debt: true,  include_in_balance: false, forecast_role: 'ignore',    interest_rate: 22.9, limit_amt: 8000, minimum_payment: 40 },
  { id: 4, name: 'Auto Loan',          type: 'loan',       balance: 9750.00,  mask: '7741', institution: 'Capital One', icon: '🚗', is_debt: true,  include_in_balance: false, forecast_role: 'ignore',    interest_rate: 6.1,  limit_amt: 0,    minimum_payment: 312 },
]

let _budgets = [
  { id: 1, name: 'Groceries',     cap: 600, icon: '🛒', color: 'safe', period: 'monthly' },
  { id: 2, name: 'Dining',        cap: 300, icon: '🍽️', color: 'warn', period: 'monthly' },
  { id: 3, name: 'Transport',     cap: 150, icon: '⛽', color: 'safe', period: 'monthly' },
  { id: 4, name: 'Shopping',      cap: 250, icon: '🛍️', color: 'safe', period: 'monthly' },
  { id: 5, name: 'Subscriptions', cap:  80, icon: '🎬', color: 'safe', period: 'monthly' },
]

let _recurring = [
  { id: 1, name: 'Rent',              amount: 2400,  day_of_month: 1,  type: 'expense', icon: '🏠', category: 'Housing',       active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 2, name: 'Gym',               amount: 29,    day_of_month: 5,  type: 'expense', icon: '🏋️', category: 'Health',        active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 3, name: 'Internet',          amount: 70,    day_of_month: 8,  type: 'expense', icon: '🌐', category: 'Utilities',     active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 4, name: 'Netflix',           amount: 15.49, day_of_month: 12, type: 'expense', icon: '🎬', category: 'Subscriptions', active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 5, name: 'Paycheck',          amount: 3200,  day_of_month: 15, type: 'income',  icon: '💰', category: 'Income',        active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 6, name: 'City Power & Light', amount: 120,  day_of_month: 18, type: 'expense', icon: '⚡', category: 'Utilities',     active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 7, name: 'Spotify',           amount: 11.99, day_of_month: 20, type: 'expense', icon: '🎵', category: 'Subscriptions', active: true, frequency: 'monthly', start_date: null, account_id: 1 },
  { id: 8, name: 'Car Payment',       amount: 312,   day_of_month: 25, type: 'expense', icon: '🚗', category: 'Transport',     active: true, frequency: 'monthly', start_date: null, account_id: 1 },
]

const nextId = (arr) => (arr.reduce((m, x) => Math.max(m, x.id), 0) + 1)

/* ───────────────────────── dashboard / forecast ───────────────────────── */
export function mockDashboard() {
  return {
    balance: 4318.77, freeToSpend: 2216, balanceAfterPlans: 2216, activePlans: [],
    monthSpent: 1842.55, monthIncome: 3200, pressureLabel: 'SAFE', pressureScore: 26, committedBills: 2535.49,
    windows: [{ nextPay: { amount: 3200, daysUntil: 9 }, billsTotal: 2535.49, startDate: ymd(shift(0)), endDate: ymd(shift(9)) }],
    nextPaycheck: { amount: 3200, daysUntil: 9 },
    upcomingBills: [
      { id: 1, name: 'Netflix',            amount: 15.49, type: 'expense', daysUntil: 2,  category: 'Subscriptions' },
      { id: 2, name: 'City Power & Light', amount: 120,   type: 'expense', daysUntil: 4,  category: 'Utilities'     },
      { id: 3, name: 'Paycheck',           amount: 3200,  type: 'income',  daysUntil: 9,  category: 'Income'        },
      { id: 4, name: 'Rent',               amount: 2400,  type: 'expense', daysUntil: 10, category: 'Housing'       },
    ],
  }
}

export function mockForecast(days = 28) {
  const start = 4318.77, pace = 58
  const events = { 2: [{ name: 'Netflix', amount: 15.49, type: 'expense' }], 4: [{ name: 'City Power & Light', amount: 120, type: 'expense' }], 9: [{ name: 'Paycheck', amount: 3200, type: 'income' }], 10: [{ name: 'Rent', amount: 2400, type: 'expense' }] }
  const points = []; let bal = start
  for (let i = 1; i <= days; i++) {
    bal -= pace
    const evs = events[i] || []
    for (const e of evs) bal += e.type === 'income' ? e.amount : -e.amount
    points.push({ date: ymd(shift(i)), balance: Math.round(bal * 100) / 100, events: evs })
  }
  return { points, startBalance: start, dailyPace: pace, minBalance: Math.min(...points.map(p => p.balance)), minDate: '', crunches: [], threshold: 500, days }
}

/* ───────────────────────── transactions ───────────────────────── */
export function mockTransactions() {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const inMonth = (t) => new Date(t.date) >= monthStart
  const currentMonth = _tx.filter(inMonth)
  const historical = _tx.filter((t) => !inMonth(t))
  const income = currentMonth.filter(t => t.amount > 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const spending = currentMonth.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  return {
    currentMonth, historical,
    totals: { income, spending, count: currentMonth.length },
    pagination: { page: 0, pageSize: 50, total: historical.length, hasMore: false },
    dailyCumulative: [], lastMonthSpend: 1620.40,
  }
}

export function mockUpdateTransaction(id, body) {
  const t = _tx.find(x => String(x.id) === String(id))
  if (t) Object.assign(t, body)
  return t || {}
}

/* ───────────────────────── accounts ───────────────────────── */
export function mockAccounts() {
  const netWorth = _accounts.reduce((s, a) => a.is_debt ? s - Number(a.balance) : s + Number(a.balance), 0)
  return { accounts: _accounts.map(a => ({ ...a })), netWorth, lastSynced: new Date().toISOString() }
}

export function mockUpdateAccount(id, body) {
  const a = _accounts.find(x => String(x.id) === String(id))
  if (a) Object.assign(a, body)
  return a ? { ...a } : {}
}

/* ───────────────────────── budgets ───────────────────────── */
function spentFor(name) {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  return _tx
    .filter(t => t.amount < 0 && new Date(t.date) >= monthStart && (t.category || '').toLowerCase() === name.toLowerCase())
    .reduce((s, t) => s + Math.abs(t.amount), 0)
}
export function mockBudgets() {
  const budgets = _budgets.map(b => {
    const spent = spentFor(b.name)
    return { ...b, spent, pct: Math.round((spent / Number(b.cap)) * 100) }
  })
  return { budgets, totalBudgeted: _budgets.reduce((s, b) => s + Number(b.cap), 0), totalSpent: budgets.reduce((s, b) => s + b.spent, 0) }
}
export function mockCreateBudget(body) {
  const b = { id: nextId(_budgets), name: body.name, cap: Number(body.cap), icon: body.icon || '📦', color: body.color || 'safe', period: body.period || 'monthly' }
  _budgets.push(b); return b
}
export function mockUpdateBudget(id, body) {
  const b = _budgets.find(x => String(x.id) === String(id))
  if (b) Object.assign(b, body.cap !== undefined ? { ...body, cap: Number(body.cap) } : body)
  return b || {}
}
export function mockDeleteBudget(id) {
  _budgets = _budgets.filter(x => String(x.id) !== String(id)); return { success: true }
}

/* ───────────────────────── calendar / recurring ───────────────────────── */
export function mockCalendar() {
  const t = today(); const todayDay = t.getDate(); const y = t.getFullYear(); const m = t.getMonth()
  const expanded = _recurring.filter(r => r.active).map(r => ({ ...r, occurrence_date: ymd(new Date(y, m, Math.min(r.day_of_month, 28))), account_name: 'Everyday Checking', account_mask: '4821' }))
  const upcoming = expanded
    .filter(r => r.day_of_month >= todayDay)
    .sort((a, b) => a.day_of_month - b.day_of_month)
    .map(r => {
      const d = new Date(y, m, Math.min(r.day_of_month, 28))
      return { ...r, date: ymd(d), daysUntil: Math.max(0, Math.ceil((d - t) / 86400000)) }
    })
  const remainingBills = upcoming.filter(r => r.type !== 'income').reduce((s, r) => s + Number(r.amount), 0)
  const accounts = _accounts.filter(a => !a.is_debt).map(a => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, mask: a.mask, icon: a.icon, include_in_balance: a.include_in_balance }))
  return { recurring: _recurring.map(r => ({ ...r })), expanded, upcoming, remainingBills, nextPaycheck: upcoming.find(r => r.type === 'income') || null, accounts }
}
export function mockCreateRecurring(body) {
  const r = {
    id: nextId(_recurring), name: body.name, amount: Number(body.amount),
    day_of_month: Number(body.day_of_month) || 1, type: body.type || 'expense',
    icon: body.icon || null, category: body.category || null, active: true,
    frequency: body.frequency || 'monthly', start_date: body.start_date || null, account_id: body.account_id || 1,
  }
  _recurring.push(r); return r
}
export function mockUpdateRecurring(id, body) {
  const r = _recurring.find(x => String(x.id) === String(id))
  if (r) Object.assign(r, body)
  return r || {}
}
export function mockDeleteRecurring(id) {
  _recurring = _recurring.filter(x => String(x.id) !== String(id)); return { success: true }
}

/* ───────────────────────── account cash-flow forecast ─────────────────────────
   Mirrors the backend GET /api/calendar/forecast (buildAccountForecast):
   projects each protected account to the next payday, finds its trough vs a
   cushion, and recommends a transfer from a source account if it would dip. */
function fcFriendly(s) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' }
function fcBizBefore(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00'); let left = n
  while (left > 0) { d.setDate(d.getDate() - 1); const w = d.getDay(); if (w !== 0 && w !== 6) left-- }
  return ymd(d)
}

export function mockAccountForecast() {
  const cushion = 100, settleDays = 2, horizonCap = 35
  const t = today()
  const nonDebt = _accounts.filter(a => !a.is_debt)
  const role = (a) => a.forecast_role || 'ignore'
  const protectedAccts = nonDebt.filter(a => role(a) === 'protected')
  const sourceAccts = nonDebt.filter(a => role(a) === 'source')
  const incomes = _recurring.filter(r => r.active && r.type === 'income')

  if (nonDebt.every(a => !a.forecast_role)) {
    return { horizonDays: 0, nextPayDate: null, settleDays, cushion, hubAccountId: null, stearnsAccountId: null, safeToSave: 0, accounts: [], sources: [], recommendations: [], unconfigured: true }
  }

  // next payday across all income occurrences (this month + next)
  const occurrences = (r) => {
    const out = []
    for (let k = 0; k < 2; k++) {
      const base = new Date(t.getFullYear(), t.getMonth() + k, 1)
      const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
      const d = new Date(base.getFullYear(), base.getMonth(), Math.min(Number(r.day_of_month) || 1, dim))
      if (d >= t) out.push(d)
    }
    return out
  }
  let nextPay = null
  for (const r of incomes) for (const d of occurrences(r)) if (!nextPay || d < nextPay) nextPay = d
  const horizonDays = nextPay ? Math.min(horizonCap, Math.max(1, Math.round((nextPay - t) / 86400000) + 1)) : horizonCap

  const incomeAcctIds = new Set(incomes.map(r => r.account_id).filter(Boolean))
  const hub = protectedAccts.find(a => incomeAcctIds.has(a.id)) || null
  const paceOf = () => 0 // mock keeps it simple — no discretionary pace

  const project = (a) => {
    let bal = Number(a.balance) || 0
    let trough = { balance: bal, date: ymd(t) }, cause = null
    const points = []
    for (let i = 0; i < horizonDays; i++) {
      const d = new Date(t); d.setDate(d.getDate() + i); const dom = d.getDate()
      let delta = 0, dayCause = null
      for (const r of _recurring) {
        if (!r.active || (r.account_id || 1) !== a.id || Number(r.day_of_month) !== dom) continue
        if (r.type === 'income') delta += Number(r.amount)
        else { delta -= Number(r.amount); if (!dayCause || Number(r.amount) > dayCause.amount) dayCause = { name: r.name, amount: Number(r.amount) } }
      }
      bal = Math.round((bal + delta - paceOf()) * 100) / 100
      points.push({ date: ymd(d), balance: bal })
      if (bal < trough.balance) { trough = { balance: bal, date: ymd(d) }; cause = dayCause || cause }
    }
    return { points, trough, cause }
  }

  const ordered = hub ? [hub, ...protectedAccts.filter(a => a.id !== hub.id)] : protectedAccts
  const accounts = [], recommendations = []
  for (const a of ordered) {
    const { points, trough, cause } = project(a)
    const safe = trough.balance >= cushion
    accounts.push({
      id: a.id, name: a.name, type: a.type, icon: a.icon, mask: a.mask,
      role: (hub && a.id === hub.id) ? 'protected+source' : 'protected',
      startBalance: Math.round((Number(a.balance) || 0) * 100) / 100, dailyPace: 0, cushion,
      trough: trough.balance, troughDate: trough.date, safe,
      troughCause: cause ? { name: cause.name, amount: cause.amount } : null, points,
    })
    if (!safe && sourceAccts[0]) {
      const src = sourceAccts[0]
      const amount = Math.ceil((cushion - trough.balance) / 10) * 10
      const sendBy = fcBizBefore(trough.date, settleDays)
      const todayStr = ymd(t)
      const urgent = sendBy < todayStr
      recommendations.push({
        kind: 'transfer', urgent,
        from_account_id: src.id, from_account_name: src.name,
        to_account_id: a.id, to_account_name: a.name,
        amount, trough: trough.balance, trough_date: trough.date,
        send_by: urgent ? todayStr : sendBy,
        reason: `${a.name} dips to $${trough.balance} by ${fcFriendly(trough.date)}${cause ? ` (around ${cause.name} $${cause.amount})` : ''}. Send $${amount} from ${src.name}${urgent ? ' ASAP' : ` by ${fcFriendly(sendBy)}`} so it clears in time.`,
      })
    }
  }
  const hubAcct = accounts.find(a => a.role === 'protected+source')
  const safeToSave = hubAcct ? Math.max(0, Math.floor((hubAcct.trough - cushion) / 10) * 10) : 0
  const sources = sourceAccts.map(a => { const { points, trough } = project(a); return { id: a.id, name: a.name, startBalance: Math.round((Number(a.balance) || 0) * 100) / 100, dailyPace: 0, trough: trough.balance, troughDate: trough.date, points } })

  recommendations.sort((a, b) => String(a.send_by || '').localeCompare(String(b.send_by || '')))
  return { horizonDays, nextPayDate: nextPay ? ymd(nextPay) : null, settleDays, cushion, hubAccountId: hub?.id || null, stearnsAccountId: sourceAccts[0]?.id || null, safeToSave, accounts, sources, recommendations, unconfigured: false }
}
