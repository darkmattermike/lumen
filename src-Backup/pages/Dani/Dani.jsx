import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { api } from '../../data/api'
import styles from './Dani.module.css'

const fmt  = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
const today = new Date()

// ── DST-safe biweekly occurrence calculator ───────────────────
function getOccurrenceDaysThisMonth(t) {
  const yr = today.getFullYear(), mo = today.getMonth()
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const freq   = t.recurringFreq || 'monthly'
  const start  = t.recurringStart ? new Date(t.recurringStart + 'T12:00:00') : null

  if (freq === 'monthly') {
    const d = parseInt(t.recurringDay || 0)
    return d >= 1 && d <= daysInMo ? [d] : []
  }
  if (freq === 'annual') {
    return start && start.getMonth() === mo ? [start.getDate()] : []
  }
  if (freq === 'weekly' || freq === 'biweekly') {
    if (!start) { const d = parseInt(t.recurringDay || 0); return d >= 1 && d <= daysInMo ? [d] : [] }
    const interval = freq === 'weekly' ? 7 : 14
    let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const mStart = new Date(yr, mo, 1)
    while (cur >= mStart) cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - interval)
    const days = []
    for (let i = 0; i < 60; i++) {
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + interval)
      if (cur.getFullYear() === yr && cur.getMonth() === mo) days.push(cur.getDate())
      if (cur.getFullYear() > yr || (cur.getFullYear() === yr && cur.getMonth() > mo)) break
    }
    return days
  }
  return []
}

// ── DaniTab ───────────────────────────────────────────────────
function DaniTab({ accounts, recurringItems, tabData, onTabSave, tabKey }) {
  const INCOME_DEDUCTION = 1100

  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    try {
      const v = localStorage.getItem('dani_accountId_' + tabKey)
      if (v) return v
    } catch {}
    return tabData.selectedAccountId || accounts[0]?.id || null
  })

  const [wishlist, setWishlist] = useState(() => {
    try {
      const v = localStorage.getItem('dani_wishlist_' + tabKey)
      if (v) { const p = JSON.parse(v); if (p?.length) return p }
    } catch {}
    return tabData.wishlist || []
  })

  const [formName,    setFormName]    = useState('')
  const [formCost,    setFormCost]    = useState('')
  const [editingId,   setEditingId]   = useState(null)
  const [editingCost, setEditingCost] = useState('')
  const [dragOver,    setDragOver]    = useState(null)
  const dragIdx = useRef(null)

  // Sync from server when data arrives
  const prevRef = useRef(null)
  useEffect(() => {
    const key = JSON.stringify(tabData)
    if (prevRef.current === key) return
    prevRef.current = key
    if (tabData.selectedAccountId) setSelectedAccountId(id => id || tabData.selectedAccountId)
    setWishlist(prev => (!prev.length && tabData.wishlist?.length) ? tabData.wishlist : prev)
  }, [tabData])

  function updateAccount(id) {
    setSelectedAccountId(id)
    try { localStorage.setItem('dani_accountId_' + tabKey, id) } catch {}
    onTabSave({ selectedAccountId: id, wishlist })
  }

  function updateWishlist(next) {
    setWishlist(next)
    try { localStorage.setItem('dani_wishlist_' + tabKey, JSON.stringify(next)) } catch {}
    onTabSave({ selectedAccountId, wishlist: next })
  }

  function addItem() {
    const name = formName.trim(), cost = parseFloat(formCost)
    if (!name || isNaN(cost) || cost <= 0) return
    updateWishlist([...wishlist, { id: `w${Date.now()}`, name, cost, addedAt: Date.now() }])
    setFormName(''); setFormCost('')
  }

  function startEdit(item)    { setEditingId(item.id); setEditingCost(String(item.cost)) }
  function commitEdit(id) {
    const cost = parseFloat(editingCost)
    if (!isNaN(cost) && cost > 0) updateWishlist(wishlist.map(w => w.id === id ? { ...w, cost } : w))
    setEditingId(null); setEditingCost('')
  }
  function markPurchased(id) { updateWishlist(wishlist.filter(w => w.id !== id)) }
  function deleteItem(id)    { updateWishlist(wishlist.filter(w => w.id !== id)) }

  function onDragStart(i) { dragIdx.current = i }
  function onDragEnter(i) { setDragOver(i) }
  function onDragEnd() {
    if (dragIdx.current === null || dragOver === null || dragIdx.current === dragOver) {
      dragIdx.current = null; setDragOver(null); return
    }
    const next = [...wishlist]; const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOver, 0, moved)
    dragIdx.current = null; setDragOver(null)
    updateWishlist(next)
  }

  const account = accounts.find(a => a.id === selectedAccountId) || accounts[0] || null
  const balance = account?.balance ?? 0

  // Free to spend: balance - $100 buffer - upcoming bills + net income
  const { freeToSpend, upcomingBills, nextPayday } = useMemo(() => {
    if (!account) return { freeToSpend: 0, upcomingBills: [], nextPayday: null }
    const todayDay = today.getDate()
    let expenses = 0, incomeNet = 0
    const upcoming = []   // includes both bills AND income

    recurringItems.forEach(t => {
      // Coerce both to string for safe comparison — DB can return int or string
      const acctMatch = !t.accountId || String(t.accountId) === String(account.id)
      if (!acctMatch) return

      const days = getOccurrenceDaysThisMonth(t).filter(d => d > todayDay)
      if (!days.length) return

      days.forEach(d => {
        if (t.amount < 0) {
          // Expense / bill
          expenses += Math.abs(t.amount)
          upcoming.push({ ...t, _day: d, _isIncome: false })
        } else {
          // Income — deduct $1,100 to get Dani's share
          const net = Math.max(0, t.amount - INCOME_DEDUCTION)
          incomeNet += net
          upcoming.push({ ...t, _day: d, _isIncome: true, _net: net })
        }
      })
    })

    upcoming.sort((a, b) => a._day - b._day)

    // Next payday — first upcoming income item
    const nextIncomeItem = upcoming.find(t => t._isIncome)
    const np = nextIncomeItem ? {
      day:      nextIncomeItem._day,
      daysAway: nextIncomeItem._day - todayDay,
      date:     new Date(today.getFullYear(), today.getMonth(), nextIncomeItem._day)
                  .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount:   nextIncomeItem.amount,
      net:      nextIncomeItem._net,
    } : null

    return {
      freeToSpend: Math.max(0, (balance - 100) - expenses + incomeNet),
      upcomingBills: upcoming,
      nextPayday: np,
    }
  }, [account, recurringItems, balance])

  // Wishlist with affordability status
  const wishlistWithStatus = useMemo(() => {
    if (!account) return wishlist.map(w => ({ ...w, status: 'wait' }))
    const todayDay  = today.getDate()
    const yr = today.getFullYear(), mo = today.getMonth()
    const daysInMo  = new Date(yr, mo + 1, 0).getDate()

    // Build day-by-day balance projection
    const baseBalance = {}
    baseBalance[todayDay] = Math.max(0, balance - 100)
    for (let d = todayDay + 1; d <= daysInMo; d++) {
      let delta = 0
      recurringItems.forEach(t => {
        const acctMatch = !t.accountId || String(t.accountId) === String(account.id)
        if (!acctMatch) return
        if (!getOccurrenceDaysThisMonth(t).includes(d)) return
        if (t.amount < 0) delta += t.amount
        else delta += Math.max(0, t.amount - INCOME_DEDUCTION)
      })
      baseBalance[d] = (baseBalance[d - 1] ?? Math.max(0, balance - 100)) + delta
    }

    const committed = {}
    const availableOn = (d) => {
      const base = baseBalance[d] ?? baseBalance[daysInMo] ?? 0
      let used = 0
      for (const [k, v] of Object.entries(committed)) { if (Number(k) <= d) used += v }
      return base - used
    }

    return wishlist.map(item => {
      for (let d = todayDay; d <= daysInMo; d++) {
        const avail = availableOn(d)
        if (avail >= item.cost) {
          committed[d] = (committed[d] || 0) + item.cost
          const after = avail - item.cost
          if (d === todayDay) return { ...item, status: 'now', availableDate: 'Now', balanceAfter: after }
          return {
            ...item, status: 'soon', balanceAfter: after,
            availableDate: new Date(yr, mo, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          }
        }
      }
      return { ...item, status: 'wait', availableDate: null, balanceAfter: null }
    })
  }, [wishlist, account, recurringItems, balance])

  return (
    <div className={styles.tabContent}>
      {/* Account selector */}
      <div className={styles.acctRow}>
        <span className={styles.acctLabel}>Viewing account</span>
        <select className={styles.acctSelect} value={selectedAccountId || ''} onChange={e => updateAccount(e.target.value)}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className={styles.tabGrid}>
        {/* LEFT: Wishlist */}
        <div className={styles.leftCol}>
          {/* Add form */}
          <div className={styles.addForm}>
            <div className={styles.sectionLabel}>Add to Wishlist</div>
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                placeholder="e.g. AirPods Pro"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <input
                className={`${styles.addInput} ${styles.addInputCost}`}
                type="number" min="0" step="0.01" placeholder="Cost"
                value={formCost}
                onChange={e => setFormCost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <button className={styles.addBtn} onClick={addItem}>+ Add</button>
            </div>
          </div>

          {/* Wishlist */}
          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <span className={styles.sectionLabel}>Wishlist</span>
              {wishlist.length > 0 && <span className={styles.listHint}>Drag to reorder priority</span>}
            </div>

            {wishlist.length === 0 ? (
              <div className={styles.listEmpty}>
                <span>🛍️</span>
                <p>Nothing on the wishlist yet</p>
              </div>
            ) : (
              <>
                {wishlistWithStatus.map((item, i) => {
                  const isNow  = item.status === 'now'
                  const isSoon = item.status === 'soon'
                  const isPayment = item.name.toLowerCase().includes('payment')

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragEnter={() => onDragEnter(i)}
                      onDragEnd={onDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className={`${styles.wishItem} ${dragOver === i ? styles.wishItemDragging : ''}`}
                    >
                      <span className={styles.wishDrag}>⠿</span>

                      <div className={`${styles.wishNum} ${isNow ? styles.wishNumNow : isSoon ? styles.wishNumSoon : ''}`}>
                        {i + 1}
                      </div>

                      <div className={styles.wishInfo}>
                        <div className={styles.wishName}>{item.name}</div>
                        <div className={styles.wishMeta}>
                          {isNow ? (
                            <span className={styles.badgeNow}>✓ Buy now</span>
                          ) : isSoon ? (
                            <span className={styles.badgeSoon}>After {item.availableDate}</span>
                          ) : (
                            <span className={styles.badgeWait}>Not this month</span>
                          )}
                          {(isNow || isSoon) && item.balanceAfter != null && (
                            <span className={styles.wishAfter}>{fmt(item.balanceAfter)} left after</span>
                          )}
                        </div>
                      </div>

                      {editingId === item.id ? (
                        <input
                          autoFocus type="number" min="0" step="0.01"
                          className={styles.costEdit}
                          value={editingCost}
                          onChange={e => setEditingCost(e.target.value)}
                          onBlur={() => commitEdit(item.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  commitEdit(item.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                      ) : (
                        <div className={styles.wishCost} onClick={() => startEdit(item)} title="Click to edit">
                          {fmt(item.cost)}
                        </div>
                      )}

                      <div className={styles.wishActions}>
                        <button className={styles.buyBtn} onClick={() => markPurchased(item.id)}>
                          {isPayment ? '✓ Paid' : '✓ Bought'}
                        </button>
                        <button className={styles.delBtn} onClick={() => deleteItem(item.id)}>×</button>
                      </div>
                    </div>
                  )
                })}
                <div className={styles.listFooter}>
                  <span>{wishlist.length} item{wishlist.length !== 1 ? 's' : ''} · {wishlistWithStatus.filter(w => w.status === 'now').length} affordable now</span>
                  <span className={styles.listTotal}>{fmt(wishlist.reduce((s, w) => s + w.cost, 0))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Balance + upcoming */}
        <div className={styles.rightCol}>
          {/* Free to spend */}
          <div className={styles.freeCard}>
            <div className={styles.freeTop}>
              <div className={styles.sectionLabel}>Free to Spend</div>
              <div className={styles.freeAmt} style={{ color: freeToSpend > 0 ? 'var(--safe)' : 'var(--warn)' }}>
                {fmt(freeToSpend)}
              </div>
              <div className={styles.freeSub}>
                After upcoming bills through end of {today.toLocaleDateString('en-US', { month: 'long' })}
              </div>
            </div>

            <div className={styles.freeBalance}>
              <div>
                <div className={styles.freeAcctName}>{account?.name || '—'}</div>
                <div className={styles.freeAcctBal}>{fmt(balance)}</div>
              </div>
              <span className={styles.freeAcctLabel}>Current balance</span>
            </div>

            {nextPayday && (
              <div className={styles.paydayRow}>
                <div className={styles.paydayLeft}>
                  <span className={styles.paydayIcon}>💸</span>
                  <div>
                    <div className={styles.paydayTitle}>Next payday</div>
                    <div className={styles.paydaySub}>{nextPayday.date} · {nextPayday.daysAway}d away</div>
                  </div>
                </div>
                <span className={styles.paydayAmt}>+{fmt(nextPayday.amount)}</span>
              </div>
            )}
          </div>

          {/* Upcoming bills */}
          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <span className={styles.sectionLabel}>Upcoming This Month</span>
            </div>
            {upcomingBills.length === 0 ? (
              <div className={styles.listEmpty}><p>No upcoming transactions</p></div>
            ) : (
              <>
                {upcomingBills.map((t, i) => (
                  <div key={`${t.id}-${t._day}`} className={`${styles.billRow} ${i < upcomingBills.length - 1 ? styles.billRowBorder : ''}`}>
                    <div className={styles.billDay}>{t._day}</div>
                    <div className={styles.billName}>
                      {t.name}
                      {t._isIncome && t._net > 0 && (
                        <span className={styles.billNetNote}> (net +{fmt(t._net)})</span>
                      )}
                    </div>
                    <div className={styles.billAmt} style={{ color: t._isIncome ? 'var(--safe)' : 'var(--debt)' }}>
                      {t._isIncome ? '+' : '−'}{fmt(Math.abs(t.amount))}
                    </div>
                  </div>
                ))}
                <div className={styles.listFooter}>
                  <span className={styles.billsTotal} style={{ color: 'var(--debt)' }}>
                    −{fmt(upcomingBills.filter(t => !t._isIncome).reduce((s, t) => s + Math.abs(t.amount), 0))} bills
                  </span>
                  {upcomingBills.some(t => t._isIncome) && (
                    <span style={{ color: 'var(--safe)' }}>
                      +{fmt(upcomingBills.filter(t => t._isIncome).reduce((s, t) => s + (t._net || 0), 0))} income (net)
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab labels ────────────────────────────────────────────────
const TAB_KEYS   = ['tab1', 'tab2']
const TAB_LABELS = ['Stearns', 'Cap1 Child']

// ── Main Dani Page ────────────────────────────────────────────
export default function Dani() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [activeTab,  setActiveTab]  = useState('tab1')

  useEffect(() => {
    api.dani()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const handleTabSave = useCallback((tabKey, patch) => {
    setData(prev => prev ? { ...prev, [tabKey]: patch } : prev)
    api.saveDani({ [tabKey]: patch }).catch(() => {})
  }, [])

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { accounts = [], recurringItems = [] } = data || {}

  return (
    <ScreenWrap>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pre}>Owner · Private</div>
          <h1 className={styles.title}>Dani</h1>
          <p className={styles.sub}>Spending power, upcoming bills, and wishlist tracker.</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.privacyBadge}>🔒 Owner only</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TAB_KEYS.map((t, i) => (
          <button
            key={t}
            className={`${styles.tabBtn} ${activeTab === t ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {TAB_KEYS.map(t => (
        <div key={t} style={{ display: activeTab === t ? 'block' : 'none' }}>
          <DaniTab
            accounts={accounts}
            recurringItems={recurringItems}
            tabData={data?.[t] || { selectedAccountId: null, wishlist: [] }}
            onTabSave={patch => handleTabSave(t, patch)}
            tabKey={t}
          />
        </div>
      ))}
    </ScreenWrap>
  )
}
