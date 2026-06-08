import { useState, useMemo, useEffect } from 'react'
import { api } from '../../data/api'
import { buildPaydownSummary } from './paydownCalc'
import styles from './Debt.module.css'

function fmt(n)  { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }
function fmtDate(d) { return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }

/**
 * Card Paydown panel.
 * @param target         debt object (highest-util revolving card), from the debt summary
 * @param surplus        monthly amount that would normally go to savings (forecast safeToSave)
 * @param surplusSource  'forecast' | 'allocation' — where the surplus number came from
 * @param onSaved        callback to refresh debt data after saving close day
 */
export default function CardPaydownPanel({ target, surplus = 0, surplusSource = 'forecast', onSaved }) {
  const [closeDay, setCloseDay]   = useState(target?.statementCloseDay || '')
  const [editing, setEditing]     = useState(!target?.statementCloseDay)
  const [saving, setSaving]       = useState(false)

  // keep local state in sync if the target changes
  useEffect(() => {
    setCloseDay(target?.statementCloseDay || '')
    setEditing(!target?.statementCloseDay)
  }, [target?.id, target?.statementCloseDay])

  const summary = useMemo(() => {
    if (!target) return null
    return buildPaydownSummary({
      balance:           target.balance,
      creditLimit:       target.limit,
      perPaycheck:       surplus,         // monthly surplus
      aprPct:            target.rate || 25,
      statementCloseDay: target.statementCloseDay || null,
      payPeriodsPerYear: 12,              // surplus is a MONTHLY figure
      paydays:           [1],             // project month-by-month
    })
  }, [target, surplus])

  if (!target || !target.limit) return null

  const util = summary.currentUtil
  const utilColor = util > 50 ? 'var(--debt)' : util > 30 ? 'var(--warn)' : 'var(--safe)'
  const ringPct = Math.min(util, 100)
  const circ = 2 * Math.PI * 50  // r=50

  async function saveCloseDay() {
    const day = Number(closeDay)
    if (!Number.isInteger(day) || day < 1 || day > 31) return
    setSaving(true)
    await api.debtSetStatementDay(target.id, { statement_close_day: day }).catch(() => {})
    setSaving(false)
    setEditing(false)
    onSaved?.()
  }

  return (
    <div className={styles.paydown}>
      <div className={styles.paydownHead}>
        <span className={styles.paydownTitle}>Card Paydown</span>
        <span className={styles.paydownTarget}>
          Target: <span className={styles.paydownTargetName}>{target.icon || '💳'} {target.name}</span>
        </span>
      </div>

      {/* utilization ring */}
      <div className={styles.paydownRingWrap}>
        <svg viewBox="0 0 120 120" className={styles.paydownRing} role="img" aria-label={`${Math.round(util)} percent utilization`}>
          <circle cx="60" cy="60" r="50" className={styles.paydownRingTrack} />
          <circle
            cx="60" cy="60" r="50"
            className={styles.paydownRingFill}
            style={{ stroke: utilColor, strokeDasharray: `${(ringPct / 100) * circ} ${circ}` }}
          />
        </svg>
        <div className={styles.paydownRingCenter}>
          <span className={styles.paydownUtilNum} style={{ color: utilColor }}>{Math.round(util)}%</span>
          <span className={styles.paydownUtilSub}>${fmt(target.balance)} / ${fmt(target.limit)}</span>
        </div>
      </div>

      {/* milestone chips */}
      <div className={styles.paydownChips}>
        <div className={styles.paydownChip} style={{ '--sc': 'var(--warn)' }}>
          <span className={styles.paydownChipLabel}>Under 30%</span>
          <span className={styles.paydownChipDate}>
            {summary.to30.reachable ? fmtDate(summary.date30) : 'Raise payment'}
          </span>
        </div>
        <div className={styles.paydownChip} style={{ '--sc': 'var(--safe)' }}>
          <span className={styles.paydownChipLabel}>Under 10%</span>
          <span className={styles.paydownChipDate}>
            {summary.to10.reachable ? fmtDate(summary.date10) : 'Raise payment'}
          </span>
        </div>
      </div>

      {/* the plan */}
      <div className={styles.paydownAction}>
        {surplus > 0 ? (
          <>
            <div className={styles.paydownActionTop}>
              <span className={styles.paydownActionLabel}>Redirect to this card / month</span>
              <span className={styles.paydownActionAmt}>${fmt(surplus)}</span>
            </div>
            <div className={styles.paydownDeadline}>
              {summary.to30.reachable ? (
                <>Putting your <strong>${fmt(surplus)}/mo</strong> savings surplus here gets you under <strong>30%</strong> by <strong>{fmtDate(summary.date30)}</strong>{summary.to10.reachable && <> and under 10% by <strong>{fmtDate(summary.date10)}</strong></>}.</>
              ) : (
                <>${fmt(surplus)}/mo barely covers interest at {target.rate || 25}% APR — you'll need more than the savings surplus to make real progress.</>
              )}
            </div>
            {summary.timing && (
              <div className={`${styles.paydownDeadline} ${summary.timing.willReportThisCycle ? '' : styles.missed}`} style={{ marginTop: 6 }}>
                {summary.timing.willReportThisCycle ? (
                  <>This month, pay by <strong>{fmtDate(summary.timing.reportSafeDeadline)}</strong> ({summary.timing.daysUntilDeadline}d) so the lower balance reports to the bureaus.</>
                ) : (
                  <>Statement already closed this month — a payment now reports <strong>next cycle</strong>.</>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.paydownActionTop}>
              <span className={styles.paydownActionLabel}>Savings surplus available</span>
              <span className={styles.paydownActionAmt}>$0</span>
            </div>
            <div className={styles.paydownDeadline}>
              Your cash-flow forecast doesn't show any surplus heading to savings right now, so there's nothing extra to redirect. Set up your income and bills in the Calendar/forecast so Lumen can find your monthly surplus — or pay whatever you can spare manually.
            </div>
          </>
        )}
      </div>

      {/* statement close day setter */}
      <div className={styles.paydownSetClose}>
        {editing ? (
          <>
            <span>Statement closes on day</span>
            <input
              type="number" min={1} max={31} value={closeDay}
              onChange={e => setCloseDay(e.target.value)}
              className={styles.paydownCloseInput}
              placeholder="14"
            />
            <button className={styles.paydownCloseSave} onClick={saveCloseDay} disabled={saving}>
              {saving ? '…' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <span>Statement closes on the <strong>{target.statementCloseDay}th</strong></span>
            <button className={styles.paydownCloseSave} onClick={() => setEditing(true)} style={{ background: 'transparent', color: 'var(--calm)', border: '1px solid var(--ink-5)' }}>
              Edit
            </button>
          </>
        )}
      </div>

      {/* guardrail */}
      <div className={styles.paydownGuard}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>
          {surplusSource === 'forecast'
            ? <>This is money your forecast would move to <strong>savings</strong> — your emergency fund and bills stay covered first.</>
            : <>From your paycheck <strong>surplus</strong> — emergency fund untouched.</>}
        </span>
      </div>

      {summary.to30.reachable && summary.to30.totalInterestPaid > 0 && (
        <p className={styles.paydownNote}>
          Est. ${fmt(summary.to30.totalInterestPaid)} interest reaching 30% at {target.rate || 25}% APR.
          Paying before the close date is what moves your score — not the due date.
        </p>
      )}
    </div>
  )
}
