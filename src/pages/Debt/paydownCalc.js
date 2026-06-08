// paydownCalc.js — Card Paydown calculations for the Debt page.
// Pure functions, no side effects.

function round2(n) { return Math.round(n * 100) / 100 }
function stripTime(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

/**
 * How much is free to send this pay period, after protecting the emergency
 * fund and covering bills due before the next paycheck.
 */
export function safeToSend({ effectiveBalance, billsDueBeforeNextPay, emergencyFundFloor, discretionaryBuffer = 0 }) {
  const surplus = effectiveBalance - billsDueBeforeNextPay - emergencyFundFloor - discretionaryBuffer
  return Math.max(0, round2(surplus))
}

/**
 * Periods until the card crosses a utilization threshold, with interest accrual.
 * Returns { targetBalance, amountToPay, periods, reachable, totalInterestPaid }.
 */
export function projectToThreshold({ balance, creditLimit, perPaycheck, aprPct, payPeriodsPerYear = 24, targetUtilPct = 30 }) {
  const targetBalance = round2(creditLimit * (targetUtilPct / 100))
  if (balance <= targetBalance) {
    return { targetBalance, amountToPay: 0, periods: 0, reachable: true, totalInterestPaid: 0 }
  }
  const periodRate = aprPct / 100 / payPeriodsPerYear
  let bal = balance, periods = 0, totalInterestPaid = 0
  const MAX = 1000
  while (bal > targetBalance && periods < MAX) {
    const interest = bal * periodRate
    if (perPaycheck <= interest) {
      return { targetBalance, amountToPay: round2(balance - targetBalance), periods: Infinity, reachable: false, totalInterestPaid: round2(totalInterestPaid) }
    }
    totalInterestPaid += interest
    bal = bal + interest - perPaycheck
    periods += 1
  }
  return { targetBalance, amountToPay: round2(balance - targetBalance), periods, reachable: periods < MAX, totalInterestPaid: round2(totalInterestPaid) }
}

/** Convert N pay periods into a date, given twice-monthly paydays (default 1st & 15th). */
export function periodsToDate(periods, from = new Date(), paydays = [1, 15]) {
  if (!isFinite(periods)) return null
  const d = new Date(from)
  let remaining = Math.ceil(periods)
  const sorted = [...paydays].sort((a, b) => a - b)
  while (remaining > 0) {
    const day = d.getDate()
    const next = sorted.find(p => p > day)
    if (next !== undefined) d.setDate(next)
    else d.setMonth(d.getMonth() + 1, sorted[0])
    remaining -= 1
  }
  return d
}

/** Statement-close timing. Returns deadline to pay by and whether it reports this cycle. */
export function statementTiming({ statementCloseDay, today = new Date(), processingBufferDays = 2 }) {
  if (!statementCloseDay) return null
  const t = stripTime(today)
  const closeDate = stripTime(today)
  if (t.getDate() <= statementCloseDay) closeDate.setDate(statementCloseDay)
  else closeDate.setMonth(closeDate.getMonth() + 1, statementCloseDay)
  const reportSafeDeadline = new Date(closeDate)
  reportSafeDeadline.setDate(reportSafeDeadline.getDate() - processingBufferDays)
  const daysUntilDeadline = Math.ceil((reportSafeDeadline - t) / 86400000)
  return { closeDate, reportSafeDeadline, daysUntilDeadline, willReportThisCycle: daysUntilDeadline >= 0 }
}

/** Full summary for the UI in one call. */
export function buildPaydownSummary({ balance, creditLimit, perPaycheck, aprPct, statementCloseDay, payPeriodsPerYear = 24, paydays = [1, 15], today = new Date() }) {
  const currentUtil = creditLimit > 0 ? round2((balance / creditLimit) * 100) : 0
  const pp = perPaycheck > 0 ? perPaycheck : 1
  const to30 = projectToThreshold({ balance, creditLimit, perPaycheck: pp, aprPct, payPeriodsPerYear, targetUtilPct: 30 })
  const to10 = projectToThreshold({ balance, creditLimit, perPaycheck: pp, aprPct, payPeriodsPerYear, targetUtilPct: 10 })
  return {
    currentUtil,
    date30: periodsToDate(to30.periods, today, paydays),
    date10: periodsToDate(to10.periods, today, paydays),
    to30, to10,
    timing: statementTiming({ statementCloseDay, today }),
  }
}
