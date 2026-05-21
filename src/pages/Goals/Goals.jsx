import { useState, useEffect } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import AnimatedBar from '../../components/AnimatedBar/AnimatedBar'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { api } from '../../data/api'
import styles from './Goals.module.css'

const GOAL_TYPES = [
  { value: 'savings',        label: 'Savings Goal',   icon: '💰' },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: '🛡️' },
  { value: 'debt_payoff',    label: 'Debt Payoff',    icon: '💳' },
  { value: 'spending_limit', label: 'Spending Limit', icon: '📊' },
]

const TYPE_META = {
  savings:        { icon: '💰', accentVar: '--safe'  },
  emergency_fund: { icon: '🛡️', accentVar: '--calm'  },
  debt_payoff:    { icon: '💳', accentVar: '--debt'  },
  spending_limit: { icon: '📊', accentVar: '--warn'  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal card
// ─────────────────────────────────────────────────────────────────────────────
function GoalCard({ goal, index = 0, onEdit, onContribute, onDelete }) {
  const meta    = TYPE_META[goal.type] || { icon: '🎯', accentVar: '--calm' }
  const pct     = Math.min(100, parseFloat(goal.progress_pct || 0))
  const current = parseFloat(goal.current_amount || 0)
  const target  = parseFloat(goal.target_amount)
  const remaining = Math.max(0, target - current)
  const typeLabel = GOAL_TYPES.find(t => t.value === goal.type)?.label || goal.type

  return (
    <div className={styles.goalCard} style={{ animationDelay: `${index * 60}ms` }}>
      <div className={styles.cardHead}>
        <span className={styles.cardIcon}>{goal.icon || meta.icon}</span>
        <div className={styles.cardMeta}>
          <div className={styles.cardName}>{goal.name}</div>
          <div className={styles.cardType}>{typeLabel}</div>
        </div>
        <div className={styles.cardActions}>
          <button className={styles.cardBtn} onClick={() => onContribute(goal)} title="Add funds">+</button>
          <button className={styles.cardBtn} onClick={() => onEdit(goal)} title="Edit">✏</button>
          <button className={`${styles.cardBtn} ${styles.cardBtnDelete}`} onClick={() => onDelete(goal.id)} title="Archive">✕</button>
        </div>
      </div>

      {/* Progress bar */}
      <AnimatedBar pct={pct} color={`var(${meta.accentVar})`} height={4} />

      <div className={styles.cardStats}>
        <div className={styles.cardStat}>
          <span className={styles.csVal} style={{ color: `var(${meta.accentVar})` }}>
            ${current.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
          <span className={styles.csLabel}>saved</span>
        </div>
        <div className={styles.pctBadge}>{pct.toFixed(0)}%</div>
        <div className={styles.cardStat} style={{ textAlign: 'right' }}>
          <span className={styles.csVal}>${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <span className={styles.csLabel}>target</span>
        </div>
      </div>

      {pct >= 100 ? (
        <div className={styles.completeBadge}>✓ Goal reached</div>
      ) : remaining > 0 ? (
        <div className={styles.remainNote}>
          ${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} remaining
          {goal.months_remaining != null && ` · ~${goal.months_remaining}mo at $${parseFloat(goal.monthly_contribution||0).toLocaleString()}/mo`}
        </div>
      ) : null}

      {goal.target_date && (
        <div className={styles.remainNote}>
          Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
function GoalModal({ goal, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:                 goal?.name                 || '',
    type:                 goal?.type                 || 'savings',
    target_amount:        goal?.target_amount        || '',
    current_amount:       goal?.current_amount       || '0',
    monthly_contribution: goal?.monthly_contribution || '',
    target_date:          goal?.target_date ? goal.target_date.split('T')[0] : '',
    notes:                goal?.notes                || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim())      return setError('Enter a goal name')
    if (!form.target_amount)    return setError('Enter a target amount')
    setSaving(true)
    try {
      const meta = TYPE_META[form.type] || {}
      await onSaved({
        ...form,
        target_amount:        parseFloat(form.target_amount),
        current_amount:       parseFloat(form.current_amount  || 0),
        monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution) : null,
        target_date:          form.target_date || null,
        icon:  meta.icon,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalPre}>{goal ? 'Edit Goal' : 'New Goal'}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Goal Name</span>
              <input className={styles.fieldInput} required value={form.name}
                onChange={e => setF('name', e.target.value)} placeholder="e.g. Emergency Fund" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Type</span>
              <select className={styles.fieldSelect} value={form.type} onChange={e => setF('type', e.target.value)}>
                {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Target Amount</span>
              <input className={styles.fieldInput} type="number" required min="1" step="0.01"
                value={form.target_amount} onChange={e => setF('target_amount', e.target.value)} placeholder="10000" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Current Amount</span>
              <input className={styles.fieldInput} type="number" min="0" step="0.01"
                value={form.current_amount} onChange={e => setF('current_amount', e.target.value)} placeholder="0" />
            </label>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Monthly Contribution</span>
              <input className={styles.fieldInput} type="number" min="0" step="0.01"
                value={form.monthly_contribution} onChange={e => setF('monthly_contribution', e.target.value)} placeholder="Optional" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Target Date</span>
              <input className={styles.fieldInput} type="date"
                value={form.target_date} onChange={e => setF('target_date', e.target.value)} />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Notes</span>
            <input className={styles.fieldInput}
              value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Optional" />
          </label>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Contribute modal
// ─────────────────────────────────────────────────────────────────────────────
function ContributeModal({ goal, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) return
    setSaving(true)
    try {
      await api.contributeGoal(goal.id, { amount: parseFloat(amount) })
      onDone()
    } catch (err) {
      alert(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalPre}>Add to "{goal.name}"</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Amount ($)</span>
            <input className={styles.fieldInput} type="number" required min="0.01" step="0.01"
              autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" />
          </label>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Add Funds'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Goals() {
  const [goals,      setGoals]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [editGoal,   setEditGoal]   = useState(null)
  const [contGoal,   setContGoal]   = useState(null)

  async function load() {
    try {
      setLoading(true); setError(null)
      setGoals(await api.goals())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave(body) {
    if (editGoal) {
      await api.updateGoal(editGoal.id, body)
    } else {
      await api.createGoal(body)
    }
    setShowForm(false)
    setEditGoal(null)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Archive this goal?')) return
    await api.deleteGoal(id)
    load()
  }

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const totalSavings = goals
    .filter(g => g.type === 'savings' || g.type === 'emergency_fund')
    .reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)

  const totalDebt = goals
    .filter(g => g.type === 'debt_payoff')
    .reduce((s, g) => s + Math.max(0, parseFloat(g.target_amount) - parseFloat(g.current_amount || 0)), 0)

  const activeGoals = goals.length

  return (
    <ScreenWrap>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pre}>Finance</div>
          <h1 className={styles.title}>Goals</h1>
          <p className={styles.sub}>Set targets, track progress, stay on course.</p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statL}>Active Goals</div>
              <div className={styles.statV}>{activeGoals}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statL}>Saved Toward Goals</div>
              <div className={styles.statV}>${totalSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
            {totalDebt > 0 && (
              <div className={styles.stat}>
                <div className={styles.statL}>Debt Remaining</div>
                <div className={styles.statV} style={{ color: 'var(--debt)' }}>
                  ${totalDebt.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.newGoalBtn} onClick={() => { setEditGoal(null); setShowForm(true) }}>
            + New Goal
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {!goals.length ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No goals yet</div>
            <p className={styles.emptySub}>
              Set a savings target, build an emergency fund, or track debt payoff.
              Goals give your money a direction.
            </p>
            <button className={styles.newGoalBtn} onClick={() => { setEditGoal(null); setShowForm(true) }}>
              Create your first goal
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {goals.map((g, i) => (
              <GoalCard
                key={g.id}
                goal={g}
                index={i}
                onEdit={g => { setEditGoal(g); setShowForm(true) }}
                onContribute={g => setContGoal(g)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <GoalModal
          goal={editGoal}
          onClose={() => { setShowForm(false); setEditGoal(null) }}
          onSaved={handleSave}
        />
      )}
      {contGoal && (
        <ContributeModal
          goal={contGoal}
          onClose={() => setContGoal(null)}
          onDone={() => { setContGoal(null); load() }}
        />
      )}
    </ScreenWrap>
  )
}
