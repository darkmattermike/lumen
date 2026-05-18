import { useState, useEffect } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../data/api'
import styles from './Settings.module.css'

// ── Reusable section card ─────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitle}>{title}</div>
        {subtitle && <div className={styles.sectionSub}>{subtitle}</div>}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

// ── Field row ─────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldMeta}>
        <div className={styles.fieldLabel}>{label}</div>
        {hint && <div className={styles.fieldHint}>{hint}</div>}
      </div>
      <div className={styles.fieldControl}>{children}</div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────
function SaveStatus({ status }) {
  if (!status) return null
  const isError = status.startsWith('Error')
  return (
    <div className={`${styles.saveStatus} ${isError ? styles.saveStatusError : styles.saveStatusOk}`}>
      {isError ? '✕' : '✓'} {status}
    </div>
  )
}

// ── Profile section ───────────────────────────────────────────
function ProfileSection({ data, onRefresh }) {
  const [form, setForm]     = useState({ name: data.name || '', email: data.email || '' })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setStatus('') }

  async function save() {
    setSaving(true)
    try {
      await api.updateProfile(form)
      setStatus('Saved')
      onRefresh()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Profile" subtitle="Your name and email address.">
      <Field label="Name">
        <input className={styles.input} value={form.name}
          onChange={e => set('name', e.target.value)} placeholder="Your name" />
      </Field>
      <Field label="Email">
        <input className={styles.input} value={form.email} type="email"
          onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
      </Field>
      <div className={styles.fieldActions}>
        <SaveStatus status={status} />
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </Section>
  )
}

// ── Password section ──────────────────────────────────────────
function PasswordSection() {
  const [form, setForm]     = useState({ current_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setStatus('') }

  async function save() {
    if (form.new_password !== form.confirm) return setStatus('Error: Passwords do not match')
    if (form.new_password.length < 8) return setStatus('Error: Password must be at least 8 characters')
    setSaving(true)
    try {
      await api.updatePassword({ current_password: form.current_password, new_password: form.new_password })
      setStatus('Password updated')
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Password" subtitle="Change your account password.">
      <Field label="Current Password">
        <input className={styles.input} type="password" value={form.current_password}
          onChange={e => set('current_password', e.target.value)} placeholder="••••••••" />
      </Field>
      <Field label="New Password">
        <input className={styles.input} type="password" value={form.new_password}
          onChange={e => set('new_password', e.target.value)} placeholder="At least 8 characters" />
      </Field>
      <Field label="Confirm New Password">
        <input className={styles.input} type="password" value={form.confirm}
          onChange={e => set('confirm', e.target.value)} placeholder="••••••••" />
      </Field>
      <div className={styles.fieldActions}>
        <SaveStatus status={status} />
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Update Password'}
        </button>
      </div>
    </Section>
  )
}

// ── API Keys section ──────────────────────────────────────────
function ApiKeysSection({ data, onRefresh }) {
  const [anthropic, setAnthropic] = useState('')
  const [google, setGoogle]       = useState('')
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [showGoogle, setShowGoogle]       = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function saveKeys() {
    if (!anthropic && !google) return setStatus('Error: Enter at least one key')
    setSaving(true)
    try {
      await api.updateKeys({
        ...(anthropic ? { anthropic_key: anthropic } : {}),
        ...(google    ? { google_key:    google }    : {}),
      })
      setStatus('Keys saved')
      setAnthropic('')
      setGoogle('')
      onRefresh()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function removeKey(type) {
    if (!window.confirm(`Remove your ${type} key?`)) return
    try {
      await api.updateKeys({ [type === 'anthropic' ? 'anthropic_key' : 'google_key']: null })
      setStatus(`${type === 'anthropic' ? 'Anthropic' : 'Google'} key removed`)
      onRefresh()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  return (
    <Section
      title="AI & Integration Keys"
      subtitle="Your keys are stored encrypted and never exposed in the UI. They power Lumen's AI features."
    >
      {/* Anthropic */}
      <Field
        label="Anthropic API Key"
        hint="Powers AI insights, What If scenarios, and auto-categorization."
      >
        <div className={styles.keyRow}>
          {data.has_anthropic_key ? (
            <div className={styles.keyExisting}>
              <div className={styles.keyBadge}>
                <span className={styles.keyDot} />
                Connected {data.anthropic_key_hint}
              </div>
              <button className={styles.keyRemove} onClick={() => removeKey('anthropic')}>Remove</button>
            </div>
          ) : (
            <div className={styles.keyInputWrap}>
              <input
                className={styles.input}
                type={showAnthropic ? 'text' : 'password'}
                value={anthropic}
                onChange={e => { setAnthropic(e.target.value); setStatus('') }}
                placeholder="sk-ant-..."
              />
              <button className={styles.keyToggle} onClick={() => setShowAnthropic(s => !s)}>
                {showAnthropic ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </div>
      </Field>

      {/* Google */}
      <Field
        label="Google API Key"
        hint="Used for Google Sign-In and future Google integrations."
      >
        <div className={styles.keyRow}>
          {data.has_google_key ? (
            <div className={styles.keyExisting}>
              <div className={styles.keyBadge}>
                <span className={styles.keyDot} />
                Connected {data.google_key_hint}
              </div>
              <button className={styles.keyRemove} onClick={() => removeKey('google')}>Remove</button>
            </div>
          ) : (
            <div className={styles.keyInputWrap}>
              <input
                className={styles.input}
                type={showGoogle ? 'text' : 'password'}
                value={google}
                onChange={e => { setGoogle(e.target.value); setStatus('') }}
                placeholder="AIza..."
              />
              <button className={styles.keyToggle} onClick={() => setShowGoogle(s => !s)}>
                {showGoogle ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </div>
      </Field>

      {(!data.has_anthropic_key || !data.has_google_key) && (
        <div className={styles.fieldActions}>
          <SaveStatus status={status} />
          <button className={styles.saveBtn} onClick={saveKeys} disabled={saving}>
            {saving ? 'Saving...' : 'Save Keys'}
          </button>
        </div>
      )}
      {(data.has_anthropic_key || data.has_google_key) && status && (
        <div className={styles.fieldActions}>
          <SaveStatus status={status} />
        </div>
      )}
    </Section>
  )
}

// ── Account info section ──────────────────────────────────────
function AccountInfoSection({ data, onLogout }) {
  const joined = data.created_at
    ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <Section title="Account" subtitle="Account details and actions.">
      <Field label="Member Since">
        <div className={styles.readOnly}>{joined}</div>
      </Field>
      <Field label="User ID">
        <div className={styles.readOnly} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          #{data.id}
        </div>
      </Field>
      <div className={styles.dangerZone}>
        <div className={styles.dangerLabel}>Danger Zone</div>
        <button className={styles.logoutBtn} onClick={onLogout}>Sign Out</button>
      </div>
    </Section>
  )
}

// ── Main Settings page ────────────────────────────────────────
export default function Settings() {
  const { logout } = useAuth()
  const { data, loading, error, refresh } = useApi(api.getSettings)

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>⚙ Settings</div>
          <div className={styles.title}>Settings</div>
          <div className={styles.sub}>Manage your profile, security, and integrations.</div>
        </div>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {(data.name || data.email || '?')[0].toUpperCase()}
          </div>
          <div className={styles.avatarName}>{data.name || data.email}</div>
          <div className={styles.avatarEmail}>{data.email}</div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.left}>
          <ProfileSection  data={data} onRefresh={refresh} />
          <PasswordSection />
        </div>
        <div className={styles.right}>
          <ApiKeysSection  data={data} onRefresh={refresh} />
          <AccountInfoSection data={data} onLogout={logout} />
        </div>
      </div>
    </ScreenWrap>
  )
}
