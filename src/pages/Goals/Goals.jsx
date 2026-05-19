import { useState, useEffect } from 'react'
import PageShell from '../../components/PageShell/PageShell'
import { api } from '../../data/api'
import styles from './Goals.module.css'

const GOAL_TYPES = [
  { value: 'savings',        label: 'Savings Goal',      icon: '💰' },
  { value: 'emergency_fund', label: 'Emergency Fund',    icon: '🛡️' },
  { value: 'debt_payoff',    label: 'Debt Payoff',       icon: '💳' },
  { value: 'spending_limit', label: 'Spending Limit',    icon: '📊' },
]

const TYPE_META = {
  savings:        { icon: '💰', color: 'safe'  },
  emergency_fund: { icon: '🛡️', color: 'calm'  },
  debt_payoff:    { icon: '💳', color: 'debt'  },
  spending_limit: { icon: '📊', color: 'warn'  },
}

export default function Goals() {
  const [goals, setGoals]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [selected, setSelected]   = useState(null)
  const [contributeGoal, setContribute] = useState(null)
  const [contributeAmt, setContributeAmt] = useState('')
  const [saving, setSaving]       = useState(false)

  const [form, setForm] = useState({
    name: '', type: 'savings', target_amount: '', current_amount: '0',
    monthly_contribution: '', target_date: '', notes: '', icon: '', color: ''
  })

  async function load() {
    try {
      setLoading(true)
      const data = await api.goals()
      setGoals(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ name: '', type: 'savings', target_amount: '', current_amount: '0', monthly_contribution: '', target_date: '', notes: '', icon: '', color: '' })
    setSelected(null)
    setShowForm(true)
  }

  function openEdit(g) {
    setForm({
      name: g.name,
      type: g.type,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      monthly_contribution: g.monthly_contribution || '',
      target_date: g.target_date ? g.target_date.split('T')[0] : '',
      notes: g.notes || '',
      icon: g.icon || '',
      color: g.color || '',
    })
    setSelected(g)
    setShowForm(true)
  }

  async function saveGoal(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const meta = TYPE_META[form.type] || {}
      const body = {
        ...form,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount || 0),
        monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution) : null,
        target_date: form.target_date || null,
        icon: form.icon || meta.icon,
        color: form.color || meta.color,
      }
      if (selected) {
        await api.updateGoal(selected.id, body)
      } else {
        await api.createGoal(body)
      }
      setShowForm(false)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteGoal(id) {
    if (!confirm('Archive this goal?')) return
    await api.deleteGoal(id)
    load()
  }

  async function handleContribute(e) {
    e.preventDefault()
    if (!contributeAmt || isNaN(parseFloat(contributeAmt))) return
    setSaving(true)
    try {
      await api.contributeGoal(contributeGoal.id, { amount: parseFloat(contributeAmt) })
      setContribute(null)
      setContributeAmt('')
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalSavings = goals.filter(g => g.type === 'savings' || g.type === 'emergency_fund').reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const totalDebt = goals.filter(g => g.type === 'debt_payoff').reduce((s, g) => s + parseFloat(g.target_amount - (g.current_amount || 0)), 0)

  return (
    <PageShell title="Goals" subtitle="Track your financial targets">
      {/* Summary strip */}
      <div className={styles.strip}>
        <div className={styles.stripCard}>
          <span className={styles.stripLabel}>Active Goals</span>
          <span className={styles.stripVal}>{goals.length}</span>
        </div>
        <div className={styles.stripCard}>
          <span className={styles.stripLabel}>Saved Toward Goals</span>
          <span className={styles.stripVal}>${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
        <div className={styles.stripCard}>
          <span className={styles.stripLabel}>Debt Remaining</span>
          <span className={styles.stripVal} style={{ color: totalDebt > 0 ? 'var(--col-debt)' : 'inherit' }}>
            ${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <button className={styles.addBtn} onClick={openNew}>+ New Goal</button>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : !goals.length ? (
        <div className={styles.emptyState}>
          <span style={{ fontSize: 48 }}>🎯</span>
          <h3>No goals yet</h3>
          <p>Set a savings target, build an emergency fund, pay off debt — goals keep you on track.</p>
          <button className={styles.addBtn} onClick={openNew}>Create your first goal</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {goals.map(g => {
            const meta = TYPE_META[g.type] || { icon: '🎯', color: 'calm' }
            const pct = Math.min(100, parseFloat(g.progress_pct || 0))
            const current = parseFloat(g.current_amount || 0)
            const target = parseFloat(g.target_amount)
            const remaining = Math.max(0, target - current)
            return (
              <div key={g.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>{g.icon || meta.icon}</span>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardName}>{g.name}</div>
                    <div className={styles.cardType}>{GOAL_TYPES.find(t => t.value === g.type)?.label || g.type}</div>
                  </div>
                  <div className={styles.cardActions}>
                    <button onClick={() => setContribute(g)} title="Add funds">+</button>
                    <button onClick={() => openEdit(g)} title="Edit">✏️</button>
                    <button onClick={() => deleteGoal(g.id)} title="Archive">🗑️</button>
                  </div>
                </div>

                <div className={styles.progressWrap}>
                  <div className={styles.progressBar} style={{ '--pct': `${pct}%`, '--color': `var(--col-${meta.color})` }} />
                </div>

                <div className={styles.cardStats}>
                  <div>
                    <span className={styles.statVal}>${current.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    <span className={styles.statLabel}> saved</span>
                  </div>
                  <span className={styles.statPct}>{pct.toFixed(0)}%</span>
                  <div>
                    <span className={styles.statVal}>${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    <span className={styles.statLabel}> target</span>
                  </div>
                </div>

                {g.months_remaining != null && (
                  <div className={styles.eta}>
                    ~{g.months_remaining} month{g.months_remaining !== 1 ? 's' : ''} at ${parseFloat(g.monthly_contribution || 0).toLocaleString()} /mo
                  </div>
                )}
                {g.target_date && (
                  <div className={styles.eta}>Target date: {new Date(g.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                )}
                {remaining > 0 && (
                  <div className={styles.remaining}>${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} to go</div>
                )}
                {pct >= 100 && (
                  <div className={styles.complete}>✅ Goal reached!</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New / Edit Modal */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{selected ? 'Edit Goal' : 'New Goal'}</h3>
            <form onSubmit={saveGoal} className={styles.form}>
              <label>Goal Name
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund" />
              </label>
              <label>Type
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </label>
              <div className={styles.row}>
                <label>Target Amount ($)
                  <input type="number" required min="1" step="0.01" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="10000" />
                </label>
                <label>Current Amount ($)
                  <input type="number" min="0" step="0.01" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} placeholder="0" />
                </label>
              </div>
              <div className={styles.row}>
                <label>Monthly Contribution ($)
                  <input type="number" min="0" step="0.01" value={form.monthly_contribution} onChange={e => setForm(f => ({ ...f, monthly_contribution: e.target.value }))} placeholder="Optional" />
                </label>
                <label>Target Date
                  <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                </label>
              </div>
              <label>Notes
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving…' : selected ? 'Save Changes' : 'Create Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeGoal && (
        <div className={styles.overlay} onClick={() => setContribute(null)}>
          <div className={styles.modal} style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add to "{contributeGoal.name}"</h3>
            <form onSubmit={handleContribute} className={styles.form}>
              <label>Amount ($)
                <input type="number" required min="0.01" step="0.01" autoFocus value={contributeAmt} onChange={e => setContributeAmt(e.target.value)} placeholder="e.g. 500" />
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setContribute(null)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Add Funds'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
