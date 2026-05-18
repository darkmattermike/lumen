import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './GmailInbox.module.css'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

// ── Subscription card ─────────────────────────────────────────
function SubCard({ sub, onIgnore }) {
  const days   = daysUntil(sub.next_renewal)
  const urgent = days !== null && days <= 7 && days >= 0
  const past   = days !== null && days < 0

  return (
    <div className={`${styles.card} ${urgent ? styles.cardUrgent : ''}`}>
      <div className={styles.cardIcon}>{sub.icon || '📱'}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{sub.service_name}</div>
        <div className={styles.cardMeta}>
          {sub.amount ? `$${fmt(sub.amount)} / ${sub.billing_cycle || 'month'}` : 'Amount unknown'}
          {' · '}
          {past
            ? <span style={{ color: 'var(--debt)' }}>Renewed {Math.abs(days)}d ago</span>
            : days === 0
            ? <span style={{ color: 'var(--debt)' }}>Renews today</span>
            : days !== null
            ? <span style={{ color: urgent ? 'var(--warn)' : 'var(--ink-2)' }}>Renews in {days}d · {fmtDate(sub.next_renewal)}</span>
            : <span>Renewal date unknown</span>
          }
        </div>
      </div>
      <div className={styles.cardActions}>
        <button
          className={styles.ignoreBtn}
          onClick={() => onIgnore(sub.id)}
          title="Hide this subscription"
        >
          Hide
        </button>
      </div>
    </div>
  )
}

// ── Order card ────────────────────────────────────────────────
function OrderCard({ order, onDismiss }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>{order.icon || '📦'}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{order.merchant}</div>
        <div className={styles.cardMeta}>
          {order.amount ? `$${fmt(order.amount)}` : 'Amount unknown'}
          {' · '}
          {fmtDate(order.order_date)}
          {order.estimated_delivery && (
            <span style={{ color: 'var(--calm)' }}> · Arrives {order.estimated_delivery}</span>
          )}
        </div>
        <div className={styles.cardSubject}>{order.email_subject}</div>
      </div>
      <div className={styles.cardActions}>
        <button
          className={styles.ignoreBtn}
          onClick={() => onDismiss(order.id)}
          title="Dismiss this order"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ── Bill card ─────────────────────────────────────────────────
function BillCard({ bill }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>📄</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>
          {bill.from.replace(/<.*>/, '').trim().slice(0, 40)}
        </div>
        <div className={styles.cardMeta}>
          {bill.amount ? <span style={{ color: 'var(--debt)' }}>${fmt(bill.amount)} due</span> : 'Amount unknown'}
          {' · '}
          {fmtDate(bill.date)}
        </div>
        <div className={styles.cardSubject}>{bill.subject}</div>
      </div>
    </div>
  )
}

// ── Scan button ───────────────────────────────────────────────
function ScanBtn({ label, onClick, scanning }) {
  return (
    <button className={styles.scanBtn} onClick={onClick} disabled={scanning}>
      {scanning ? (
        <><span className={styles.scanDot} /> Scanning...</>
      ) : (
        <>{label}</>
      )}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function GmailInbox() {
  const { data: statusData, loading, error } = useApi(api.gmailStatus)
  const { data: subsData,   refresh: refreshSubs   } = useApi(api.gmailSubscriptions)
  const { data: ordersData, refresh: refreshOrders } = useApi(api.gmailOrders)

  const [scanning, setScanning] = useState({ subs: false, orders: false, bills: false })
  const [bills, setBills]       = useState([])
  const [scanMsg, setScanMsg]   = useState({})
  const [activeTab, setActiveTab] = useState('subscriptions')

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const connected     = statusData?.connected
  const subscriptions = subsData?.subscriptions   || []
  const orders        = ordersData?.orders        || []

  // Monthly subscription cost
  const monthlySubCost = subscriptions.reduce((s, sub) => {
    if (!sub.amount) return s
    return s + (sub.billing_cycle === 'annual' ? Number(sub.amount) / 12 : Number(sub.amount))
  }, 0)

  async function handleScanSubs() {
    setScanning(s => ({ ...s, subs: true }))
    setScanMsg(m => ({ ...m, subs: '' }))
    try {
      const result = await api.gmailScanSubs()
      setScanMsg(m => ({ ...m, subs: `Found ${result.found} emails · ${result.upserted} subscriptions updated` }))
      refreshSubs()
    } catch (err) {
      setScanMsg(m => ({ ...m, subs: `Error: ${err.message}` }))
    } finally {
      setScanning(s => ({ ...s, subs: false }))
    }
  }

  async function handleScanOrders() {
    setScanning(s => ({ ...s, orders: true }))
    setScanMsg(m => ({ ...m, orders: '' }))
    try {
      const result = await api.gmailScanOrders()
      setScanMsg(m => ({ ...m, orders: `Found ${result.found} emails · ${result.inserted} new orders` }))
      refreshOrders()
    } catch (err) {
      setScanMsg(m => ({ ...m, orders: `Error: ${err.message}` }))
    } finally {
      setScanning(s => ({ ...s, orders: false }))
    }
  }

  async function handleScanBills() {
    setScanning(s => ({ ...s, bills: true }))
    setScanMsg(m => ({ ...m, bills: '' }))
    try {
      const result = await api.gmailScanBills()
      setBills(result.bills || [])
      setScanMsg(m => ({ ...m, bills: `Found ${result.found} bill emails` }))
    } catch (err) {
      setScanMsg(m => ({ ...m, bills: `Error: ${err.message}` }))
    } finally {
      setScanning(s => ({ ...s, bills: false }))
    }
  }

  async function handleIgnoreSub(id) {
    await api.gmailUpdateSub(id, { status: 'ignored' })
    refreshSubs()
  }

  async function handleDismissOrder(id) {
    await api.gmailUpdateOrder(id, { status: 'dismissed' })
    refreshOrders()
  }

  if (!connected) {
    return (
      <ScreenWrap>
        <div className={styles.notConnected}>
          <div className={styles.ncIcon}>✉️</div>
          <div className={styles.ncTitle}>Gmail not connected</div>
          <div className={styles.ncSub}>
            Connect Gmail in <strong>Settings</strong> to scan for subscriptions, orders, and bills.
          </div>
        </div>
      </ScreenWrap>
    )
  }

  const TABS = [
    { key: 'subscriptions', label: 'Subscriptions', count: subscriptions.length },
    { key: 'orders',        label: 'Orders',        count: orders.length },
    { key: 'bills',         label: 'Bills',         count: bills.length },
  ]

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>✉ Gmail Intelligence</div>
          <div className={styles.title}>Gmail Inbox</div>
          <div className={styles.sub}>
            Lumen scans your Gmail for subscriptions, order confirmations, and bills.
            Click Scan to pull the latest — runs automatically every hour.
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statL}>Subscriptions</div>
              <div className={styles.statV}>{subscriptions.length}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statL}>Monthly Sub Cost</div>
              <div className={styles.statV} style={{ color: 'var(--debt)' }}>${fmt(monthlySubCost)}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statL}>Recent Orders</div>
              <div className={styles.statV}>{orders.length}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statL}>Connected As</div>
              <div className={styles.statV} style={{ fontSize: 11, color: 'var(--calm)' }}>
                {statusData.gmail_address}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabOn : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.count > 0 && <span className={styles.tabCount}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {/* ── Subscriptions tab ── */}
        {activeTab === 'subscriptions' && (
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}>
              <div className={styles.paneTitle}>
                Detected Subscriptions
                {monthlySubCost > 0 && (
                  <span className={styles.paneTitleSub}> · ${fmt(monthlySubCost)}/mo estimated</span>
                )}
              </div>
              <div className={styles.paneActions}>
                {scanMsg.subs && <span className={styles.scanResult}>{scanMsg.subs}</span>}
                <ScanBtn label="🔍 Scan Gmail" onClick={handleScanSubs} scanning={scanning.subs} />
              </div>
            </div>
            {subscriptions.length === 0 ? (
              <div className={styles.empty}>
                No subscriptions detected yet. Click <strong>Scan Gmail</strong> to search your inbox.
              </div>
            ) : (
              <div className={styles.cardList}>
                {subscriptions.map(sub => (
                  <SubCard key={sub.id} sub={sub} onIgnore={handleIgnoreSub} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Orders tab ── */}
        {activeTab === 'orders' && (
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}>
              <div className={styles.paneTitle}>Recent Orders</div>
              <div className={styles.paneActions}>
                {scanMsg.orders && <span className={styles.scanResult}>{scanMsg.orders}</span>}
                <ScanBtn label="🔍 Scan Gmail" onClick={handleScanOrders} scanning={scanning.orders} />
              </div>
            </div>
            {orders.length === 0 ? (
              <div className={styles.empty}>
                No orders detected yet. Click <strong>Scan Gmail</strong> to search your inbox.
              </div>
            ) : (
              <div className={styles.cardList}>
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} onDismiss={handleDismissOrder} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bills tab ── */}
        {activeTab === 'bills' && (
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}>
              <div className={styles.paneTitle}>Upcoming Bills</div>
              <div className={styles.paneActions}>
                {scanMsg.bills && <span className={styles.scanResult}>{scanMsg.bills}</span>}
                <ScanBtn label="🔍 Scan Gmail" onClick={handleScanBills} scanning={scanning.bills} />
              </div>
            </div>
            {bills.length === 0 ? (
              <div className={styles.empty}>
                No bills detected yet. Click <strong>Scan Gmail</strong> to search the last 2 weeks of email.
              </div>
            ) : (
              <div className={styles.cardList}>
                {bills.map((bill, i) => (
                  <BillCard key={i} bill={bill} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScreenWrap>
  )
}
