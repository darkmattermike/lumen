import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import LumenDot from '../LumenDot/LumenDot'
import styles from './AuthGate.module.css'

export default function AuthGate() {
  const { login, register } = useAuth()
  const [mode, setMode]     = useState('login') // 'login' | 'register'
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.email, form.password, form.name)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Background glow */}
      <div className={styles.glow} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <LumenDot size={44} rings />
          <div className={styles.logoText}>
            <div className={styles.logoName}>Lumen</div>
            <div className={styles.logoTag}>Your financial picture, clearly.</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabOn : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Sign In
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabOn : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                className={styles.input}
                name="name"
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              name="password"
              type="password"
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              value={form.password}
              onChange={handleChange}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading
              ? 'One moment...'
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        {/* Four principles */}
        <div className={styles.principles}>
          {[
            { symbol: '✦', label: 'Where I Am' },
            { symbol: '↩', label: 'What Happened' },
            { symbol: '→', label: "What's Coming" },
            { symbol: '✦', label: 'What If' },
          ].map(p => (
            <div key={p.label} className={styles.principle}>
              <div className={styles.principleSymbol}>{p.symbol}</div>
              <div className={styles.principleLabel}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
