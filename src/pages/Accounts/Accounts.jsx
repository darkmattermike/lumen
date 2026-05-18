import { useState, useEffect, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import Spotlight from '../../components/Spotlight/Spotlight'
import { api } from '../../data/api'
import styles from './Accounts.module.css'

function AccountCard({ acct, onToggleDashboard }) {
  const colorMap = { safe: 'var(--safe)', calm: 'var(--calm)', goal: 'var(--goal)', debt: 'var(--debt)' }
  const balColor = colorMap[acct.color] || 'var(--safe)'
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    await onToggleDashboard(acct.id, !acct.include_in_balance)
    setToggling(false)
  }

  return (
    <div className={`${styles.acctCard} ${acct.is_debt ? styles.debt : ''}`}>
      <div className={styles.acctTop}>
        <div className={styles.acctIcon}>{acct.icon || '🏦'}</div>
        <div className={styles.acctInfo}>
          <div className={styles.acctName}>{acct.name}</div>
          <div className={styles.acctType}>
            {acct.type}{acct.mask ? ` · ····${acct.mask}` : ''} · {acct.institution}
          </div>
        </div>
        <div className={styles.acctStatus} style={{ background: `${balColor}18`, color: balColor }}>
          {acct.is_debt ? 'Debt' : acct.type === 'savings' ? `${acct.interest_rate || ''}% APY` : 'Active'}
        </div>
      </div>
      <div className={styles.balLabel}>{acct.is_debt ? 'Remaining Balance' : 'Available Balance'}</div>
      <div className={styles.balance} style={{ color: balColor }}>
        ${Number(acct.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </div>
      <div className={styles.meta}>
        {acct.limit_amt && (
          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>Limit</div>
            <div className={styles.metaVal}>${Number(acct.limit_amt).toLocaleString()}</div>
          </div>
        )}
        {acct.interest_rate && (
          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>Rate</div>
            <div className={styles.metaVal} style={{ color: acct.is_debt ? 'var(--debt)' : 'var(--safe)' }}>
              {acct.interest_rate}%
            </div>
          </div>
        )}
        <div className={styles.metaItem}>
          <div className={styles.metaLabel}>Type</div>
          <div className={styles.metaVal} style={{ textTransform: 'capitalize' }}>{acct.type}</div>
        </div>
        <div className={styles.metaItem} style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className={styles.metaLabel}>Dashboard Balance</div>
          <button
            className={`${styles.dashToggle} ${acct.include_in_balance !== false ? styles.dashToggleOn : ''}`}
            onClick={handleToggle}
            disabled={toggling}
            title={acct.include_in_balance !== false ? 'Included in dashboard balance — click to exclude' : 'Excluded from dashboard balance — click to include'}
          >
            {acct.include_in_balance !== false ? 'Included' : 'Excluded'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
      {loading ? 'Connecting...' : '+ Add Account'}
    </button>
  )
}

export default function Accounts() {
  const [data, setData]       = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.accounts().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    try { await api.syncPlaid(); load() }
    catch (err) { console.error('Sync error:', err) }
    finally { setSyncing(false) }
  }

  async function handleToggleDashboard(id, include) {
    // Optimistically update local state
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, include_in_balance: include } : a),
    }))
    try {
      await api.updateAccount(id, { include_in_balance: include })
    } catch (err) {
      console.error('Toggle failed:', err)
      load() // revert on failure
    }
  }

  const accounts    = data?.accounts || []
  const assets      = accounts.filter(a => !a.is_debt)
  const liabilities = accounts.filter(a => a.is_debt)
  const netWorth    = data?.netWorth || 0
  const lastSynced  = data?.lastSynced
    ? new Date(data.lastSynced).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>⬦ Where I Am</div>
          <div className={styles.title}>Accounts</div>
          <div className={styles.sub}>
            Every connected account in one place. Lumen tracks balances, trends, and flags anything unusual.
          </div>
          {lastSynced && <div className={styles.lastSynced}>Last synced {lastSynced}</div>}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.netWorth}>
            <div className={styles.nwLabel}>Total Net Worth</div>
            <div className={styles.nwAmt}>
              ${Math.abs(netWorth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <span className={`delta ${netWorth >= 0 ? 'pos' : 'neg'}`}>
                {netWorth >= 0 ? '+' : '−'}${Math.abs(netWorth).toLocaleString()}
              </span>
            </div>
          </div>
          <div className={styles.actions}>
            <AddAccountButton onSuccess={load} />
            <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : '↻ Sync'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.empty}>Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No accounts connected yet</div>
            <div className={styles.emptySub}>Click <strong>+ Add Account</strong> above to connect your bank through Plaid.</div>
          </div>
        ) : (
          <>
            {assets.length > 0 && (
              <>
                <div className={styles.groupLabel}>💳 Checking & Savings</div>
                {assets.map(a => <AccountCard key={a.id} acct={a} onToggleDashboard={handleToggleDashboard} />)}
              </>
            )}
            {liabilities.length > 0 && (
              <>
                <div className={styles.groupLabel} style={{ marginTop: 8 }}>💳 Credit Cards & Loans</div>
                {liabilities.map(a => <AccountCard key={a.id} acct={a} onToggleDashboard={handleToggleDashboard} />)}
              </>
            )}
            <div className={styles.spotlightWrap}>
              <Spotlight tag="Lumen on Your Accounts" dotSize={32}>
                <span style={{ fontSize: 15, lineHeight: 1.75 }}>
                  Net worth is <strong>${Math.abs(netWorth).toLocaleString()}</strong>
                  {assets.length > 0 && ` across ${assets.length} asset account${assets.length > 1 ? 's' : ''}`}.
                  {' '}Use <em>Sync</em> to pull the latest transactions from your bank.
                </span>
              </Spotlight>
            </div>
          </>
        )}
      </div>
    </ScreenWrap>
  )
}
