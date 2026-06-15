import {
  mockDashboard, mockTransactions, mockForecast,
  mockAccounts, mockBudgets, mockCalendar,
  mockUpdateTransaction, mockUpdateAccount,
  mockCreateBudget, mockUpdateBudget, mockDeleteBudget,
  mockCreateRecurring, mockUpdateRecurring, mockDeleteRecurring,
  mockAccountForecast,
} from './mock'

const BASE    = import.meta.env.VITE_API_URL || ''
const USE_MOCK = !BASE

function getToken() {
  try { return localStorage.getItem('lumen_token') } catch { return null }
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  let data
  try { data = await res.json() } catch { data = {} }
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed')
    err.status = res.status
    throw err
  }
  return data
}

const mock = (fn) => Promise.resolve(fn())

// Expose raw request for direct endpoint calls
export { request }

export const api = {
  // ── dashboard / forecast ──
  dashboard: ()     => USE_MOCK ? mock(mockDashboard) : request('/api/dashboard'),
  forecast:  (days) => USE_MOCK ? mock(() => mockForecast(days)) : request(`/api/forecast?days=${days || 90}`),

  // ── transactions ──
  transactions:      (q = '')   => USE_MOCK ? mock(mockTransactions) : request(`/api/transactions${q}`),
  updateTransaction: (id, body) => USE_MOCK ? mock(() => mockUpdateTransaction(id, body)) : request(`/api/transactions/${id}`, { method: 'PATCH', body }),

  // ── accounts ──
  accounts:      ()         => USE_MOCK ? mock(mockAccounts)               : request('/api/accounts'),
  updateAccount: (id, body) => USE_MOCK ? mock(() => mockUpdateAccount(id, body)) : request(`/api/accounts/${id}`, { method: 'PATCH', body }),

  // ── plaid ──
  plaidLinkToken: ()     => USE_MOCK ? mock(() => ({ link_token: null }))  : request('/api/plaid/link-token', { method: 'POST' }),
  plaidExchange:  (body) => USE_MOCK ? mock(() => ({ success: true }))     : request('/api/plaid/exchange',    { method: 'POST', body }),
  plaidSync:      ()     => USE_MOCK ? mock(() => ({ success: true }))     : request('/api/plaid/sync',        { method: 'POST' }),

  // ── budgets ──
  budgets:             ()         => USE_MOCK ? mock(mockBudgets)                 : request('/api/budgets'),
  createBudget:        (body)     => USE_MOCK ? mock(() => mockCreateBudget(body)): request('/api/budgets', { method: 'POST', body }),
  updateBudget:        (id, body) => USE_MOCK ? mock(() => mockUpdateBudget(id, body)) : request(`/api/budgets/${id}`, { method: 'PATCH', body }),
  deleteBudget:        (id)       => USE_MOCK ? mock(() => mockDeleteBudget(id))  : request(`/api/budgets/${id}`, { method: 'DELETE' }),
  autoOptimizeBudgets: ()         => USE_MOCK ? mock(() => ({ suggestions: [], summary: 'Mock mode.' })) : request('/api/budgets/auto-optimize', { method: 'POST' }),

  // ── calendar / recurring ──
  calendar:        ()         => USE_MOCK ? mock(mockCalendar)                    : request('/api/calendar'),
  accountForecast: ()         => USE_MOCK ? mock(mockAccountForecast)             : request('/api/calendar/forecast'),
  createRecurring: (body)     => USE_MOCK ? mock(() => mockCreateRecurring(body)) : request('/api/calendar', { method: 'POST', body }),
  updateRecurring: (id, body) => USE_MOCK ? mock(() => mockUpdateRecurring(id, body)) : request(`/api/calendar/${id}`, { method: 'PATCH', body }),
  deleteRecurring: (id)       => USE_MOCK ? mock(() => mockDeleteRecurring(id))   : request(`/api/calendar/${id}`, { method: 'DELETE' }),

  // ── snapshot (Share with Claude) ──
  snapshot: () => USE_MOCK
    ? mock(() => ({ error: 'Snapshot not available in mock mode.' }))
    : request('/api/snapshot'),
}
