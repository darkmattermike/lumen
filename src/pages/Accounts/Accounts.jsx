import { useState } from 'react'
import { api } from '../../data/api'
import { useApi } from '../../hooks/useApi'
import { money } from '../../lib/format'
import s from './Accounts.module.css'

const ROLES = ['source', 'protected', 'ignore']

export default function Accounts() {
  const { data, loading, error, refresh } = useApi(() => api.accounts(), [])
  const [editing, setEditing] = useState(null)

  const accounts = data?.accounts || []
  const assets = accounts.filter(a => !a.is_debt).reduce((t, a) => t + Number(a.balance), 0)
  const debt = accounts.filter(a => a.is_debt).reduce((t, a) => t + Number(a.balance), 0)
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

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <div className={s.eyebrow}>Holdings</div>
          <h1 className={s.title}>Accounts</h1>
        </div>
        <div className={s.summary}>
          <Stat label="Net worth" value={money(netWorth)} tone={netWorth >= 0 ? 'teal' : 'rose'} big />
          <Stat label="Assets" value={money(assets)} tone="mint" />
          <Stat label="Debt" value={money(debt)} tone="rose" />
        </div>
      </header>

      {loading && !data && <div className={s.state}>Loading accounts…</div>}
      {error && <div className={s.state}>Couldn’t load accounts. {error}</div>}

      <div className={s.grid}>
        {accounts.map(a => (
          <div key={a.id} className={`${s.card} ${a.is_debt ? s.debt : ''}`}>
            <div className={s.cardTop}>
              <span className={s.icon}>{a.icon || (a.is_debt ? '💳' : '🏦')}</span>
              <div className={s.idns}>
                <div className={s.aname}>{a.name}</div>
                <div className={s.inst}>{a.institution || a.type}{a.mask ? ` ••${a.mask}` : ''}</div>
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
                />
              ) : (
                <button className={`${s.bal} ${a.is_debt ? s.balDebt : ''}`} onClick={() => setEditing(a.id)} title="Edit balance">
                  {a.is_debt ? '−' : ''}{money(a.balance)}
                </button>
              )}
              {a.type === 'credit' && a.limit_amt > 0 && (
                <span className={s.limit}>of {money(a.limit_amt)} limit</span>
              )}
            </div>

            <div className={s.foot}>
              <label className={s.toggle}>
                <input type="checkbox" checked={!!a.include_in_balance} onChange={e => patch(a.id, { include_in_balance: e.target.checked })} />
                <span className={s.track}><span className={s.knob} /></span>
                <span className={s.toggleL}>In spendable balance</span>
              </label>

              <div className={s.roleWrap}>
                <span className={s.roleL}>Forecast</span>
                <select className={s.role} value={a.forecast_role || 'ignore'} onChange={e => patch(a.id, { forecast_role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, tone, big }) {
  return (
    <div className={s.stat}>
      <div className={s.statL}>{label}</div>
      <div className={`${s.statV} ${big ? s.bigV : ''} ${s[tone] || ''}`}>{value}</div>
    </div>
  )
}
