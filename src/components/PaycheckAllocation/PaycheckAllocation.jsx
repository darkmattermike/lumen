import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './PaycheckAllocation.module.css'

function fmt(n, decimals = 0) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function AccountCard({ acct }) {
  const [open, setOpen] = useState(false)

  const hasPending = acct.pendingItems?.length > 0
  const hasMissing = acct.missingItems?.length > 0

  return (
    <div className={`${styles.acctCard} ${acct.alreadyFunded ? styles.funded : ''}`}>
      {/* Header row */}
      <div className={styles.acctHead} onClick={() => setOpen(o => !o)}>
        <span className={styles.acctIcon}>{acct.icon || '🏦'}</span>
        <span className={styles.acctName}>{acct.name}</span>
        {hasMissing && <span className={styles.missingBadge}>!</span>}
        <span className={`${styles.acctNeed} ${acct.alreadyFunded ? styles.needFunded : ''}`}>
          {acct.alreadyFunded
            ? '✓ Funded'
            : `+$${fmt(acct.needFrom)}`}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
      </div>

      {/* Balance row — always visible */}
      <div className={styles.acctBalance}>
        <div className={styles.balRow}>
          <span className={styles.balLabel}>Reported</span>
          <span className={styles.balVal}>${fmt(acct.reportedBalance)}</span>
        </div>
        {acct.pendingDeduction > 0 && (
          <div className={styles.balRow}>
            <span className={styles.balLabel}>Pending charges</span>
            <span className={styles.balVal} style={{ color: 'var(--warn)' }}>
              −${fmt(acct.pendingDeduction)}
            </span>
          </div>
        )}
        <div className={`${styles.balRow} ${styles.balEffective}`}>
          <span className={styles.balLabel}>Effective balance</span>
          <span className={styles.balVal} style={{ color: acct.effectiveBalance < 0 ? 'var(--debt)' : 'var(--ink-0)' }}>
            ${fmt(acct.effectiveBalance)}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className={styles.acctDetail}>

          {/* Pending items */}
          {hasPending && (
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Pending (not yet posted)</div>
              {acct.pendingItems.map((item, i) => (
                <div key={i} className={styles.detailRow}>
                  <span className={styles.detailName}>{item.name}</span>
                  <span className={styles.detailSub}>
                    {item.daysOverdue === 0 ? 'due today' : `${item.daysOverdue}d overdue`}
                  </span>
                  <span className={styles.detailAmt} style={{ color: 'var(--warn)' }}>
                    −${fmt(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Missing items warning */}
          {hasMissing && (
            <div className={styles.missingSection}>
              <div className={styles.missingLabel}>⚠ Expected but not posted</div>
              {acct.missingItems.map((item, i) => (
                <div key={i} className={styles.detailRow}>
                  <span className={styles.detailName}>{item.name}</span>
                  <span className={styles.detailSub}>{item.daysOverdue}d overdue</span>
                  <span className={styles.detailAmt} style={{ color: 'var(--debt)' }}>
                    −${fmt(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming bills in window */}
          {acct.futureBills?.length > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Bills before next paycheck</div>
              {acct.futureBills.map((bill, i) => (
                <div key={i} className={styles.detailRow}>
                  <span className={styles.detailName}>{bill.icon} {bill.name}</span>
                  <span className={styles.detailSub}>{fmtDate(bill.dueDate)}</span>
                  <span className={styles.detailAmt}>−${fmt(bill.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buffer */}
          {acct.buffer > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.detailRow}>
                <span className={styles.detailName}>Spending buffer</span>
                <span className={styles.detailSub}>always-on reserve</span>
                <span className={styles.detailAmt}>−${fmt(acct.buffer)}</span>
              </div>
            </div>
          )}

          {/* Need summary */}
          <div className={styles.needSummary}>
            {acct.alreadyFunded ? (
              <span style={{ color: 'var(--safe)' }}>Account already funded — nothing needed from this paycheck.</span>
            ) : (
              <span>Move <strong style={{ color: 'var(--safe)' }}>${fmt(acct.needFrom)}</strong> into {acct.name}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaycheckAllocation() {
  const { data, loading, error } = useApi(api.paycheckAllocation)

  if (loading) return (
    <div className={styles.wrap}>
      <div className={styles.skeleton} />
    </div>
  )

  if (error || !data?.hasPaycheck) return null

  const {
    paycheck, windowEnd, accounts, goals,
    unassignedBills, unassignedTotal,
    totalNeeded, paycheckAmount, surplus, isDeficit, summary,
  } = data

  const daysLabel = paycheck.landed
    ? (paycheck.posted ? 'landed & posted' : 'landed · not yet posted')
    : `in ${paycheck.daysUntil} day${paycheck.daysUntil === 1 ? '' : 's'}`

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            Paycheck Allocation
          </div>
          <div className={styles.paycheckAmt}>${fmt(paycheck.amount)}</div>
          <div className={styles.paycheckMeta}>
            {paycheck.name} · {daysLabel} · covers to {fmtDate(windowEnd)}
          </div>
        </div>
        <div className={`${styles.surplusChip} ${isDeficit ? styles.deficit : ''}`}>
          {isDeficit
            ? `−$${fmt(Math.abs(surplus))} short`
            : `+$${fmt(surplus)} left`}
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className={styles.summary}>{summary}</div>
      )}

      {/* Progress bar: totalNeeded vs paycheck */}
      <div className={styles.progressWrap}>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${isDeficit ? styles.progressOver : ''}`}
            style={{ width: `${Math.min((totalNeeded / paycheckAmount) * 100, 100)}%` }}
          />
        </div>
        <div className={styles.progressLabels}>
          <span>${fmt(totalNeeded)} allocated</span>
          <span>${fmt(paycheckAmount)} total</span>
        </div>
      </div>

      {/* Per-account cards */}
      <div className={styles.accounts}>
        {accounts.map(acct => (
          <AccountCard key={acct.id} acct={acct} />
        ))}
      </div>

      {/* Savings goals */}
      {goals.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Savings goals</div>
          {goals.map(g => (
            <div key={g.id} className={styles.goalRow}>
              <span className={styles.goalIcon}>{g.icon}</span>
              <span className={styles.goalName}>{g.name}</span>
              <span className={styles.goalAmt} style={{ color: 'var(--calm)' }}>
                +${fmt(g.contrib)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Unassigned bills */}
      {unassignedBills.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Bills without an account assigned</div>
          {unassignedBills.map((b, i) => (
            <div key={i} className={styles.goalRow}>
              <span className={styles.goalIcon}>{b.icon || '📋'}</span>
              <span className={styles.goalName}>{b.name}</span>
              <span className={styles.goalAmt} style={{ color: 'var(--warn)' }}>
                ${fmt(b.amount)}
              </span>
            </div>
          ))}
          <div className={styles.unassignedNote}>
            Tag these to an account in Calendar → recurring items so they're included automatically.
          </div>
        </div>
      )}
    </div>
  )
}
