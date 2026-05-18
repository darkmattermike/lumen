const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('lumen_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Auth
  register:      (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:         (body) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:            ()     => request('/api/auth/me'),

  // Plaid
  getLinkToken:  ()     => request('/api/plaid/link-token', { method: 'POST' }),
  exchangeToken: (body) => request('/api/plaid/exchange',   { method: 'POST', body: JSON.stringify(body) }),
  syncPlaid:     ()     => request('/api/plaid/sync',       { method: 'POST' }),

  // Data
  dashboard:     ()     => request('/api/dashboard'),
  accounts:      ()     => request('/api/accounts'),
  transactions:  (params = '') => request(`/api/transactions${params}`),
  budgets:              ()     => request('/api/budgets'),
  createBudget:         (body) => request('/api/budgets', { method: 'POST', body: JSON.stringify(body) }),
  deleteBudget:         (id)   => request(`/api/budgets/${id}`, { method: 'DELETE' }),
  budgetTransactions:   (id)   => request(`/api/budgets/${id}/transactions`),
  calendar:      ()     => request('/api/calendar'),
  analytics:     ()     => request('/api/analytics'),
}
