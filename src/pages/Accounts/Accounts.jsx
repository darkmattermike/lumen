import { useState, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money } from '../../lib/format'
import s from './Accounts.module.css'

const ROLES = ['source', 'protected', 'ignore']

export default function Accounts() {
  const { data, loading, error, refresh } = useApi(() => api.accounts(), [])
  const [editing, setEditing]   = useState(null)

  // ── Plaid Link state ────────────────────────────────────────
  const [linkToken,    setLinkToken]    = useState(null)
  const [linkLoading,  setLinkLoading]  = useState(false)
  const [linkError,    setLinkError]    = useState('')
  const [connecting,   setConnecting]   = useState(false) // exchanging token
  const [syncDone,     setSyncDone]     = useState(false)

  // ── Sync state ──────────────────────────────────────────
  const [syncing,      setSyncing]      = useState(false)
  const [syncResult,   setSyncResult]   = useState(null)  // { synced: N } | null
  const [syncError,    setSyncError]    = useState('')

  const accounts = data?.accounts || []
  const assets   = accounts.filter(a => !a.is_debt).reduce((t, a) => t + Number(a.balance), 0)
  const debt     = accounts.filter(a =>  a.is_debt).reduce((t, a) => t + Number(a.balance), 0)
  const netWorth = data?.netWorth ?? (assets - debt)

  async function patch(id, body) {
    try { await api.updateAccount(id, body); refresh() } catch { /* */ }
  }
  async function saveBalance(a, value) {
    setEditing(null)
    const n = Number(String(value).replace(/[^0-9.-]/g, ''))
    if (!Number.isFinite(n) || n === Number(a.balance)) return
    patch(a.id, { balance: n })
  }

  // ── Sync ────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError('')
    try {
      const result = await api.plaidSync()
      setSyncResult(result)
      refresh()
      setTimeout(() => setSyncResult(null), 4000)
    } catch (e) {
      setSyncError(e?.message || 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  // ── Step 1: fetch a link token from the backend ─────────────
  async function openPlaid() {
    setLinkError('')
    setSyncDone(false)
    setLinkLoading(true)
    try {
      const { link_token } = await api.plaidLinkToken()
      setLinkToken(link_token)
      // usePlaidLink will auto-open once linkToken is set (see useEffect inside the hook)
    } catch (e) {
      setLinkError(e?.message || 'Could not start Plaid Link.')
    } finally {
      setLinkLoading(false)
    }
  }

  // ── Step 2: Plaid calls onSuccess with a public_token ───────
  const onPlaidSuccess = useCallback(async (public_token, metadata) => {
    setConnecting(true)
    setLinkError('')
    try {
      await api.plaidExchange({
        public_token,
        institution_id:   metadata?.institution?.institution_id,
        institution_name: metadata?.institution?.name,
      })
      setSyncDone(true)
      setLinkToken(null)
      refresh()
    } catch (e) {
      setLinkError(e?.message || 'Could not connect account.')
    } finally {
      setConnecting(false)
    }
  }, [refresh])

  const onPlaidExit = useCallback(() => {
    setLinkToken(null)
  }, [])

  // ── Plaid Link hook (only active when linkToken is present) ─
  const { open: openLink, ready } = usePlaidLink({
    token:     linkToken,
    onSuccess: onPlaidSuccess,
    onExit:    onPlaidExit,
  })

  // Auto-open the Plaid modal as soon as the token arrives and the SDK is ready
  // This is safe to call in render since usePlaidLink debounces it internally
  if (linkToken && ready && !connecting) {
    openLink()
  }

  const isWorking = linkLoading || connecting

  return (
    <SwShell>
      <div className={s.head}>
        <div>
          <div className={s.eyebrow}>Accounts</div>
          <h1 className={s.title}>Everything you hold</h1>
          <div className={s.subtitle}>{accounts.length} account{accounts.length === 1 ? '' : 's'} · balances update on sync</div>
        </div>
        <div className={s.summary}>
          <div className={s.stat}>
            <div className={s.statKey}>Net worth</div>
            <div className={`${netWorth >= 0 ? s.statValBig : s.statValBigDebt} ${s.tabnum}`}>{money(netWorth)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Assets</div>
            <div className={`${s.statValIn} ${s.tabnum}`}>{money(assets)}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statKey}>Debt</div>
            <div className={`${s.statValDebt} ${s.tabnum}`}>−{money(debt).slice(1)}</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        <button
          className={`${s.toolChip} ${syncResult ? s.toolChipDone : ''}`}
          onClick={handleSync}
          disabled={syncing || isWorking}
          title="Pull latest balances and transactions from all connected banks">
          {syncing
            ? '⟳ Syncing…'
            : syncResult
            ? `✓ Synced ${syncResult.synced ?? 0} transactions`
            : '↻ Sync accounts'}
        </button>

        <button
          className={`${s.toolChip} ${s.toolChipAlt} ${syncDone ? s.toolChipDone : ''}`}
          onClick={openPlaid}
          disabled={isWorking || syncing}
          title="Connect a new bank account via Plaid">
          {connecting    ? '⟳ Connecting…'
           : linkLoading  ? '⟳ Loading…'
           : syncDone     ? '✓ Account connected'
           : '+ Connect a bank'}
        </button>

        {(linkError || syncError) && (
          <span className={s.chipErr}>{linkError || syncError}</span>
        )}
      </div>

      {loading && !data && <div className={s.state}>Loading accounts…</div>}
      {error && <div className={s.state}>Couldn't load accounts. <b>{error}</b></div>}

      <div className={s.grid}>
        {accounts.map((a, i) => (
          <div key={a.id} className={a.is_debt ? s.cardDebt : s.card} style={{ '--d': `${0.12 + i * 0.09}s` }}>
            <div className={s.cardTop}>
              <span className={s.icon}>{a.icon || (a.is_debt ? '💳' : '🏦')}</span>
              <div className={s.idns}>
                <div className={s.aname}>{a.name}</div>
                <div className={s.inst}>{a.institution || a.type}{a.mask ? ` ··${a.mask}` : ''}{a.interest_rate > 0 ? ` · ${a.interest_rate}%` : ''}</div>
              </div>
              {a.is_debt && <span className={s.badge}>Debt</span>}
            </div>

            <div className={s.balRow}>
              {editing === a.id ? (
                <input
                  className={s.balEdit}
                  defaultValue={Number(a.balance).toFixed(2)}
                  autoFocus
                  onBlur={e => saveBalance(a, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null) }}
                  aria-label="Edit balance"
                />
              ) : (
                <button
                  className={`${a.is_debt ? s.balDebt : s.bal} ${s.tabnum}`}
                  onClick={() => setEditing(a.id)}
                  title="Edit balance"
                >
                  {a.is_debt ? '−' : ''}{money(a.balance)}
                </button>
              )}
              {a.type === 'credit' && a.limit_amt > 0 && (
                <span className={s.limit}>of {money(a.limit_amt)} limit</span>
              )}
            </div>

            {a.type === 'credit' && a.limit_amt > 0 && (
              <div className={s.utilBar}>
                <i
                  className={(a.balance / a.limit_amt) >= 0.3 ? s.utilFillWarn : s.utilFill}
                  style={{ width: `${Math.min(100, Math.round((a.balance / a.limit_amt) * 100))}%`, '--d': `${0.45 + i * 0.09}s` }}
                />
              </div>
            )}

            <div className={s.foot}>
              <label className={s.toggle}>
                <input
                  type="checkbox"
                  checked={!!a.include_in_balance}
                  onChange={e => patch(a.id, { include_in_balance: e.target.checked })}
                />
                <span className={s.track} aria-hidden="true"><span className={s.knob} /></span>
                <span className={s.toggleL}>In spendable balance</span>
              </label>

              <div className={s.roleWrap}>
                <span className={s.roleL}>Forecast</span>
                <select
                  className={s.role}
                  value={a.forecast_role || 'ignore'}
                  onChange={e => patch(a.id, { forecast_role: e.target.value })}
                  aria-label="Forecast role"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SwShell>
  )
}
