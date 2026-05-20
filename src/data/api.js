const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('lumen_token')
}

async function request(path, options = {}, _retry = true) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  let data
  try { data = await res.json() } catch { data = {} }

  if (!res.ok) {
    if (res.status === 401 && data?.expired && _retry && window.__lumenRefresh) {
      const newToken = await window.__lumenRefresh()
      if (newToken) return request(path, options, false)
    }
    const err = new Error(data.error || 'Request failed')
    err.status  = res.status
    err.expired = data?.expired
    throw err
  }
  return data
}

export const api = {
  // Auth
  register:      (body) => request('/api/auth/register',   { method: 'POST', body: JSON.stringify(body) }),
  login:         (body) => request('/api/auth/login',      { method: 'POST', body: JSON.stringify(body) }),
  me:            ()     => request('/api/auth/me'),
  refresh:       ()     => request('/api/auth/refresh',    { method: 'POST' }),
  logout:        ()     => request('/api/auth/logout',     { method: 'POST' }),
  logoutAll:     ()     => request('/api/auth/logout-all', { method: 'POST' }),
  sessions:      ()     => request('/api/auth/sessions'),

  // Plaid
  getLinkToken:  ()     => request('/api/plaid/link-token', { method: 'POST' }),
  exchangeToken: (body) => request('/api/plaid/exchange',   { method: 'POST', body: JSON.stringify(body) }),
  syncPlaid:     ()     => request('/api/plaid/sync',       { method: 'POST' }),

  // Data
  dashboard:     ()     => request('/api/dashboard'),
  accounts:      ()     => request('/api/accounts'),
  updateAccount: (id, body) => request(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  transactions:         (params = '') => request(`/api/transactions${params}`),
  updateTransaction:    (id, body)   => request(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  budgets:              ()           => request('/api/budgets'),
  createBudget:         (body)       => request('/api/budgets', { method: 'POST', body: JSON.stringify(body) }),
  updateBudget:         (id, body)   => request(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBudget:         (id)         => request(`/api/budgets/${id}`, { method: 'DELETE' }),
  completeBudget:       (id, completed) => request(`/api/budgets/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  budgetTransactions:   (id)         => request(`/api/budgets/${id}/transactions`),
  calendar:             ()           => request('/api/calendar'),
  createRecurring:      (body)       => request('/api/calendar', { method: 'POST', body: JSON.stringify(body) }),
  updateRecurring:      (id, body)   => request(`/api/calendar/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRecurring:      (id)         => request(`/api/calendar/${id}`, { method: 'DELETE' }),
  analytics:     ()     => request('/api/analytics'),

  // Rules
  rules:         ()     => request('/api/rules'),
  createRule:    (body) => request('/api/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateRule:    (id, body) => request(`/api/rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRule:    (id)   => request(`/api/rules/${id}`, { method: 'DELETE' }),
  applyRules:    ()     => request('/api/rules/apply', { method: 'POST' }),

  // Plans
  plans:       ()           => request('/api/plans'),
  createPlan:  (body)       => request('/api/plans', { method: 'POST', body: JSON.stringify(body) }),
  updatePlan:  (id, body)   => request(`/api/plans/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Settings
  getSettings:      ()     => request('/api/settings'),
  updateProfile:    (body) => request('/api/settings/profile',  { method: 'PATCH', body: JSON.stringify(body) }),
  updatePassword:   (body) => request('/api/settings/password', { method: 'PATCH', body: JSON.stringify(body) }),
  updateKeys:       (body) => request('/api/settings/keys',     { method: 'PATCH', body: JSON.stringify(body) }),

  // Gmail
  gmailAuthUrl:    ()  => request('/api/gmail/auth-url'),
  gmailStatus:     ()  => request('/api/gmail/status'),
  gmailDisconnect: ()  => request('/api/gmail/disconnect', { method: 'DELETE' }),
  gmailScanSubs:        ()    => request('/api/gmail/scan/subscriptions', { method: 'POST' }),
  gmailScanOrders:      ()    => request('/api/gmail/scan/orders',        { method: 'POST' }),
  gmailScanBills:       ()    => request('/api/gmail/scan/bills',         { method: 'POST' }),
  gmailSubscriptions:   ()    => request('/api/gmail/subscriptions'),
  gmailOrders:          ()    => request('/api/gmail/orders'),
  gmailUpdateSub:       (id, body) => request(`/api/gmail/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  gmailUpdateOrder:     (id, body) => request(`/api/gmail/orders/${id}`,        { method: 'PATCH', body: JSON.stringify(body) }),

  // Lumen AI
  lumenInsight:        (body) => request('/api/lumen/insight',            { method: 'POST', body: JSON.stringify(body) }),
  suggestCategories:   ()     => request('/api/lumen/suggest-categories', { method: 'POST' }),
  aiCategorize:        ()     => request('/api/lumen/categorize',         { method: 'POST' }),
  aiBudgetLimits:      ()     => request('/api/lumen/budget-limits',      { method: 'POST' }),
  enrichTransactions:  ()     => request('/api/lumen/enrich',           { method: 'POST' }),
  // Gmail Phase 5
  gmailPhase5Scan:      ()     => request('/api/gmail/scan/phase5',      { method: 'POST' }),
  gmailPriceChanges:    ()     => request('/api/gmail/price-changes'),
  gmailBillSuggestions: ()     => request('/api/gmail/bill-suggestions'),
  gmailPendingCharges:  ()     => request('/api/gmail/pending-charges'),
  gmailUnusedSubs:      ()     => request('/api/gmail/unused-subscriptions'),
  gmailUnsubLink:       (body) => request('/api/gmail/unsubscribe-link',  { method: 'POST', body: JSON.stringify(body) }),
  gmailUpdatePriceChange: (id, body) => request(`/api/gmail/price-changes/${id}`,   { method: 'PATCH', body: JSON.stringify(body) }),
  gmailUpdateBillSug:   (id, body) => request(`/api/gmail/bill-suggestions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  gmailUpdatePending:   (id, body) => request(`/api/gmail/pending-charges/${id}`,  { method: 'PATCH', body: JSON.stringify(body) }),

  // Lumen streaming ask — returns a raw fetch Response for SSE
  lumenAsk: async (message, context_type = 'general') => {
    const token = getToken()
    return fetch(`${BASE}/api/lumen/ask`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, context_type }),
    })
  },
}
