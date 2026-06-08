/* Small shared formatters used across the data pages. */
export const money = (n, { sign = false } = {}) => {
  const v = Number(n) || 0
  const s = v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return sign && v > 0 ? `+${s}` : s
}

export const money0 = (n) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const initial = (s) => (s || '?').trim()[0]?.toUpperCase() || '?'

export const fmtDate = (d) => {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const relDay = (n) => {
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  return `In ${n} days`
}
