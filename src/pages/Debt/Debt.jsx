import { useState, useEffect } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Debt.module.css'

function fmt(n)  { return Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtD(n) { return Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ── Payoff timeline bar ───────────────────────────────────────────────────────
function PayoffBar({ label, months, totalInterest, payoffDate, color, payoffOrder }) {
  const maxMonths = 120
  const pct       = Math.min(100, (months / maxMonths) * 100)
  return (
    <div className={styles.stratCard} style={{ '--sc': color }}>
      <div className={styles.stratHeader}>
        <span className={styles.stratLabel}>{label}</span>
        <span className={styles.stratDate}>{payoffDate}</span>
      </div>
      <div className={styles.stratBar}>
        <div className={styles.stratBarFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.stratStats}>
        <div className={styles.stratStat}>
          <span className={styles.stratStatVal}>{months}mo</span>
          <span className={styles.stratStatLabel}>Months</span>
        </div>
        <div className={styles.stratStat}>
          <span className={styles.stratStatVal} style={{ color: 'var(--debt)' }}>${fmt(totalInterest)}</span>
          <span className={styles.stratStatLabel}>Total interest</span>
        </div>
      </div>
      {payoffOrder?.length > 0 && (
        <div className={styles.payoffOrder}>
          {payoffOrder.map((p, i) => (
            <div key={p.id} className={styles.payoffChip}>
              <span className={styles.payoffNum}>{i+1}</span>
              <span>{p.name}</span>
              <span className={styles.payoffDate}>{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single debt row with minimum payment editor ───────────────────────────────
function DebtRow({ debt, onMinPaymentSave }) {
  const [editing, setEditing] = useState(false)
  const [min, setMin]         = useState(debt.minPayment || '')
  const [saving, setSaving]   = useState(false)

  async function save() {
    setSaving(true)
    await api.debtSetMinPayment(debt.id, { minimum_payment: Number(min) }).catch(() => {})
    setSaving(false)
    setEditing(false)
    onMinPaymentSave?.()
  }

  const utilPct = debt.limit > 0 ? Math.round((debt.balance / debt.limit) * 100) : null

  return (
    <div className={styles.debtRow}>
      <div className={styles.debtLeft}>
        <div className={styles.debtName}>{debt.icon || '💳'} {debt.name}</div>
        <div className={styles.debtMeta}>
          {debt.rate > 0 && <span className={styles.debtRate} style={{ color: debt.rate >= 20 ? 'var(--debt)' : debt.rate >= 10 ? 'var(--warn)' : 'var(--ink-3)' }}>{debt.rate}% APR</span>}
          {utilPct !== null && <span className={styles.debtUtil}>{utilPct}% util</span>}
          {debt.type && <span className={styles.debtType}>{debt.type}</span>}
        </div>
      </div>
      <div className={styles.debtRight}>
        <div className={styles.debtBalance}>${fmtD(debt.balance)}</div>
        <div className={styles.debtMinRow}>
          {editing ? (
            <div className={styles.debtMinEdit}>
              <span>Min $</span>
              <input
                type="number" value={min}
                onChange={e => setMin(e.target.value)}
                className={styles.debtMinInput}
                autoFocus
              />
              <button className={styles.debtMinSave} onClick={save} disabled={saving}>✓</button>
              <button className={styles.debtMinCancel} onClick={() => setEditing(false)}>✕</button>
            </div>
          ) : (
            <button className={styles.debtMinBtn} onClick={() => setEditing(true)}>
              Min: ${fmt(debt.minPayment)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Extra payment impact calculator ──────────────────────────────────────────
function ExtraPaymentCalc({ debts }) {
  const [debtId, setDebtId]   = useState(debts[0]?.id || '')
  const [extra, setExtra]     = useState(100)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function calculate() {
    if (!debtId || !extra) return
    setLoading(true)
    try {
      const r = await api.debtExtraPayment({ debt_id: debtId, extra_monthly: extra })
      setResult(r)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { if (debtId && extra) calculate() }, [debtId, extra])

  return (
    <div className={styles.calcCard}>
      <div className={styles.calcTitle}>Extra Payment Calculator</div>
      <div className={styles.calcControls}>
        <div className={styles.calcGroup}>
          <label className={styles.calcLabel}>Debt</label>
          <select className={styles.calcSelect} value={debtId} onChange={e => setDebtId(e.target.value)}>
            {debts.map(d => (
              <option key={d.id} value={d.id}>{d.name} (${fmt(d.balance)})</option>
            ))}
          </select>
        </div>
        <div className={styles.calcGroup}>
          <label className={styles.calcLabel}>Extra/month</label>
          <div className={styles.calcAmtRow}>
            <span>$</span>
            <input
              type="number" value={extra} min={0} max={10000}
              onChange={e => setExtra(Number(e.target.value))}
              className={styles.calcInput}
            />
          </div>
        </div>
      </div>

      {loading && <div className={styles.calcLoading}>Calculating…</div>}

      {result && !loading && (
        <div className={styles.calcResult}>
          <div className={styles.calcCompare}>
            <div className={styles.calcCol}>
              <div className={styles.calcColLabel}>Without extra</div>
              <div className={styles.calcColVal}>{result.base.months}mo</div>
              <div className={styles.calcColSub}>{result.base.payoffDate}</div>
              <div className={styles.calcColInterest} style={{ color: 'var(--debt)' }}>
                ${fmt(result.base.totalInterest)} interest
              </div>
            </div>
            <div className={styles.calcArrow}>→</div>
            <div className={`${styles.calcCol} ${styles.calcColHighlight}`}>
              <div className={styles.calcColLabel}>With ${fmt(extra)}/mo extra</div>
              <div className={styles.calcColVal}>{result.extra.months}mo</div>
              <div className={styles.calcColSub}>{result.extra.payoffDate}</div>
              <div className={styles.calcColInterest} style={{ color: 'var(--safe)' }}>
                ${fmt(result.extra.totalInterest)} interest
              </div>
            </div>
          </div>
          {result.monthsSaved > 0 && (
            <div className={styles.calcSavings}>
              Save <strong>{result.monthsSaved} months</strong> and <strong style={{ color: 'var(--safe)' }}>${fmt(result.interestSaved)}</strong> in interest
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Debt() {
  const { data, loading, error, refresh } = useApi(api.debt)
  const [extra, setExtra]                 = useState(0)
  const [strategies, setStrategies]       = useState(null)
  const [comparing, setComparing]         = useState(false)

  useEffect(() => {
    if (data?.debts?.length) setStrategies(data.strategies)
  }, [data])

  async function runCompare() {
    if (!data?.debts?.length) return
    setComparing(true)
    try {
      const r = await api.debtCompare({ extra_payment: extra })
      setStrategies(r)
    } catch { /* ignore */ }
    setComparing(false)
  }

  useEffect(() => {
    if (data?.debts?.length) runCompare()
  }, [extra, data])

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const { debts = [], totalDebt = 0, totalMinPayment = 0, weightedAvgRate = 0 } = data || {}
  const hasDebts = debts.length > 0

  return (
    <ScreenWrap>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Debt Strategy</div>
            <div className={styles.sub}>Model your fastest and cheapest path to debt-free</div>
          </div>
        </div>

        {!hasDebts ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎉</div>
            <div className={styles.emptyTitle}>No debts on record</div>
            <div className={styles.emptySub}>Add debt accounts in Accounts with "Is Debt" toggled on to model a payoff strategy.</div>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className={styles.summaryStrip}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryVal} style={{ color: 'var(--debt)' }}>${fmt(totalDebt)}</div>
                <div className={styles.summaryLabel}>Total debt</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryVal}>${fmt(totalMinPayment)}</div>
                <div className={styles.summaryLabel}>Min payments/mo</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryVal} style={{ color: weightedAvgRate >= 15 ? 'var(--debt)' : 'var(--warn)' }}>
                  {weightedAvgRate.toFixed(1)}%
                </div>
                <div className={styles.summaryLabel}>Avg APR</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryVal}>{debts.length}</div>
                <div className={styles.summaryLabel}>Accounts</div>
              </div>
            </div>

            <div className={styles.body}>
              {/* Left column */}
              <div className={styles.leftCol}>
                {/* Extra payment slider */}
                <div className={styles.extraCard}>
                  <div className={styles.extraLabel}>
                    Extra payment per month
                    <span className={styles.extraAmt}>${fmt(extra)}</span>
                  </div>
                  <input
                    type="range" min={0} max={1000} step={25}
                    value={extra}
                    onChange={e => setExtra(Number(e.target.value))}
                    className={styles.slider}
                  />
                  <div className={styles.sliderTicks}>
                    <span>$0</span><span>$250</span><span>$500</span><span>$750</span><span>$1,000</span>
                  </div>
                </div>

                {/* Strategy comparison */}
                {comparing && <div className={styles.comparing}>Running models…</div>}
                {strategies && !comparing && (
                  <>
                    {strategies.comparison?.winner !== 'tie' && (
                      <div className={styles.winner}>
                        <span className={styles.winnerBadge}>
                          {strategies.comparison.winner === 'avalanche' ? '📉' : '🏃'} {strategies.comparison.winner.charAt(0).toUpperCase() + strategies.comparison.winner.slice(1)} wins
                        </span>
                        <span className={styles.winnerDesc}>{strategies.comparison.recommendation}</span>
                      </div>
                    )}

                    <PayoffBar
                      label="Avalanche (highest rate first)"
                      color="var(--debt)"
                      months={strategies.avalanche.months}
                      totalInterest={strategies.avalanche.totalInterest}
                      payoffDate={strategies.avalanche.payoffDate}
                      payoffOrder={strategies.avalanche.payoffOrder}
                    />
                    <PayoffBar
                      label="Snowball (lowest balance first)"
                      color="var(--calm)"
                      months={strategies.snowball.months}
                      totalInterest={strategies.snowball.totalInterest}
                      payoffDate={strategies.snowball.payoffDate}
                      payoffOrder={strategies.snowball.payoffOrder}
                    />

                    {strategies.comparison?.interestSaved > 0 && (
                      <div className={styles.savingsBanner}>
                        💰 Avalanche saves <strong>${fmt(strategies.comparison.interestSaved)}</strong> in interest
                        {strategies.comparison.monthsSaved > 0 && <> and <strong>{strategies.comparison.monthsSaved} months</strong></>} vs Snowball
                      </div>
                    )}
                  </>
                )}

                {/* Extra payment impact calc */}
                <ExtraPaymentCalc debts={debts} />
              </div>

              {/* Right column — debt list */}
              <div className={styles.rightCol}>
                <div className={styles.sectionLabel}>Your Debts</div>
                <div className={styles.debtList}>
                  {debts.map(d => (
                    <DebtRow key={d.id} debt={d} onMinPaymentSave={refresh} />
                  ))}
                </div>
                <div className={styles.minNote}>
                  Tap "Min: $X" on any debt to set your actual minimum payment — this improves model accuracy.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ScreenWrap>
  )
}
