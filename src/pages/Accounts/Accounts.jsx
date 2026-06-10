import { useState } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import SwShell from '../../components/SwShell/SwShell'
import { money } from '../../lib/format'
import s from './Accounts.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Accounts (Stillwater · Dark)
   Holdings as glass cards on the night water: net worth strip,
   inline balance editing, spendable-balance toggle, forecast
   role. All previous functionality preserved.
   ────────────────────────────────────────────────────────────── */

const ROLES = ['source', 'protected', 'ignore']

export default function Accounts() {
  const { data, loading, error, refresh } = useApi(() => api.accounts(), [])
  const [editing, setEditing] = useState(null)

  const accounts = data?.accounts || []
  const assets = accounts.filter(a => !a.is_debt).reduce((t, a) => t + Number(a.balance), 0)
  const debt = accounts.filter(a => a.is_debt).reduce((t, a) => t + Number(a.balance), 0)
  const netWorth = data?.netWorth ?? (assets - debt)

  async function patch(id, body) {
    try { await api.updateAccount(id, body); refresh() } catch { /* surfaced on next load */ }
  }
  async function saveBalance(a, value) {
    setEditing(null)
    const n = Number(String(value).replace(/[^0-9.-]/g, ''))
    if (!Number.isFinite(n) || n === Number(a.balance)) return
    patch(a.id, { balance: n })
  }

  return (
    <SwShell>
      {/* ── page head: title + worth summary ── */}
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

      {loading && !data && <div className={s.state}>Loading accounts…</div>}
      {error && <div className={s.state}>Couldn't load accounts. <b>{error}</b></div>}

      {/* ── account cards ── */}
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
