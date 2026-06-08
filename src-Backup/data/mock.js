// ── Bills / upcoming ──────────────────────
export const UPCOMING_BILLS = [
  { id: 1, name: 'Electric',       when: 'May 17 · Today',   amount: '$94',     variant: 'debt' },
  { id: 2, name: 'AT&T Wireless',  when: 'May 20 · 3 days',  amount: '$85',     variant: 'warn' },
  { id: 3, name: 'Spotify',        when: 'May 22 · 5 days',  amount: '$10.99',  variant: 'warn' },
  { id: 4, name: '💰 Paycheck',    when: 'May 24 · 7 days',  amount: '+$2,840', variant: 'safe', highlight: true },
]

// ── Transactions ──────────────────────────
export const TRANSACTIONS = [
  {
    date: 'Today — May 17',
    items: [
      { id: 't1', icon: '⚡', name: 'City Electric Co.',     cat: 'Utilities · Auto-Pay',    amount: '−$94.00',   balance: '$4,218', color: 'var(--debt)' },
      { id: 't2', icon: '🍕', name: "Domino's Pizza",        cat: 'Dining · Card',            amount: '−$28.47',   balance: '$4,312', color: 'var(--debt)' },
    ]
  },
  {
    date: 'Yesterday — May 16',
    items: [
      { id: 't3', icon: '🏦', name: 'Direct Deposit',        cat: 'Income · Paycheck',        amount: '+$2,840.00',balance: '$4,340', color: 'var(--safe)' },
      { id: 't4', icon: '🛒', name: 'Whole Foods Market',    cat: 'Groceries · Card',         amount: '−$112.33',  balance: '$1,500', color: 'var(--debt)' },
      { id: 't5', icon: '🎵', name: 'Spotify',               cat: 'Subscriptions · Auto-Pay', amount: '−$10.99',   balance: '$1,612', color: 'var(--warn)' },
    ]
  },
  {
    date: 'May 15',
    items: [
      { id: 't6', icon: '🏠', name: 'Rent Payment',          cat: 'Housing · Transfer',       amount: '−$1,350.00',balance: '$1,623', color: 'var(--debt)' },
      { id: 't7', icon: '☕', name: 'Blue Bottle Coffee',    cat: 'Dining · Card',            amount: '−$6.75',    balance: '$2,973', color: 'var(--debt)' },
      { id: 't8', icon: '🚗', name: 'Uber',                  cat: 'Transport · App',          amount: '−$18.40',   balance: '$2,980', color: 'var(--debt)' },
      { id: 't9', icon: '🍔', name: 'Chipotle Mexican Grill',cat: 'Dining · Card',            amount: '−$14.95',   balance: '$2,998', color: 'var(--debt)' },
    ]
  },
  {
    date: 'May 14',
    items: [
      { id: 't10',icon: '📺', name: 'Netflix',               cat: 'Subscriptions · Auto-Pay', amount: '−$15.49',   balance: '$3,012', color: 'var(--warn)' },
      { id: 't11',icon: '🛍️', name: 'Amazon',               cat: 'Shopping · Card',          amount: '−$43.99',   balance: '$3,027', color: 'var(--debt)' },
    ]
  },
]

// ── Budget categories ─────────────────────
export const BUDGET_CATEGORIES = [
  {
    id: 'housing',
    icon: '🏠', name: 'Housing', period: 'Monthly · Fixed',
    spent: 1350, cap: 1400, color: 'var(--debt)',
    subs: [{ name: 'Rent', amount: 1350 }],
    warn: null,
  },
  {
    id: 'dining',
    icon: '🍽️', name: 'Dining & Food', period: 'Monthly · Your cap',
    spent: 178, cap: 200, color: 'var(--warn)',
    subs: [{ name: 'Restaurants', amount: 134 }, { name: 'Coffee shops', amount: 44 }],
    warn: '89% used — 13 days remain. Lumen: pace this carefully.',
  },
  {
    id: 'groceries',
    icon: '🛒', name: 'Groceries', period: 'Monthly · Your cap',
    spent: 112, cap: 300, color: 'var(--safe)',
    subs: [{ name: 'Whole Foods', amount: 112 }],
    warn: null,
  },
  {
    id: 'transport',
    icon: '🚗', name: 'Transport', period: 'Monthly · Your cap',
    spent: 68, cap: 80, color: 'var(--warn)',
    subs: [{ name: 'Uber', amount: 68 }],
    warn: null,
  },
  {
    id: 'subscriptions',
    icon: '📱', name: 'Subscriptions', period: 'Monthly · Auto-tracked',
    spent: 37, cap: 60, color: 'var(--calm)',
    subs: [
      { name: 'Spotify', amount: 10.99 },
      { name: 'Netflix', amount: 15.49 },
      { name: 'iCloud+', amount: 10.99 },
    ],
    warn: null,
  },
]

// ── Accounts ──────────────────────────────
export const ACCOUNTS = {
  assets: [
    {
      id: 'chase-checking',
      icon: '🏦', name: 'Chase Checking', type: 'Checking · ····4821',
      balance: '$4,218', balanceColor: 'var(--safe)',
      status: 'Primary', statusColor: 'rgba(93,202,165,0.1)', statusTextColor: 'var(--safe)',
      meta: [
        { label: 'Pending',   value: '$94.00' },
        { label: 'Last Tx',   value: 'Today' },
        { label: '30d Change',value: '+$1,329', valueColor: 'var(--safe)' },
      ]
    },
    {
      id: 'marcus-savings',
      icon: '💰', name: 'Marcus Savings', type: 'High-Yield Savings · ····7203',
      balance: '$8,441', balanceColor: 'var(--calm)',
      status: '4.50% APY', statusColor: 'rgba(108,140,255,0.1)', statusTextColor: 'var(--calm)',
      meta: [
        { label: 'Interest/mo', value: '$31.65', valueColor: 'var(--safe)' },
        { label: 'Goal',        value: '$12,000' },
        { label: 'Progress',    value: '70%', valueColor: 'var(--calm)' },
      ]
    },
  ],
  liabilities: [
    {
      id: 'chase-sapphire',
      icon: '💜', name: 'Chase Sapphire Reserve', type: 'Credit · ····9142 · Visa',
      balance: '$0', balanceColor: 'var(--warn)',
      status: 'Paid in Full', statusColor: 'rgba(93,202,165,0.1)', statusTextColor: 'var(--safe)',
      meta: [
        { label: 'Limit',       value: '$15,000' },
        { label: 'Utilization', value: '0%', valueColor: 'var(--safe)' },
        { label: 'Due',         value: 'Jun 5' },
      ]
    },
    {
      id: 'student-loan',
      icon: '🎓', name: 'Student Loan', type: 'Federal Loan · ····8847',
      balance: '$6,000', balanceColor: 'var(--debt)',
      status: 'Debt', statusColor: 'rgba(232,115,99,0.1)', statusTextColor: 'var(--debt)',
      isDebt: true,
      meta: [
        { label: 'Rate',    value: '5.05%', valueColor: 'var(--debt)' },
        { label: 'Monthly', value: '$212' },
        { label: 'Payoff',  value: '2027' },
      ]
    },
  ]
}

// ── Calendar events ───────────────────────
export const CALENDAR_EVENTS = {
  // key: 'YYYY-MM-DD', value: array of events
  '2025-05-01': [{ type: 'income', label: '💰 Paycheck' }],
  '2025-05-05': [{ type: 'bill',   label: '🏠 Rent' }],
  '2025-05-14': [{ type: 'sub',    label: '📺 Netflix' }],
  '2025-05-16': [{ type: 'income', label: '💰 Paycheck' }],
  '2025-05-17': [{ type: 'bill',   label: '⚡ Electric' }],
  '2025-05-20': [{ type: 'bill',   label: '📱 AT&T' }],
  '2025-05-22': [{ type: 'sub',    label: '🎵 Spotify' }],
  '2025-05-24': [{ type: 'income', label: '💰 Paycheck' }],
  '2025-05-29': [{ type: 'sub',    label: '☁️ iCloud' }],
  '2025-05-31': [{ type: 'bill',   label: '🌐 Internet' }],
}

export const UPCOMING_EVENTS = [
  { date: 'May 17', name: 'Electric Bill',  type: 'Utility · Auto-Pay',       amount: '−$94',    color: 'var(--debt)' },
  { date: 'May 20', name: 'AT&T Wireless',  type: 'Phone · Auto-Pay',         amount: '−$85',    color: 'var(--warn)' },
  { date: 'May 22', name: 'Spotify',        type: 'Subscription · Auto-Pay',  amount: '−$10.99', color: 'var(--warn)' },
  { date: 'May 24', name: '💰 Paycheck',   type: 'Direct Deposit',            amount: '+$2,840', color: 'var(--safe)', highlight: true },
  { date: 'May 29', name: 'iCloud+',        type: 'Subscription · Auto-Pay',  amount: '−$10.99', color: 'var(--warn)' },
  { date: 'May 31', name: 'Internet',       type: 'Utility · Auto-Pay',       amount: '−$79',    color: 'var(--debt)' },
]
