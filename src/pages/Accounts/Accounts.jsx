import { useState, useEffect, useCallback, useRef } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import LumenInsight from '../../components/LumenInsight/LumenInsight'
import { api } from '../../data/api'
import styles from './Accounts.module.css'

const fmtAmt  = n => Math.abs(Number(n||0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtShrt = n => Math.abs(Number(n||0)).toLocaleString('en-US', { maximumFractionDigits: 0 })

function typeColor(acct) {
  if (acct.is_debt)                                   return 'var(--debt)'
  if (acct.type === 'savings' || acct.type === 'investment') return 'var(--calm)'
  if (acct.type === 'checking')                       return 'var(--safe)'
  return 'var(--ink-2)'
}

function typeIcon(acct) {
  if (acct.icon) return acct.icon
  if (acct.type === 'savings')    return '🏦'
  if (acct.type === 'checking')   return '🏦'
  if (acct.type === 'credit')     return '💳'
  if (acct.type === 'loan')       return '📋'
  if (acct.type === 'investment') return '📈'
  if (acct.is_debt)               return '💳'
  return '🏦'
}

// ── Single account row inside an institution block ────────────────────────────
function AccountRow({ acct, index = 0, onToggleDashboard, onToggleDebt, isNew }) {
  const [toggling, setToggling]     = useState(false)
  const [togglingDebt, setTogglingDebt] = useState(false)
  const [expanded, setExpanded]     = useState(false)
  const [justToggled, setJustToggled] = useState(false)
  const color = typeColor(acct)

  async function handleToggle(e) {
    e.stopPropagation()
    setToggling(true)
    await onToggleDashboard(acct.id, !acct.include_in_balance)
    setJustToggled(true)
    setTimeout(() => setJustToggled(false), 600)
    setToggling(false)
  }

  async function handleToggleDebt(e) {
    e.stopPropagation()
    setTogglingDebt(true)
    await onToggleDebt(acct.id, !acct.is_debt)
    setTogglingDebt(false)
  }

  const included = acct.include_in_balance !== false

  return (
    <>
      <div
        className={`${styles.acctRow} ${isNew ? styles.acctRowNew : ''} ${expanded ? styles.acctRowExpanded : ''}`}
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        style={{ '--row-delay': `${index * 40}ms` }}
      >
        {/* Color dot */}
        <div className={styles.typeDot} style={{ background: color }} />

        {/* Name + sub */}
        <div className={styles.acctInfo}>
          <div className={styles.acctName}>{acct.name}</div>
          <div className={styles.acctSub}>
            {acct.type && <span style={{ textTransform: 'capitalize' }}>{acct.type}</span>}
            {acct.interest_rate && <span style={{ color: acct.is_debt ? 'var(--debt)' : 'var(--safe)' }}> · {acct.interest_rate}% {acct.is_debt ? 'APR' : 'APY'}</span>}
          </div>
        </div>

        {/* Mask */}
        <div className={styles.acctMask}>
          {acct.mask ? `····${acct.mask}` : '—'}
        </div>

        {/* Balance */}
        <div className={styles.acctBal} style={{ color }}>
          {acct.is_debt ? '−' : ''}${fmtAmt(acct.balance)}
        </div>

        {/* Badges */}
        <div className={styles.acctBadges}>
          <span
            className={`${styles.badge} ${included ? styles.badgeIncl : styles.badgeExcl}`}
            onClick={handleToggle}
            title={included ? 'Included in net worth — click to exclude' : 'Excluded from net worth — click to include'}
          >
            {toggling ? '…' : included ? 'Incl' : 'Excl'}
          </span>
          {acct.is_debt && (
            <span className={`${styles.badge} ${styles.badgeDebt}`}>Debt</span>
          )}
        </div>

        {/* Expand chevron */}
        <div className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>›</div>
      </div>

      {/* Expanded detail row */}
      {expanded && (
        <div className={styles.acctDetail}>
          <div className={styles.detailGrid}>
            {acct.limit_amt && (
              <div className={styles.detailCell}>
                <div className={styles.detailLabel}>Credit Limit</div>
                <div className={styles.detailVal}>${fmtShrt(acct.limit_amt)}</div>
              </div>
            )}
            {acct.interest_rate && (
              <div className={styles.detailCell}>
                <div className={styles.detailLabel}>{acct.is_debt ? 'APR' : 'APY'}</div>
                <div className={styles.detailVal} style={{ color: acct.is_debt ? 'var(--debt)' : 'var(--safe)' }}>
                  {acct.interest_rate}%
                </div>
              </div>
            )}
            <div className={styles.detailCell}>
              <div className={styles.detailLabel}>Type</div>
              <div className={styles.detailVal} style={{ textTransform: 'capitalize' }}>{acct.type || '—'}</div>
            </div>
            <div className={styles.detailCell}>
              <div className={styles.detailLabel}>Institution</div>
              <div className={styles.detailVal}>{acct.institution || '—'}</div>
            </div>
            {acct.limit_amt && (
              <div className={styles.detailCell} style={{ gridColumn: '1/-1' }}>
                <div className={styles.detailLabel}>Utilization</div>
                <div className={styles.utilizBar}>
                  <div
                    className={styles.utilizFill}
                    style={{
                      '--util-w':  `${Math.min(100, (Number(acct.balance)/Number(acct.limit_amt))*100)}%`,
                      background: (Number(acct.balance)/Number(acct.limit_amt)) > 0.7 ? 'var(--debt)' : (Number(acct.balance)/Number(acct.limit_amt)) > 0.3 ? 'var(--warn)' : 'var(--safe)',
                    }}
                  />
                </div>
                <div className={styles.utilizLabel}>
                  {Math.round((Number(acct.balance)/Number(acct.limit_amt))*100)}% used
                </div>
              </div>
            )}
          </div>
          <div className={styles.detailActions}>
            <button
              className={`${styles.detailBtn} ${included ? styles.detailBtnOn : ''}`}
              onClick={handleToggle}
              disabled={toggling}
            >
              {toggling ? '…' : included ? '✓ Included in Balance' : 'Include in Balance'}
            </button>
            <button
              className={`${styles.detailBtn} ${acct.is_debt ? styles.detailBtnDebt : ''}`}
              onClick={handleToggleDebt}
              disabled={togglingDebt}
            >
              {togglingDebt ? '…' : acct.is_debt ? '✓ Marked as Debt' : 'Mark as Debt'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Institution group card ────────────────────────────────────────────────────
function InstitutionGroup({ institution, accounts, onToggleDashboard, onToggleDebt, newAccountIds, isDebtGroup }) {
  const groupTotal = accounts.reduce((s, a) => {
    return s + (a.is_debt ? -Number(a.balance) : Number(a.balance))
  }, 0)

  const borderColor = isDebtGroup
    ? 'rgba(232,115,99,.18)'
    : accounts.some(a => a.type === 'savings') ? 'rgba(108,140,255,.14)' : 'var(--ink-5)'

  return (
    <div
      className={styles.institution}
      style={{ '--inst-border': borderColor }}
    >
      {/* Institution header */}
      <div className={styles.instHeader}>
        <span className={styles.instIcon}>
          {isDebtGroup
            ? (accounts[0]?.type === 'credit' ? '💳' : '📋')
            : (accounts[0]?.icon || '🏦')}
        </span>
        <span className={styles.instName}>{institution}</span>
        <span className={styles.instCount}>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </span>
        <span
          className={styles.instTotal}
          style={{ color: groupTotal < 0 ? 'var(--debt)' : 'var(--safe)' }}
        >
          {groupTotal < 0 ? '−' : ''}${fmtAmt(Math.abs(groupTotal))}
        </span>
      </div>

      {/* Account rows */}
      <div className={styles.acctRows}>
        {accounts.map((a, i) => (
          <AccountRow
            key={a.id}
            acct={a}
            index={i}
            onToggleDashboard={onToggleDashboard}
            onToggleDebt={onToggleDebt}
            isNew={newAccountIds.has(a.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Plaid connect button ──────────────────────────────────────────────────────
function AddAccountButton({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    api.getLinkToken()
      .then(d => setLinkToken(d.link_token))
      .catch(err => console.error('Link token error:', err))
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      setLoading(true)
      try {
        await api.exchangeToken({
          public_token:     publicToken,
          institution_id:   metadata.institution?.institution_id,
          institution_name: metadata.institution?.name,
        })
        onSuccess()
      } catch (err) {
        console.error('Exchange error:', err)
      } finally {
        setLoading(false)
      }
    },
  })

  return (
    <button className={styles.addBtn} onClick={() => open()} disabled={!ready || loading}>
      {loading ? 'Connecting…' : '+ Add Account'}
    </button>
  )
}

// ── Net worth strip ───────────────────────────────────────────────────────────
function NetWorthStrip({ accounts, netWorth }) {
  const liquid      = accounts.filter(a => !a.is_debt && a.type === 'checking').reduce((s,a) => s+Number(a.balance),0)
  const savings     = accounts.filter(a => !a.is_debt && a.type === 'savings').reduce((s,a) => s+Number(a.balance),0)
  const investments = accounts.filter(a => !a.is_debt && a.type === 'investment').reduce((s,a) => s+Number(a.balance),0)
  const debt        = accounts.filter(a =>  a.is_debt).reduce((s,a) => s+Number(a.balance),0)
  const totalPos    = liquid + savings + investments
  const totalAll    = totalPos + debt

  const seg = (val, color, delay = 0) => ({
    '--seg-w':    totalAll > 0 ? `${Math.max(2, (val/totalAll)*100)}%` : '0%',
    '--seg-delay': `${delay}ms`,
    background: color,
  })

  return (
    <div className={styles.nwStrip}>
      <div className={styles.nwMain}>
        <div className={styles.nwLabel}>Net Worth</div>
        <div className={styles.nwAmt} style={{ color: netWorth >= 0 ? 'var(--calm)' : 'var(--debt)' }}>
          {netWorth < 0 ? '−' : ''}${fmtAmt(Math.abs(netWorth))}
        </div>
      </div>
      <div className={styles.nwBreakdown}>
        {liquid > 0 && (
          <div className={styles.nwSeg}>
            <div className={styles.nwSegDot} style={{ background: 'var(--safe)' }} />
            <span className={styles.nwSegLabel}>Liquid</span>
            <span className={styles.nwSegVal} style={{ color: 'var(--safe)' }}>${fmtShrt(liquid)}</span>
          </div>
        )}
        {savings > 0 && (
          <div className={styles.nwSeg}>
            <div className={styles.nwSegDot} style={{ background: 'var(--calm)' }} />
            <span className={styles.nwSegLabel}>Savings</span>
            <span className={styles.nwSegVal} style={{ color: 'var(--calm)' }}>${fmtShrt(savings)}</span>
          </div>
        )}
        {investments > 0 && (
          <div className={styles.nwSeg}>
            <div className={styles.nwSegDot} style={{ background: 'var(--warn)' }} />
            <span className={styles.nwSegLabel}>Investments</span>
            <span className={styles.nwSegVal} style={{ color: 'var(--warn)' }}>${fmtShrt(investments)}</span>
          </div>
        )}
        {debt > 0 && (
          <div className={styles.nwSeg}>
            <div className={styles.nwSegDot} style={{ background: 'var(--debt)' }} />
            <span className={styles.nwSegLabel}>Debt</span>
            <span className={styles.nwSegVal} style={{ color: 'var(--debt)' }}>−${fmtShrt(debt)}</span>
          </div>
        )}
      </div>
      {/* Proportional bar */}
      <div className={styles.nwBar}>
        {liquid > 0      && <div className={styles.nwBarSeg} style={seg(liquid, 'var(--safe)', 100)} />}
        {savings > 0     && <div className={styles.nwBarSeg} style={seg(savings, 'var(--calm)', 200)} />}
        {investments > 0 && <div className={styles.nwBarSeg} style={seg(investments, 'var(--warn)', 300)} />}
        {debt > 0        && <div className={styles.nwBarSeg} style={seg(debt, 'rgba(232,115,99,.45)', 400)} />}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Accounts() {
  const [data, setData]           = useState(null)
  const [syncing, setSyncing]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [newAccountIds, setNewAccountIds] = useState(new Set())
  const prevIds = useRef(new Set())

  const load = useCallback(() => {
    setLoading(true)
    api.accounts().then(d => {
      setData(d)
      // Track genuinely new accounts for entrance animation
      if (d?.accounts) {
        const currentIds = new Set(d.accounts.map(a => a.id))
        const added = new Set([...currentIds].filter(id => !prevIds.current.has(id)))
        if (prevIds.current.size > 0 && added.size > 0) {
          setNewAccountIds(added)
          setTimeout(() => setNewAccountIds(new Set()), 2000)
        }
        prevIds.current = currentIds
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    try { await api.syncPlaid(); load() }
    catch (err) { console.error('Sync error:', err) }
    finally { setSyncing(false) }
  }

  async function handleToggleDashboard(id, include) {
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, include_in_balance: include } : a),
    }))
    try { await api.updateAccount(id, { include_in_balance: include }) }
    catch { load() }
  }

  async function handleToggleDebt(id, isDebt) {
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, is_debt: isDebt } : a),
    }))
    try { await api.updateAccount(id, { is_debt: isDebt }) }
    catch { load() }
  }

  const accounts   = data?.accounts || []
  const netWorth   = data?.netWorth || 0
  const lastSynced = data?.lastSynced
    ? new Date(data.lastSynced).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  // Group by institution
  const groups = {}
  for (const a of accounts) {
    const key = a.institution || 'Manual / Other'
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }
  const sortedGroups = Object.entries(groups).sort(([, aList], [, bList]) => {
    // Assets first, then debt
    const aHasDebt = aList.every(a => a.is_debt)
    const bHasDebt = bList.every(a => a.is_debt)
    if (aHasDebt !== bHasDebt) return aHasDebt ? 1 : -1
    return 0
  })

  // Orb mood based on net worth
  const orbMood = netWorth < 0 ? 'alert' : netWorth < 1000 ? 'thinking' : 'happy'

  return (
    <ScreenWrap>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pre}>⬦ Where I Am</div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Accounts</h1>
            <LumenDot
              size={28}
              mood={loading ? 'loading' : syncing ? 'thinking' : orbMood}
              rings={!loading && !syncing}
              tooltip={
                netWorth < 0 ? "Debt exceeds assets. Let's work on that." :
                netWorth < 1000 ? "Tight on liquid. Keep an eye on it." :
                "Looking healthy from here."
              }
            />
          </div>
          <div className={styles.sub}>
            Every connected account in one place.{lastSynced && <span className={styles.lastSynced}> · Synced {lastSynced}</span>}
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.actions}>
            <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
              <span className={syncing ? styles.spinIcon : ''}>↻</span>
              {syncing ? ' Syncing…' : ' Sync'}
            </button>
            <AddAccountButton onSuccess={load} />
          </div>
        </div>
      </div>

      {/* ── Net worth strip ── */}
      {!loading && accounts.length > 0 && (
        <NetWorthStrip accounts={accounts} netWorth={netWorth} />
      )}

      {/* ── Body ── */}
      <div className={styles.body}>
        {loading ? (
          <div className={styles.loadingState}>
            <LumenDot size={28} mood="loading" />
            <span>Loading accounts…</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className={styles.emptyState}>
            <LumenDot size={44} mood="thinking" rings />
            <div className={styles.emptyTitle}>No accounts connected yet</div>
            <div className={styles.emptySub}>
              Click <strong>+ Add Account</strong> to connect your bank through Plaid, or add one manually.
            </div>
          </div>
        ) : (
          <>
            {/* Lumen insight */}
            <div className={styles.insightWrap}>
              <LumenInsight
                label="Account Overview"
                contextType="accounts"
                prompt="In 2-3 sentences, give a sharp read on the current account balances and net worth — any concerns, opportunities, or things worth paying attention to."
                color="green"
                showWhenNoKey
              />
            </div>

            {/* Institution groups */}
            {sortedGroups.map(([institution, accts]) => (
              <InstitutionGroup
                key={institution}
                institution={institution}
                accounts={accts}
                onToggleDashboard={handleToggleDashboard}
                onToggleDebt={handleToggleDebt}
                newAccountIds={newAccountIds}
                isDebtGroup={accts.every(a => a.is_debt)}
              />
            ))}
          </>
        )}
      </div>
    </ScreenWrap>
  )
}
