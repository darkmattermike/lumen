import { useState, useEffect } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../data/api'
import styles from './Settings.module.css'

// ── Reusable section card ─────────────────────────────────────
function Section({ title, subtitle, children, delay = 0 }) {
  return (
    <div className={styles.section} style={{ '--section-delay': `${delay}ms` }}>
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
    const pw = form.new_password
    if (pw.length < 10)             return setStatus('Error: Password must be at least 10 characters')
    if (!/[A-Z]/.test(pw))          return setStatus('Error: Password must contain an uppercase letter')
    if (!/[0-9]/.test(pw))          return setStatus('Error: Password must contain a number')
    if (!/[^A-Za-z0-9]/.test(pw))  return setStatus('Error: Password must contain a special character')
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
          onChange={e => set('new_password', e.target.value)} placeholder="10+ chars, uppercase, number, special" />
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
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function saveKeys() {
    if (!anthropic) return setStatus('Error: Enter an API key')
    setSaving(true)
    try {
      await api.updateKeys({ anthropic_key: anthropic })
      setStatus('Keys saved')
      setAnthropic('')
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
      await api.updateKeys({ anthropic_key: null })
      setStatus('Anthropic key removed')
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


      {!data.has_anthropic_key && (
        <div className={styles.fieldActions}>
          <SaveStatus status={status} />
          <button className={styles.saveBtn} onClick={saveKeys} disabled={saving}>
            {saving ? 'Saving...' : 'Save Keys'}
          </button>
        </div>
      )}
      {data.has_anthropic_key && status && (
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

// ── Legal section ─────────────────────────────────────────────
function LegalSection({ data }) {
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  return (
    <Section title="Legal & Privacy" subtitle="Policies you agreed to when creating your account.">
      <Field label="Terms of Service">
        <div className={styles.legalRow}>
          <span className={styles.legalStatus}>✓ Agreed {fmtDate(data.terms_agreed_at)}</span>
          <a className={styles.legalLink} href="/terms" target="_blank" rel="noopener noreferrer">View →</a>
        </div>
      </Field>
      <Field label="Privacy Policy">
        <div className={styles.legalRow}>
          <span className={styles.legalStatus}>✓ Agreed {fmtDate(data.privacy_agreed_at)}</span>
          <a className={styles.legalLink} href="/privacy" target="_blank" rel="noopener noreferrer">View →</a>
        </div>
      </Field>
      <Field label="Data Usage Policy">
        <div className={styles.legalRow}>
          <span className={styles.legalStatus}>Governs how your financial data is processed</span>
          <a className={styles.legalLink} href="/data-usage" target="_blank" rel="noopener noreferrer">View →</a>
        </div>
      </Field>
    </Section>
  )
}

// ── Data section ──────────────────────────────────────────────
function DataSection() {
  const BASE = import.meta.env.VITE_API_URL || ''
  const token = localStorage.getItem('token') || ''
  const now = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const from  = `${year}-01-01`
  const to    = now.toISOString().split('T')[0]

  function exportUrl(path) {
    return `${BASE}${path}&token=${token}`
  }

  return (
    <Section title="Export Your Data" subtitle="Download your financial data at any time. All exports include data you've entered and synced.">
      <div className={styles.exportGrid}>
        {[
          { label: 'Transactions (CSV)', sub: 'Last 90 days', href: exportUrl(`/api/export/transactions?format=csv&from=${from}&to=${to}`) },
          { label: 'Transactions (JSON)', sub: 'Last 90 days', href: exportUrl(`/api/export/transactions?format=json&from=${from}&to=${to}`) },
          { label: 'Accounts (CSV)', sub: 'Current balances', href: exportUrl('/api/export/accounts?format=csv') },
          { label: 'Full Export (JSON)', sub: 'Everything — transactions, accounts, budgets, goals', href: exportUrl('/api/export/full') },
        ].map(e => (
          <a key={e.label} href={e.href} className={styles.exportCard} download>
            <span className={styles.exportIcon}>↓</span>
            <div>
              <div className={styles.exportLabel}>{e.label}</div>
              <div className={styles.exportSub}>{e.sub}</div>
            </div>
          </a>
        ))}
      </div>
    </Section>
  )
}


// ── Plan section ──────────────────────────────────────────────
const TIER_COLOR = { free: 'var(--ink-3)', plus: 'var(--calm)', pro: 'var(--goal)' }
const TIER_LABEL = { free: 'Free', plus: 'Lumen Plus', pro: 'Lumen Pro' }

function PlanSection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [billingData, setBillingData] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    api.billingStatus().then(setBillingData).catch(() => {})
  }, [])

  const tier  = billingData?.tier || user?.tier || 'free'
  const color = TIER_COLOR[tier] || 'var(--ink-2)'
  const label = TIER_LABEL[tier] || 'Free'
  const isFree = tier === 'free'
  const periodEnd = billingData?.currentPeriodEnd
    ? new Date(billingData.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  async function openPortal() {
    setPortalLoading(true)
    try {
      const { url } = await api.billingPortal()
      window.location.href = url
    } catch { setPortalLoading(false) }
  }

  return (
    <Section title="Plan" subtitle="Your current Lumen subscription.">
      <div className={styles.planRow}>
        <div className={styles.planBadge} style={{ color, borderColor: color, background: `${color}18` }}>
          {label}
        </div>
        {periodEnd && !billingData?.cancelAtPeriodEnd && (
          <div className={styles.planRenew}>Renews {periodEnd}</div>
        )}
        {billingData?.cancelAtPeriodEnd && (
          <div className={styles.planCancel}>Cancels {periodEnd}</div>
        )}
      </div>
      <div className={styles.planActions}>
        {isFree ? (
          <button className={styles.upgradeBtn} onClick={() => navigate('/pricing')}>
            Upgrade Plan →
          </button>
        ) : (
          <button className={styles.manageBtn} onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? 'Loading…' : 'Manage Subscription'}
          </button>
        )}
        {!isFree && (
          <button className={styles.viewPlansBtn} onClick={() => navigate('/pricing')}>
            View all plans
          </button>
        )}
      </div>
    </Section>
  )
}


// ── Email invite form ─────────────────────────────────────────
function EmailInviteForm() {
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSend(e) {
    e.preventDefault()
    if (!email.trim()) return setError('Enter an email address')
    setSending(true)
    setError('')
    try {
      await api.familyInviteEmail({ email: email.trim(), name: name.trim() || undefined })
      setSent(true)
      setEmail('')
      setName('')
      setTimeout(() => setSent(false), 4000)
    } catch (err) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} className={styles.emailInviteForm}>
      <input
        className={styles.emailInviteInput}
        type="email" placeholder="Email address" value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        required
      />
      <input
        className={styles.emailInviteInput}
        type="text" placeholder="Their name (optional)" value={name}
        onChange={e => setName(e.target.value)}
      />
      {error && <div className={styles.emailInviteError}>{error}</div>}
      <button className={styles.emailInviteBtn} type="submit" disabled={sending}>
        {sending ? 'Sending…' : sent ? '✓ Invite sent!' : 'Send Invite'}
      </button>
    </form>
  )
}

// ── Family section ─────────────────────────────────────────────
function FamilySection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied]     = useState(false)

  const isPro = user?.tier === 'pro' || user?.role === 'owner'

  useEffect(() => {
    if (!isPro) { setLoading(false); return }
    api.familyStatus().then(d => { setStatus(d); setLoading(false) }).catch(() => setLoading(false))
  }, [isPro])

  async function createGroup() {
    setCreating(true)
    try {
      await api.familyCreate()
      const d = await api.familyStatus()
      setStatus(d)
    } catch (err) {
      alert(err?.message || 'Failed to create family group.')
      console.error('familyCreate error:', err)
    } finally { setCreating(false) }
  }

  async function regenerateInvite() {
    try {
      await api.familyRegenInvite()
      const d = await api.familyStatus()
      setStatus(d)
    } catch {}
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member from your family plan?')) return
    try {
      await api.familyRemove(userId)
      const d = await api.familyStatus()
      setStatus(d)
    } catch {}
  }

  function copyInvite() {
    const url = `${window.location.origin}/family/join/${status.group.invite_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isPro) {
    return (
      <Section title="Family Plan" subtitle="Share your finances with up to 2 family members.">
        <div className={styles.familyGate}>
          <p className={styles.familyGateText}>Family plan requires <strong>Lumen Pro</strong>.</p>
          <button className={styles.upgradeBtn} onClick={() => navigate('/pricing')}>Upgrade to Pro →</button>
        </div>
      </Section>
    )
  }

  return (
    <Section title="Family Plan" subtitle="Share finances with up to 2 additional members.">
      {loading && <div className={styles.settingLoading}>Loading…</div>}

      {!loading && !status?.group && (
        <div className={styles.familySetup}>
          <p className={styles.familySetupText}>You haven't set up a family group yet.</p>
          <button className={styles.createGroupBtn} onClick={createGroup} disabled={creating}>
            {creating ? 'Creating…' : 'Create Family Group'}
          </button>
        </div>
      )}

      {!loading && status?.group && status?.role === 'owner' && (
        <div className={styles.familyOwner}>
          {/* Invite link */}
          <div className={styles.inviteBlock}>
            <div className={styles.inviteLabel}>Invite Link</div>
            <div className={styles.inviteUrl}>
              {`${window.location.origin}/family/join/${status.group.invite_code}`}
            </div>
            <div className={styles.inviteBtns}>
              <button className={styles.copyBtn} onClick={copyInvite}>
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <button className={styles.regenBtn} onClick={regenerateInvite}>
                Regenerate
              </button>
            </div>
            <div className={styles.inviteNote}>
              Share this link with family members. They'll need a Lumen account.
              Slots: {status.members?.length || 0}/2 used.
            </div>
          </div>

          {/* Email invite form */}
          <div className={styles.emailInviteBlock}>
            <div className={styles.inviteLabel}>Invite by Email</div>
            <EmailInviteForm />
          </div>

          {/* Members list */}
          {status.members?.length > 0 && (
            <div className={styles.membersList}>
              <div className={styles.membersLabel}>Members</div>
              {status.members.map(m => (
                <div key={m.user_id} className={styles.memberRow}>
                  <div className={styles.memberAvatar}>
                    {m.google_avatar
                      ? <img src={m.google_avatar} alt={m.name} className={styles.memberAvatarImg} />
                      : <div className={styles.memberAvatarInitial}>{(m.name || m.email || '?')[0].toUpperCase()}</div>
                    }
                  </div>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>{m.name || m.email}</div>
                    <div className={styles.memberEmail}>{m.email}</div>
                  </div>
                  <button className={styles.removeMemberBtn} onClick={() => removeMember(m.user_id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && status?.role === 'member' && (
        <div className={styles.familyMember}>
          <p className={styles.familyMemberText}>
            You're a member of <strong>{status.group?.owner_name}'s</strong> family plan.
            You can see shared accounts and transactions, and mark items private to yourself.
          </p>
        </div>
      )}
    </Section>
  )
}

// ── Admin section (owner only) ────────────────────────────────
function AdminSection() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)
  const [msg,     setMsg]     = useState('')

  useEffect(() => {
    api.adminUsers()
      .then(d => { setUsers(d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function setRole(id, role) {
    setActing(id)
    try {
      const updated = await api.adminSetRole(id, role)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: updated.role } : u))
      setMsg('Role updated')
    } catch (err) { setMsg(err.message || 'Failed') }
    setActing(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function revokeUser(id, email) {
    if (!confirm(`Revoke all sessions for ${email}? They will be logged out and must log in again.`)) return
    setActing(id)
    try {
      await api.adminRevokeUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      setMsg(`Sessions revoked for ${email}`)
    } catch (err) { setMsg(err.message || 'Failed') }
    setActing(null)
    setTimeout(() => setMsg(''), 4000)
  }

  const ROLES = ['owner', 'admin', 'user']
  const ROLE_COLOR = { owner: 'var(--warn)', admin: 'var(--calm)', user: 'var(--ink-2)' }

  return (
    <Section title="User Management" subtitle="All registered accounts. Only visible to the owner.">
      {msg && <div className={styles.adminMsg}>{msg}</div>}
      {loading ? (
        <div className={styles.adminLoading}>Loading users…</div>
      ) : (
        <div className={styles.adminTable}>
          {users.map(u => (
            <div key={u.id} className={styles.adminRow}>
              <div className={styles.adminUserInfo}>
                <div className={styles.adminEmail}>{u.email}</div>
                <div className={styles.adminMeta}>
                  {u.name && <span>{u.name}</span>}
                  <span>·</span>
                  <span>Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {u.tx_count > 0 && <><span>·</span><span>{u.tx_count} txns</span></>}
                  {u.last_active && <><span>·</span><span>Active recently</span></>}
                </div>
              </div>

              <div className={styles.adminActions}>
                <select
                  className={styles.roleSelect}
                  value={u.role || 'user'}
                  style={{ color: ROLE_COLOR[u.role || 'user'] }}
                  onChange={e => setRole(u.id, e.target.value)}
                  disabled={acting === u.id}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  className={styles.roleSelect}
                  value={u.tier || 'free'}
                  style={{ color: TIER_COLOR[u.tier || 'free'] || 'var(--ink-2)' }}
                  onChange={async e => {
                    setActing(u.id)
                    try { await api.adminSetTier({ userId: u.id, tier: e.target.value }); await loadUsers() }
                    catch {} finally { setActing(null) }
                  }}
                  disabled={acting === u.id}
                >
                  {['free','plus','pro'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  className={styles.revokeBtn}
                  onClick={() => revokeUser(u.id, u.email)}
                  disabled={acting === u.id}
                  title="Revoke all sessions"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── Tab definitions ──────────────────────────────────────────
const TABS = [
  { id: 'account',      label: 'Account',      icon: '◈' },
  { id: 'security',     label: 'Security',     icon: '⬡' },
  { id: 'integrations', label: 'Integrations', icon: '⇄' },
  { id: 'plan',         label: 'Plan',         icon: '✦' },
  { id: 'data',         label: 'Data',         icon: '↓' },
]

// ── Main Settings page ────────────────────────────────────────
export default function Settings() {
  const { logout, user } = useAuth()
  const { data, loading, error, refresh } = useApi(api.getSettings)
  const isOwner = user?.role === 'owner'
  const [tab, setTab] = useState('account')

  if (loading) return <LoadingShell />
  if (error)   return <ErrorShell message={error} />

  const tabs = isOwner
    ? [...TABS, { id: 'admin', label: 'Admin', icon: '⚑' }]
    : TABS

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
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

      <div className={styles.tabBar}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabContent} key={tab}>

        {tab === 'account' && (
          <div className={styles.panelGrid}>
            <ProfileSection data={data} onRefresh={refresh} />
            <AccountInfoSection data={data} onLogout={logout} />
          </div>
        )}

        {tab === 'security' && (
          <div className={styles.panelGrid}>
            <PasswordSection />
            <LegalSection data={data} />
          </div>
        )}

        {tab === 'integrations' && (
          <div className={styles.panelGrid}>
            <GmailSection data={data} onRefresh={refresh} />
            <ApiKeysSection data={data} onRefresh={refresh} />
          </div>
        )}

        {tab === 'plan' && (
          <div className={styles.panelGrid}>
            <PlanSection />
            <FamilySection />
          </div>
        )}

        {tab === 'data' && (
          <div className={styles.panelSingle}>
            <DataSection data={data} />
          </div>
        )}

        {tab === 'admin' && isOwner && (
          <div className={styles.panelSingle}>
            <AdminSection />
          </div>
        )}

      </div>
    </ScreenWrap>
  )
}
