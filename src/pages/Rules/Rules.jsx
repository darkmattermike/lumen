import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './Rules.module.css'

const OPERATORS = [
  { value: 'contains',    label: 'contains' },
  { value: 'equals',      label: 'equals' },
  { value: 'starts_with', label: 'starts with' },
]

const ACTIONS = [
  { value: 'set_category', label: 'Set category to' },
  { value: 'set_type',     label: 'Set type to' },
  { value: 'set_note',     label: 'Set note to' },
]

const TYPE_OPTS = ['expense', 'income', 'transfer']

const ACTION_COLORS = {
  set_category: 'var(--safe)',
  set_type:     'var(--calm)',
  set_note:     'var(--warn)',
}

const EXAMPLES = [
  { name: 'Whole Foods → Groceries', operator: 'contains',    match_value: 'whole foods', action: 'set_category', action_value: 'Groceries' },
  { name: 'Paycheck → Income',       operator: 'contains',    match_value: 'direct deposit', action: 'set_type', action_value: 'income' },
  { name: 'Venmo → Transfer',        operator: 'equals',      match_value: 'venmo', action: 'set_type', action_value: 'transfer' },
  { name: 'Starbucks → Coffee note', operator: 'starts_with', match_value: 'starbucks', action: 'set_note', action_value: 'Coffee run' },
]

// ── Individual rule row ───────────────────────────────────────
function RuleRow({ rule, budgets, onDelete, onToggle, onSaved }) {
  const [toggling, setToggling] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({
    name: rule.name, operator: rule.operator, match_value: rule.match_value,
    action: rule.action, action_value: rule.action_value,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const actionColor   = ACTION_COLORS[rule.action] || 'var(--ink-2)'
  const operatorLabel = OPERATORS.find(o => o.value === rule.operator)?.label || rule.operator
  const actionLabel   = ACTIONS.find(a => a.value === rule.action)?.label || rule.action
  const sortedBudgets = [...budgets].sort((a, b) => a.name.localeCompare(b.name))

  function setF(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'action') next.action_value = ''
      return next
    })
    setError('')
  }

  async function handleToggle() {
    setToggling(true)
    await onToggle(rule.id, !rule.active)
    setToggling(false)
  }

  async function handleSave() {
    if (!form.match_value.trim())  return setError('Enter a value to match against')
    if (!form.action_value.trim()) return setError('Enter a value for the action')
    setSaving(true)
    try {
      await onSaved(rule.id, {
        name:         form.name.trim() || `${form.match_value} → ${form.action_value}`,
        operator:     form.operator,
        match_value:  form.match_value.trim(),
        action:       form.action,
        action_value: form.action_value.trim(),
      })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm({
      name: rule.name, operator: rule.operator, match_value: rule.match_value,
      action: rule.action, action_value: rule.action_value,
    })
    setError('')
    setEditing(false)
  }

  return (
    <div className={`${styles.ruleRow} ${!rule.active ? styles.ruleRowOff : ''} ${editing ? styles.ruleRowEditing : ''}`}>
      {editing ? (
        <div className={styles.ruleEditBody}>
          <div className={styles.ruleBuilder}>
            <div className={styles.builderRow}>
              <span className={styles.builderLabel}>When transaction name</span>
              <select className={styles.builderSelect} value={form.operator} onChange={e => setF('operator', e.target.value)}>
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                className={styles.builderInput}
                value={form.match_value}
                onChange={e => setF('match_value', e.target.value)}
                placeholder="e.g. Starbucks, WHOLEFDS"
              />
            </div>

            <div className={styles.builderRow}>
              <span className={styles.builderLabel}>→ then</span>
              <select
                className={styles.builderSelect}
                value={form.action}
                onChange={e => setF('action', e.target.value)}
                style={{ color: ACTION_COLORS[form.action] }}
              >
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>

              {form.action === 'set_category' && (
                <select className={styles.builderSelect} value={form.action_value} onChange={e => setF('action_value', e.target.value)}>
                  <option value="">— pick a category —</option>
                  {sortedBudgets.map(b => <option key={b.id} value={b.name}>{b.icon} {b.name}</option>)}
                </select>
              )}
              {form.action === 'set_type' && (
                <select className={styles.builderSelect} value={form.action_value} onChange={e => setF('action_value', e.target.value)}>
                  <option value="">— pick a type —</option>
                  {TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {form.action === 'set_note' && (
                <input
                  className={styles.builderInput}
                  value={form.action_value}
                  onChange={e => setF('action_value', e.target.value)}
                  placeholder="e.g. Client dinner"
                />
              )}
            </div>

            <div className={styles.builderRowFull}>
              <span className={styles.builderLabel}>Label (optional)</span>
              <input
                className={styles.builderInput}
                value={form.name}
                onChange={e => setF('name', e.target.value)}
                placeholder={`${form.match_value || '...'} → ${form.action_value || '...'}`}
              />
            </div>
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.editFooter}>
            <button className={styles.editCancel} onClick={handleCancel}>Cancel</button>
            <button className={styles.editSave} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.ruleMain}>
            <div className={styles.ruleName}>{rule.name}</div>
            <div className={styles.ruleDesc}>
              <span className={styles.ruleChip}>name</span>
              <span className={styles.ruleOp}>{operatorLabel}</span>
              <span className={styles.ruleVal}>"{rule.match_value}"</span>
              <span className={styles.ruleArrow}>→</span>
              <span className={styles.ruleAction} style={{ color: actionColor }}>{actionLabel}</span>
              <span className={styles.ruleVal} style={{ color: actionColor }}>"{rule.action_value}"</span>
            </div>
          </div>
          <div className={styles.ruleActions}>
            <button
              className={`${styles.toggleBtn} ${rule.active ? styles.toggleOn : ''}`}
              onClick={handleToggle}
              disabled={toggling}
              title={rule.active ? 'Disable rule' : 'Enable rule'}
            >
              {rule.active ? 'On' : 'Off'}
            </button>
            <button className={styles.editBtn} onClick={() => setEditing(true)} title="Edit rule">
              ✎
            </button>
            <button className={styles.deleteBtn} onClick={() => onDelete(rule.id)} title="Delete rule">
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Add Rule form ─────────────────────────────────────────────
function AddRuleForm({ budgets, onSaved }) {
  const [form, setForm] = useState({
    name: '', operator: 'contains', match_value: '', action: 'set_category', action_value: '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Auto-clear action_value when action type changes
      if (k === 'action') next.action_value = ''
      return next
    })
    setError('')
  }

  // Auto-generate a name from the form values
  function autoName() {
    if (!form.match_value || !form.action_value) return ''
    const actionLabel = ACTIONS.find(a => a.value === form.action)?.label || ''
    return `${form.match_value} → ${form.action_value}`
  }

  async function handleSave() {
    if (!form.match_value.trim())  return setError('Enter a value to match against')
    if (!form.action_value.trim()) return setError('Enter a value to set')
    setSaving(true)
    try {
      await api.createRule({
        ...form,
        name: form.name.trim() || autoName(),
        match_value:  form.match_value.trim(),
        action_value: form.action_value.trim(),
      })
      setForm({ name: '', operator: 'contains', match_value: '', action: 'set_category', action_value: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const sortedBudgets = [...budgets].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className={styles.addForm}>
      <div className={styles.addFormTitle}>Add New Rule</div>

      <div className={styles.ruleBuilder}>
        <div className={styles.builderRow}>
          <span className={styles.builderLabel}>When transaction name</span>
          <select
            className={styles.builderSelect}
            value={form.operator}
            onChange={e => set('operator', e.target.value)}
          >
            {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            className={styles.builderInput}
            placeholder="e.g. Starbucks, WHOLEFDS, Venmo"
            value={form.match_value}
            onChange={e => set('match_value', e.target.value)}
          />
        </div>

        <div className={styles.builderRow}>
          <span className={styles.builderLabel}>→ then</span>
          <select
            className={styles.builderSelect}
            value={form.action}
            onChange={e => set('action', e.target.value)}
            style={{ color: ACTION_COLORS[form.action] }}
          >
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          {form.action === 'set_category' && (
            <select
              className={styles.builderSelect}
              value={form.action_value}
              onChange={e => set('action_value', e.target.value)}
            >
              <option value="">— pick a category —</option>
              {sortedBudgets.map(b => (
                <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
              ))}
            </select>
          )}

          {form.action === 'set_type' && (
            <select
              className={styles.builderSelect}
              value={form.action_value}
              onChange={e => set('action_value', e.target.value)}
            >
              <option value="">— pick a type —</option>
              {TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {form.action === 'set_note' && (
            <input
              className={styles.builderInput}
              placeholder="e.g. Client dinner, Split with Jake"
              value={form.action_value}
              onChange={e => set('action_value', e.target.value)}
            />
          )}
        </div>

        <div className={styles.builderRowFull}>
          <span className={styles.builderLabel}>Label (optional)</span>
          <input
            className={styles.builderInput}
            placeholder={autoName() || 'e.g. Starbucks → Dining'}
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
      </div>

      {error   && <div className={styles.formError}>{error}</div>}
      {success && <div className={styles.formSuccess}>✓ Rule saved</div>}

      <button
        className={styles.saveRuleBtn}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : '+ Add Rule'}
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Rules() {
  const { data, loading, error, refresh } = useApi(api.rules)
  const { data: budgetData }              = useApi(api.budgets)
  const [applying, setApplying]           = useState(false)
  const [applyResult, setApplyResult]     = useState(null)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const rules   = data?.rules || []
  const budgets = budgetData?.budgets || []
  const active  = rules.filter(r => r.active)
  const inactive = rules.filter(r => !r.active)

  async function handleDelete(id) {
    if (!window.confirm('Delete this rule?')) return
    await api.deleteRule(id)
    refresh()
  }

  async function handleToggle(id, active) {
    await api.updateRule(id, { active })
    refresh()
  }

  async function handleEdit(id, fields) {
    await api.updateRule(id, fields)
    refresh()
  }

  async function handleApplyNow() {
    setApplying(true)
    setApplyResult(null)
    try {
      const result = await api.applyRules()
      setApplyResult(result)
    } catch (err) {
      setApplyResult({ error: err.message })
    } finally {
      setApplying(false)
    }
  }

  function useExample(ex) {
    // Show in the form — for now just display info to user
  }

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>⊙ Automation</div>
          <div className={styles.title}>Rules</div>
          <div className={styles.sub}>
            Rules run automatically every hour when new transactions sync, and every time you manually sync. They apply in order — last matching rule wins for each field.
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statL}>Active Rules</div>
              <div className={styles.statV} style={{ color: 'var(--safe)' }}>{active.length}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statL}>Total Rules</div>
              <div className={styles.statV}>{rules.length}</div>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.syncNote}>
            <div className={styles.syncNoteLabel}>Auto-sync</div>
            <div className={styles.syncNoteVal}>Every hour</div>
            <div className={styles.syncNoteSub}>Rules apply after each sync</div>
          </div>
          <button
            className={styles.applyBtn}
            onClick={handleApplyNow}
            disabled={applying || rules.filter(r => r.active).length === 0}
          >
            {applying ? 'Applying...' : '▶ Run Rules Now'}
          </button>
          {applyResult && (
            <div className={applyResult.error ? styles.applyError : styles.applySuccess}>
              {applyResult.error
                ? `Error: ${applyResult.error}`
                : `✓ ${applyResult.updated} transaction${applyResult.updated !== 1 ? 's' : ''} updated`
              }
            </div>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.mainCol}>
          {/* ── Add Form ── */}
          <AddRuleForm budgets={budgets} onSaved={refresh} />

          {/* ── Active rules ── */}
          {active.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionDot} style={{ background: 'var(--safe)' }} />
                <div className={styles.sectionLabel}>Active</div>
                <div className={styles.sectionCount}>{active.length}</div>
              </div>
              {active.map(rule => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  budgets={budgets}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onSaved={handleEdit}
                />
              ))}
            </div>
          )}

          {/* ── Inactive rules ── */}
          {inactive.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionDot} style={{ background: 'var(--ink-3)' }} />
                <div className={styles.sectionLabel}>Disabled</div>
                <div className={styles.sectionCount}>{inactive.length}</div>
              </div>
              {inactive.map(rule => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  budgets={budgets}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onSaved={handleEdit}
                />
              ))}
            </div>
          )}

          {rules.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No rules yet</div>
              <div className={styles.emptySub}>Add your first rule above to start automating your transactions.</div>
            </div>
          )}
        </div>

        <div className={styles.aside}>
          <div className={styles.asideCard}>
            <div className={styles.asideLabel}>How Rules Work</div>
            <div className={styles.asideText}>
              Each rule matches against the <strong>transaction name</strong> and applies one action. Rules run in order — if multiple match, all their actions apply (last wins per field).
            </div>
            <div className={styles.asideText} style={{ marginTop: 10 }}>
              Rules apply automatically every hour when new transactions sync. You can also run them manually with the button above.
            </div>
          </div>

          <div className={styles.asideCard}>
            <div className={styles.asideLabel}>Example Rules</div>
            {EXAMPLES.map((ex, i) => {
              const opLabel  = OPERATORS.find(o => o.value === ex.operator)?.label || ex.operator
              const actLabel = ACTIONS.find(a => a.value === ex.action)?.label || ex.action
              return (
                <div key={i} className={styles.exampleRow}>
                  <div className={styles.exampleName}>{ex.name}</div>
                  <div className={styles.exampleDesc}>
                    name {opLabel} "{ex.match_value}" → {actLabel} "{ex.action_value}"
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.asideCard}>
            <div className={styles.asideLabel}>Actions</div>
            <div className={styles.actionDoc}>
              <div className={styles.actionDocRow}>
                <span style={{ color: ACTION_COLORS.set_category }}>Set category</span>
                <span>Links transaction to a budget category</span>
              </div>
              <div className={styles.actionDocRow}>
                <span style={{ color: ACTION_COLORS.set_type }}>Set type</span>
                <span>Marks as income, expense, or transfer</span>
              </div>
              <div className={styles.actionDocRow}>
                <span style={{ color: ACTION_COLORS.set_note }}>Set note</span>
                <span>Adds a note to the transaction</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
