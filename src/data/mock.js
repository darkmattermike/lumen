/* Mock data shaped exactly like the live Lumen API responses, with
   dates anchored to "today" so the runway, hero and feeds all line up.
   Used automatically whenever VITE_API_URL is not set. */

const ymd = (d) => {
  const z = new Date(d)
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`
}
const shift = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d }

export function mockDashboard() {
  return {
    balance: 4318.77,
    freeToSpend: 2216,
    balanceAfterPlans: 2216,
    activePlans: [],
    monthSpent: 1842.55,
    monthIncome: 3200,
    pressureLabel: 'SAFE',
    pressureScore: 26,
    committedBills: 2535.49,
    windows: [{
      nextPay: { amount: 3200, daysUntil: 9 },
      billsTotal: 2535.49,
      startDate: ymd(shift(0)),
      endDate: ymd(shift(9)),
    }],
    nextPaycheck: { amount: 3200, daysUntil: 9 },
    upcomingBills: [
      { id: 1, name: 'Netflix',            amount: 15.49, type: 'expense', daysUntil: 2,  category: 'Subscriptions' },
      { id: 2, name: 'City Power & Light', amount: 120,   type: 'expense', daysUntil: 4,  category: 'Utilities'     },
      { id: 3, name: 'Paycheck',           amount: 3200,  type: 'income',  daysUntil: 9,  category: 'Income'        },
      { id: 4, name: 'Rent',               amount: 2400,  type: 'expense', daysUntil: 10, category: 'Housing'       },
    ],
  }
}

export function mockTransactions() {
  let id = 1
  const tx = []
  const add = (daysAgo, name, amount, category) => {
    tx.push({
      id: id++, name, cleaned_name: name, amount,
      date: ymd(shift(-daysAgo)), category,
      tx_type: amount > 0 ? 'income' : 'expense',
    })
  }
  // today — totals $98.70 spent
  add(0, 'Whole Foods Market', -84.20, 'Groceries')
  add(0, 'Blue Bottle Coffee',  -6.50, 'Coffee')
  add(0, 'Cafe Verve',          -8.00, 'Coffee')
  // recent days
  add(1, 'Lyft',          -23.40, 'Transport')
  add(1, 'Spotify',       -11.99, 'Subscriptions')
  add(2, "Trader Joe's",  -52.10, 'Groceries')
  add(3, 'Shell',         -44.30, 'Gas')
  add(3, 'Amazon',        -31.20, 'Shopping')
  add(4, 'Chipotle',      -14.85, 'Dining')
  add(5, 'Target',        -68.40, 'Shopping')
  add(6, 'Electric',      -30.00, 'Utilities')
  add(7, 'Gym',           -29.00, 'Health')
  add(8, 'Nopa',          -72.00, 'Dining')
  return { currentMonth: tx, historical: [] }
}

export function mockForecast(days = 28) {
  const start = 4318.77
  const pace = 58
  const events = {
    2:  [{ name: 'Netflix',            amount: 15.49, type: 'expense' }],
    4:  [{ name: 'City Power & Light', amount: 120,   type: 'expense' }],
    9:  [{ name: 'Paycheck',           amount: 3200,  type: 'income'  }],
    10: [{ name: 'Rent',               amount: 2400,  type: 'expense' }],
  }
  const points = []
  let bal = start
  for (let i = 1; i <= days; i++) {
    bal -= pace
    const evs = events[i] || []
    for (const e of evs) bal += e.type === 'income' ? e.amount : -e.amount
    points.push({ date: ymd(shift(i)), balance: Math.round(bal * 100) / 100, events: evs })
  }
  return {
    points,
    startBalance: start,
    dailyPace: pace,
    minBalance: Math.min(...points.map(p => p.balance)),
    minDate: '',
    crunches: [],
    threshold: 500,
    days,
  }
}
