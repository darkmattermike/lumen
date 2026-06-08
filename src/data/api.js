import { mockDashboard, mockTransactions, mockForecast } from './mock'

/* If VITE_API_URL is set we hit the real Lumen backend; otherwise we
   serve mock data so the dashboard runs standalone (npm run dev). */
const BASE = import.meta.env.VITE_API_URL || ''
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

export const api = {
  dashboard:    ()       => USE_MOCK ? Promise.resolve(mockDashboard())     : request('/api/dashboard'),
  transactions: (q = '') => USE_MOCK ? Promise.resolve(mockTransactions())  : request(`/api/transactions${q}`),
  forecast:     (days)   => USE_MOCK ? Promise.resolve(mockForecast(days))  : request(`/api/forecast?days=${days || 90}`),
}
