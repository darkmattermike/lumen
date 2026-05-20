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

// ── Gmail section ─────────────────────────────────────────────
function GmailSection({ data, onRefresh }) {
  const gmail        = data.gmail || { connected: false }
  const [busy, setBusy]       = useState(false)
  const [status, setStatus]   = useState('')

  // Handle ?gmail=connected / ?gmail=error redirect from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('gmail')
    if (result === 'connected') {
      setStatus('Gmail connected successfully')
      onRefresh()
      window.history.replaceState({}, '', '/settings')
    } else if (result === 'error') {
      const reason = params.get('reason') || 'Unknown error'
      setStatus(`Error: ${reason}`)
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  async function handleConnect() {
    setBusy(true)
    setStatus('')
    try {
      const { url } = await api.gmailAuthUrl()
      window.location.href = url   // full redirect to Google consent screen
    } catch (err) {
      setStatus(`Error: ${err.message}`)
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect Gmail? Lumen will lose access to your emails.')) return
    setBusy(true)
    setStatus('')
    try {
      await api.gmailDisconnect()
      setStatus('Gmail disconnected')
      onRefresh()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const connectedAt = gmail.connected_at
    ? new Date(gmail.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const lastSynced = gmail.last_synced
    ? new Date(gmail.last_synced).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Never'

  return (
    <Section
      title="Gmail"
      subtitle="Connect Gmail so Lumen can read receipts, renewal notices, and bills to enrich your financial data."
    >
      <Field
        label="Gmail Account"
        hint="Lumen only requests read-only access. Your emails are never stored — only parsed for financial signals."
      >
        {gmail.connected ? (
          <div className={styles.keyExisting}>
            <div className={styles.keyBadge}>
              <span className={styles.keyDot} />
              {gmail.gmail_address}
            </div>
            <button className={styles.keyRemove} onClick={handleDisconnect} disabled={busy}>
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className={styles.gmailConnectBtn}
            onClick={handleConnect}
            disabled={busy}
          >
            <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 5C13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19S34.5 5 24 5z" opacity="0"/>
              <path fill="#4285F4" d="M6.3 14.7L24 27l17.7-12.3A19 19 0 0 0 5 24h1.3z" opacity="0"/>
              <path fill="#34A853" d="M24 5a19 19 0 0 1 17.7 9.7L24 27 6.3 14.7A19 19 0 0 1 24 5z" opacity="0"/>
              <g>
                <path fill="#4285F4" d="M8 10h32v28H8z" opacity="0"/>
                <path fill="#EA4335" d="M8 10l16 14L40 10H8z"/>
                <path fill="#FBBC05" d="M8 10v28l12-14L8 10z"/>
                <path fill="#34A853" d="M40 10v28L28 24l12-14z"/>
                <path fill="#4285F4" d="M8 38h32L28 24 20 24 8 38z"/>
              </g>
            </svg>
            {busy ? 'Connecting...' : 'Connect Gmail'}
          </button>
        )}
      </Field>

      {gmail.connected && (
        <div className={styles.gmailMeta}>
          <div className={styles.gmailMetaItem}>
            <span className={styles.gmailMetaLabel}>Connected</span>
            <span className={styles.gmailMetaVal}>{connectedAt}</span>
          </div>
          <div className={styles.gmailMetaItem}>
            <span className={styles.gmailMetaLabel}>Last synced</span>
            <span className={styles.gmailMetaVal}>{lastSynced}</span>
          </div>
          <div className={styles.gmailMetaItem}>
            <span className={styles.gmailMetaLabel}>Access</span>
            <span className={styles.gmailMetaVal} style={{ color: 'var(--safe)' }}>Read-only</span>
          </div>
        </div>
      )}

      {!gmail.connected && (
        <div className={styles.gmailCapabilities}>
          <div className={styles.gmailCapTitle}>What Lumen will read</div>
          {[
            ['📦', 'Order confirmations', 'Amazon, Target, Apple and more'],
            ['🔄', 'Subscription renewals', 'Netflix, Spotify, Adobe before they charge'],
            ['📄', 'Bills & statements',   'Utilities, credit cards, insurance'],
            ['✈️', 'Travel bookings',      'Flights, hotels — added to your calendar'],
            ['↩️', 'Refunds & credits',    'Flagged and matched to transactions'],
          ].map(([icon, label, desc]) => (
            <div key={label} className={styles.gmailCap}>
              <span className={styles.gmailCapIcon}>{icon}</span>
              <div>
                <div className={styles.gmailCapLabel}>{label}</div>
                <div className={styles.gmailCapDesc}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {status && (
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

// ── Reports section ──────────────────────────────────────────
function ReportsSection() {
  const today = new Date()
  const [year,  setYear]   = useState(today.getFullYear())
  const [month, setMonth]  = useState(today.getMonth())  // 0-indexed
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  function openReport() {
    const url = api.monthlyReportUrl(year, month)
    window.open(url + `&token=${localStorage.getItem('lumen_token')}`, '_blank')
  }

  return (
    <Section title="Monthly Reports" subtitle="Print or save a PDF report for any month.">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--ink-0)' }}
        >
          {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--ink-0)' }}
        >
          {[today.getFullYear(), today.getFullYear()-1, today.getFullYear()-2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={openReport}
          style={{ fontSize: 13, padding: '7px 18px', borderRadius: 8, background: 'var(--calm)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Generate Report →
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
        Opens a print-ready report. Use your browser's Print → Save as PDF to download.
      </p>
    </Section>
  )
}

// ── Push Notifications section ────────────────────────────────
function PushSection() {
  const [status, setStatus]   = useState('idle') // 'idle' | 'enabled' | 'denied' | 'error'
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) { setStatus('unsupported'); return }
    if (Notification.permission === 'granted') setStatus('enabled')
    else if (Notification.permission === 'denied') setStatus('denied')
  }, [])

  async function enable() {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }
      const { publicKey } = await api.vapidKey()
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = sub.toJSON()
      await api.pushSubscribe({ endpoint: json.endpoint, keys: json.keys })
      setStatus('enabled')
    } catch { setStatus('error') }
  }

  async function sendTest() {
    setTesting(true)
    await api.pushTest().catch(() => {})
    setTimeout(() => setTesting(false), 2000)
  }

  return (
    <Section title="Push Notifications" subtitle="Get tapped when something needs attention.">
      {status === 'unsupported' && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Push notifications aren't supported in this browser.</p>
      )}
      {status === 'denied' && (
        <p style={{ fontSize: 12, color: 'var(--debt)' }}>Notifications blocked. Enable them in your browser settings then reload.</p>
      )}
      {status === 'idle' && (
        <button
          onClick={enable}
          style={{ fontSize: 13, padding: '8px 18px', borderRadius: 8, background: 'var(--calm)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Enable Push Notifications
        </button>
      )}
      {status === 'enabled' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--safe)', fontWeight: 600 }}>✓ Enabled on this device</span>
          <button
            onClick={sendTest}
            disabled={testing}
            style={{ fontSize: 12, padding: '5px 14px', borderRadius: 7, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--ink-2)', cursor: 'pointer' }}
          >
            {testing ? 'Sent!' : 'Send test'}
          </button>
        </div>
      )}
      {status === 'error' && (
        <p style={{ fontSize: 12, color: 'var(--debt)' }}>Something went wrong. Try again or check browser permissions.</p>
      )}
      <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8 }}>
        Only high-priority alerts: cash crunches, duplicate charges, big wins. Lumen learns to suppress the types you don't open.
      </p>
    </Section>
  )
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
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
          <GmailSection    data={data} onRefresh={refresh} />
          <ReportsSection />
          <PushSection />
          <AccountInfoSection data={data} onLogout={logout} />
        </div>
      </div>
    </ScreenWrap>
  )
}
