import { useState } from 'react'
import LumenDot from '../LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './Onboarding.module.css'

const STEPS = [
  { id: 'welcome',  title: 'Welcome to Lumen',        icon: null },
  { id: 'account',  title: 'Add your first account',  icon: '🏦' },
  { id: 'income',   title: 'What do you earn?',        icon: '💰' },
  { id: 'budget',   title: 'Set a first budget',       icon: '📊' },
  { id: 'connect',  title: 'Bring in your data',       icon: '🔗' },
]

export default function Onboarding({ user, onComplete }) {
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)

  // Per-step form state
  const [account, setAccount]   = useState({ name: 'Checking', type: 'checking', balance: '' })
  const [income, setIncome]     = useState({ amount: '', frequency: 'monthly' })
  const [budget, setBudget]     = useState({ category: 'Dining', cap: '' })
  const [pushEnabled, setPushEnabled] = useState(false)

  async function next() {
    setSaving(true)
    try {
      // Save this step's data
      if (step === 1 && account.balance) {
        await api.createAccount({
          name:    account.name,
          type:    account.type,
          balance: Number(account.balance),
          is_debt: false,
        }).catch(() => {})
      }
      if (step === 2 && income.amount) {
        const day = 1
        const freq = income.frequency
        const name = 'Salary / Income'
        await api.createRecurring?.({
          name, amount: Number(income.amount),
          day_of_month: day,
          frequency: freq,
          type: 'income',
          icon: '💰',
        }).catch(() => {})
      }
      if (step === 3 && budget.cap) {
        await api.createBudget?.({
          name: budget.category,
          cap:  Number(budget.cap),
          icon: '📊',
        }).catch(() => {})
      }
      if (step === STEPS.length - 1) {
        // Mark onboarding complete
        await api.updateOnboarding?.({ complete: true }).catch(() => {})
        onComplete()
        return
      }
    } catch { /* non-fatal */ }
    setSaving(false)
    setStep(s => s + 1)
  }

  function skip() {
    if (step === STEPS.length - 1) {
      api.updateOnboarding?.({ complete: true }).catch(() => {})
      onComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  async function enablePush() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const { publicKey } = await api.vapidKey()
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = sub.toJSON()
      await api.pushSubscribe({ endpoint: json.endpoint, keys: json.keys })
      setPushEnabled(true)
    } catch { /* not critical */ }
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Step content */}
        <div className={styles.body}>
          {step === 0 && <WelcomeStep user={user} />}
          {step === 1 && <AccountStep form={account} setForm={setAccount} />}
          {step === 2 && <IncomeStep form={income} setForm={setIncome} />}
          {step === 3 && <BudgetStep form={budget} setForm={setBudget} />}
          {step === 4 && <ConnectStep pushEnabled={pushEnabled} onEnablePush={enablePush} />}
        </div>

        {/* Navigation */}
        <div className={styles.footer}>
          <button className={styles.skipBtn} onClick={skip}>
            {step === STEPS.length - 1 ? 'Skip for now' : 'Skip'}
          </button>
          <div className={styles.dots}>
            {STEPS.map((_, i) => (
              <div key={i} className={`${styles.dot} ${i === step ? styles.dotActive : i < step ? styles.dotDone : ''}`} />
            ))}
          </div>
          <button className={styles.nextBtn} onClick={next} disabled={saving}>
            {saving ? '…' : step === STEPS.length - 1 ? "Let's go →" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function WelcomeStep({ user }) {
  return (
    <div className={styles.welcomeStep}>
      <div className={styles.welcomeOrb}>
        <LumenDot size={64} rings mood="happy" />
      </div>
      <h1 className={styles.welcomeTitle}>
        Hey{user?.name ? ` ${user.name.split(' ')[0]}` : ''}. I'm Lumen.
      </h1>
      <p className={styles.welcomeBody}>
        I'm your financial picture, clearly. I track your money, spot patterns, warn you about problems before they happen, and answer questions about your finances in plain English.
      </p>
      <div className={styles.pillRow}>
        {['Where you stand', "What's coming", 'What if…', 'Why it happened'].map(p => (
          <div key={p} className={styles.pill}>{p}</div>
        ))}
      </div>
      <p className={styles.welcomeNote}>
        Takes about 2 minutes to set up. Everything can be changed later.
      </p>
    </div>
  )
}

function AccountStep({ form, setForm }) {
  const TYPES = [
    { value: 'checking', label: 'Checking' },
    { value: 'savings',  label: 'Savings'  },
    { value: 'credit',   label: 'Credit Card' },
    { value: 'cash',     label: 'Cash'     },
  ]
  return (
    <div className={styles.step}>
      <div className={styles.stepIcon}>🏦</div>
      <h2 className={styles.stepTitle}>Add your main account</h2>
      <p className={styles.stepSub}>Just one to start. You can add more in Accounts later.</p>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label>Account name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chase Checking" />
        </div>
        <div className={styles.field}>
          <label>Type</label>
          <div className={styles.typeGrid}>
            {TYPES.map(t => (
              <button
                key={t.value}
                className={`${styles.typeBtn} ${form.type === t.value ? styles.typeBtnOn : ''}`}
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
              >{t.label}</button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label>Current balance</label>
          <div className={styles.amtRow}>
            <span>$</span>
            <input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0.00" step="0.01" min="0" />
          </div>
        </div>
      </div>
    </div>
  )
}

function IncomeStep({ form, setForm }) {
  const FREQS = [
    { value: 'weekly',     label: 'Weekly' },
    { value: 'biweekly',   label: 'Every 2 weeks' },
    { value: 'semimonthly',label: 'Twice/month' },
    { value: 'monthly',    label: 'Monthly' },
  ]
  return (
    <div className={styles.step}>
      <div className={styles.stepIcon}>💰</div>
      <h2 className={styles.stepTitle}>What's your take-home pay?</h2>
      <p className={styles.stepSub}>After taxes. This helps Lumen calibrate your budget and savings rate.</p>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label>Take-home amount</label>
          <div className={styles.amtRow}>
            <span>$</span>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 4500" min="0" />
          </div>
        </div>
        <div className={styles.field}>
          <label>Paid</label>
          <div className={styles.typeGrid}>
            {FREQS.map(f => (
              <button
                key={f.value}
                className={`${styles.typeBtn} ${form.frequency === f.value ? styles.typeBtnOn : ''}`}
                onClick={() => setForm(p => ({ ...p, frequency: f.value }))}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BudgetStep({ form, setForm }) {
  const CATS = ['Dining', 'Groceries', 'Transport', 'Shopping', 'Entertainment', 'Subscriptions']
  return (
    <div className={styles.step}>
      <div className={styles.stepIcon}>📊</div>
      <h2 className={styles.stepTitle}>Set one budget to start</h2>
      <p className={styles.stepSub}>Pick the category you most want to control. One is enough for now.</p>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label>Category</label>
          <div className={styles.typeGrid}>
            {CATS.map(c => (
              <button
                key={c}
                className={`${styles.typeBtn} ${form.category === c ? styles.typeBtnOn : ''}`}
                onClick={() => setForm(f => ({ ...f, category: c }))}
              >{c}</button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label>Monthly cap</label>
          <div className={styles.amtRow}>
            <span>$</span>
            <input type="number" value={form.cap} onChange={e => setForm(f => ({ ...f, cap: e.target.value }))} placeholder="e.g. 300" min="0" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectStep({ pushEnabled, onEnablePush }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepIcon}>🔗</div>
      <h2 className={styles.stepTitle}>Bring in your transactions</h2>
      <p className={styles.stepSub}>A few ways to get your spending data into Lumen:</p>
      <div className={styles.connectOptions}>
        <div className={styles.connectOption}>
          <div className={styles.connectOptionIcon}>🏦</div>
          <div className={styles.connectOptionBody}>
            <div className={styles.connectOptionTitle}>Connect your bank</div>
            <div className={styles.connectOptionSub}>Live sync via Plaid. Set up in Accounts after this.</div>
          </div>
        </div>
        <div className={styles.connectOption}>
          <div className={styles.connectOptionIcon}>📄</div>
          <div className={styles.connectOptionBody}>
            <div className={styles.connectOptionTitle}>Upload a PDF statement</div>
            <div className={styles.connectOptionSub}>Drop any bank statement PDF in Transactions → Upload PDF.</div>
          </div>
        </div>
        <div className={styles.connectOption}>
          <div className={styles.connectOptionIcon}>📊</div>
          <div className={styles.connectOptionBody}>
            <div className={styles.connectOptionTitle}>Import a CSV</div>
            <div className={styles.connectOptionSub}>Export from any bank and import via Transactions → CSV Import.</div>
          </div>
        </div>
      </div>

      {/* Push notification opt-in */}
      <div className={styles.pushCard}>
        <div className={styles.pushLeft}>
          <LumenDot size={22} mood={pushEnabled ? 'happy' : 'idle'} />
          <div>
            <div className={styles.pushTitle}>Let Lumen tap you when it matters</div>
            <div className={styles.pushSub}>Cash crunches, duplicate charges, wins. No noise.</div>
          </div>
        </div>
        {pushEnabled ? (
          <div className={styles.pushEnabled}>✓ Enabled</div>
        ) : (
          <button className={styles.pushBtn} onClick={onEnablePush}>Enable</button>
        )}
      </div>
    </div>
  )
}

// ── Utility ───────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}
