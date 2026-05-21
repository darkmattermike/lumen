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
    // On 429 (rate limited): never log out — just surface a clean error.
    // The user's session is still valid; the server is just throttling.
    if (res.status === 429) {
      const err = new Error('Too many requests. Please slow down.')
      err.status = 429
      err.rateLimited = true
      throw err
    }

    // On 401: attempt silent token refresh before failing.
    // Skip if: this IS the refresh endpoint (avoids infinite loop),
    // or we've already retried once (_retry = false).
    if (res.status === 401 && _retry && !path.includes('/auth/refresh')) {
      if (window.__lumenRefresh) {
        try {
          const newToken = await window.__lumenRefresh()
          if (newToken) {
            // Got a new token — retry the original request with it
            return request(path, options, false)
          }
          // __lumenRefresh returned null — could be a network error or real expiry.
          // AuthContext already handled the session state. Just surface a clean error.
          const logoutErr = new Error('Session expired. Please sign in again.')
          logoutErr.status  = 401
          logoutErr.expired = true
          throw logoutErr
        } catch (refreshErr) {
          // If it's our own formatted error, re-throw it
          if (refreshErr.expired) throw refreshErr
          // Refresh itself threw (network error etc.) — fall through to original error below
          // Do NOT log the user out; they might just be offline temporarily
        }
      }
    }
    const err = new Error(data.error || data.message || 'Request failed')
    err.status  = res.status
    err.expired = data?.expired
    throw err
  }
  return data
}

export const api = {
  // Auth
  register:      (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  googleLogin:   (body) => request('/api/auth/google',    { method: 'POST', body: JSON.stringify(body) }),
  login:         (body) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
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
  budgetHistory:        (id)         => request(`/api/budgets/${id}/history`),
  budgetForecast:       ()           => request('/api/budgets/forecast'),
  budgetPaceCheck:      ()           => request('/api/budgets/pace-check',   { method: 'POST' }),
  budgetAutoComplete:   ()           => request('/api/budgets/auto-complete', { method: 'POST' }),

  // Phase D: Cash Flow Forecast
  forecast:             (days)       => request(`/api/forecast?days=${days||90}`),
  forecastPoints:       (days)       => request(`/api/forecast/points?days=${days||90}`),
  forecastAlerts:       ()           => request('/api/forecast/alerts',           { method: 'POST' }),
  proactiveAlerts:      ()           => request('/api/forecast/proactive-alerts',   { method: 'POST' }),

  // Phase F: Conversational upgrades
  nlQuery:          (body) => request('/api/lumen/query',             { method: 'POST', body: JSON.stringify(body) }),
  purchaseDecision: (body) => request('/api/lumen/purchase-decision', { method: 'POST', body: JSON.stringify(body) }),
  goalPlan:         (body) => request('/api/lumen/goal-plan',         { method: 'POST', body: JSON.stringify(body) }),
  scenario:         (body) => request('/api/lumen/scenario',          { method: 'POST', body: JSON.stringify(body) }),

  // Phase G: Debt Strategy
  debt:                    ()      => request('/api/debt'),
  debtCompare:             (body)  => request('/api/debt/compare',              { method: 'POST', body: JSON.stringify(body) }),
  debtExtraPayment:        (body)  => request('/api/debt/extra-payment',        { method: 'POST', body: JSON.stringify(body) }),
  debtPayoffOpportunities: ()      => request('/api/debt/payoff-opportunities', { method: 'POST' }),
  debtSetMinPayment:       (id, body) => request(`/api/debt/${id}/minimum-payment`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Phase H: Document Intelligence
  uploadDocument:      (formData)    => requestForm('/api/documents/upload', formData),
  uploadBankStatement: (formData)    => requestForm('/api/documents/bank-statement', formData),
  uploadPayStub:       (formData)    => requestForm('/api/documents/pay-stub', formData),
  uploadLoanDoc:       (formData)    => requestForm('/api/documents/loan', formData),
  taxSummary:          (year)        => request(`/api/documents/tax-summary?year=${year||new Date().getFullYear()}`),
  documentHistory:     ()            => request('/api/documents/history'),

  // Phase I: Learning & Personalization
  healthScore:          ()       => request('/api/learn/health'),
  behavioralInsights:   ()       => request('/api/learn/insights'),
  adaptiveSuggestions:  ()       => request('/api/learn/adaptive'),
  applyAdaptive:        (id)     => request(`/api/learn/adaptive/${id}/apply`, { method: 'POST' }),
  runLearning:          ()       => request('/api/learn/run', { method: 'POST' }),

  // New Features
  // Feature 2: Decisions
  decisions:            ()        => request('/api/insights/decisions'),
  createDecision:       (body)    => request('/api/insights/decisions',       { method: 'POST',   body: JSON.stringify(body) }),
  updateDecision:       (id, body)=> request(`/api/insights/decisions/${id}`, { method: 'PATCH',  body: JSON.stringify(body) }),
  deleteDecision:       (id)      => request(`/api/insights/decisions/${id}`, { method: 'DELETE' }),
  decisionOutcome:      (id, body)=> request(`/api/insights/decisions/${id}/outcome`, { method: 'POST', body: JSON.stringify(body) }),
  // Feature 6: Net Worth
  netWorth:             (months)  => request(`/api/insights/net-worth?months=${months||12}`),
  snapshotNetWorth:     ()        => request('/api/insights/net-worth/snapshot', { method: 'POST' }),
  // Feature 7: Bill History
  billHistory:          ()        => request('/api/insights/bill-history'),
  billHistoryAnnual:    ()        => request('/api/insights/bill-history/annual'),
  // Feature 8: DNA
  spendingDna:          ()        => request('/api/insights/dna'),
  generateDna:          (force)   => request('/api/insights/dna/generate', { method: 'POST', body: JSON.stringify({ force: !!force }) }),

  // Pending transactions & merge candidates
  pending:                  ()    => request('/api/pending'),
  scanBankAlerts:           ()    => request('/api/pending/scan', { method: 'POST' }),
  mergeCandidates:          ()    => request('/api/pending/candidates'),
  mergeCandidate:     (id)        => request(`/api/pending/candidates/${id}/merge`,    { method: 'POST' }),
  keepSeparate:       (id)        => request(`/api/pending/candidates/${id}/separate`, { method: 'POST' }),
  dismissPending:     (id)        => request(`/api/pending/${id}`, { method: 'DELETE' }),
  // Feature 9: Lifetime
  lifetimeStats:        ()        => request('/api/insights/lifetime'),
  // Feature 10: Notification Intelligence
  notifFeedback:        (body)    => request('/api/insights/notification-feedback', { method: 'POST', body: JSON.stringify(body) }),
  notifSuppression:     ()        => request('/api/insights/notification-suppression'),
  unsuppressNotif:      (type)    => request(`/api/insights/notification-suppression/${type}/unsuppress`, { method: 'POST' }),

  // Push Notifications
  updateOnboarding: ()      => request('/api/auth/me/onboarding', { method: 'PATCH' }),
  vapidKey:        ()       => request('/api/push/vapid-key'),
  pushSubscribe:   (body)   => request('/api/push/subscribe',  { method: 'POST',   body: JSON.stringify(body) }),
  pushUnsubscribe: (body)   => request('/api/push/subscribe',  { method: 'DELETE', body: JSON.stringify(body) }),
  pushTest:        ()       => request('/api/push/test',       { method: 'POST' }),

  // Reports
  monthlyReport:   (y,m)   => request(`/api/reports/monthly?year=${y}&month=${m}`),
  monthlyReportUrl:(y,m)   => `${BASE}/api/reports/monthly/html?year=${y}&month=${m}`,
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

  // Notifications
  notifications:          ()    => request('/api/notifications'),
  markNotificationRead:   (id)  => request(`/api/notifications/${id}/read`,    { method: 'PATCH' }),
  markAllNotificationsRead: ()  => request('/api/notifications/read-all',       { method: 'PATCH' }),
  dismissNotification:    (id)  => request(`/api/notifications/${id}/dismiss`, { method: 'PATCH' }),

  // Goals
  goals:         ()         => request('/api/goals'),
  createGoal:    (body)     => request('/api/goals',      { method: 'POST',  body: JSON.stringify(body) }),
  updateGoal:    (id, body) => request(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  contributeGoal: (id, body) => request(`/api/goals/${id}/contribute`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteGoal:    (id)       => request(`/api/goals/${id}`, { method: 'DELETE' }),

  // CSV Import
  previewCsv:  (body) => request('/api/import/csv/preview', { method: 'POST', body: JSON.stringify(body) }),
  importCsv:   (body) => request('/api/import/csv',         { method: 'POST', body: JSON.stringify(body) }),
  recategorize: (body) => request('/api/import/csv/recategorize', { method: 'POST', body: JSON.stringify(body) }),

  // Duplicates (Phase B)
  getDuplicates:       ()      => request('/api/duplicates'),
  confirmDuplicate:    (notifId) => request(`/api/duplicates/${notifId}/confirm`, { method: 'POST' }),
  dismissDuplicate:    (notifId) => request(`/api/duplicates/${notifId}/dismiss`, { method: 'POST' }),
}
