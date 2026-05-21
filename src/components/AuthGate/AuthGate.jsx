import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import LumenDot from '../LumenDot/LumenDot'
import styles from './AuthGate.module.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function AuthGate() {
  const { login, register, silentRefresh } = useAuth()
  const [mode, setMode]       = useState('login')
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [termsAgreed, setTermsAgreed]   = useState(false)
  const [rememberMe, setRememberMe]     = useState(true)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Handle Google OAuth callback — token arrives in URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('google_token')
    const authError   = params.get('auth_error')

    if (googleToken) {
      // Store token first, clean URL, then refresh — order matters
      localStorage.setItem('lumen_token', googleToken)
      window.history.replaceState({}, '', window.location.pathname)
      // silentRefresh reads the token from localStorage and sets user in context
      silentRefresh()
    }

    if (authError) {
      setError(decodeURIComponent(authError))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [silentRefresh])

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
        await login(form.email, form.password, rememberMe)
      } else {
        if (!termsAgreed) {
          setError('You must agree to the Terms of Service and Privacy Policy')
          setLoading(false)
          return
        }
        await register(form.email, form.password, form.name, true)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    // Simple redirect — no script loading, no timing issues, works everywhere
    window.location.href = `${API_BASE}/api/auth/google/redirect`
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logo}>
          <LumenDot size={32} />
          <div>
            <div className={styles.logoName}>Lumen</div>
            <div className={styles.logoTag}>Your financial picture, clearly.</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode==='login' ? styles.tabOn : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >Sign In</button>
          <button
            className={`${styles.tab} ${mode==='register' ? styles.tabOn : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >Create Account</button>
        </div>

        {/* Google button */}
        <button className={styles.googleBtn} onClick={handleGoogle} type="button">
          <GoogleIcon />
          <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <div className={styles.divLine} />
          <div className={styles.divText}>or</div>
          <div className={styles.divLine} />
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Name</label>
              <input id="name" name="name" className={styles.input} value={form.name}
                onChange={handleChange} placeholder="Your name" autoComplete="name" />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className={styles.input}
              value={form.email} onChange={handleChange}
              placeholder="you@example.com" autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className={styles.input}
              value={form.password} onChange={handleChange}
              placeholder={mode === 'register' ? '10+ chars, uppercase, number, symbol' : '••••••••'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </div>

          {mode === 'login' && (
            <div className={styles.rememberRow}>
              <label className={styles.rememberLabel}>
                <input type="checkbox" checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className={styles.rememberCheck} />
                <span>Remember me for 7 days</span>
              </label>
            </div>
          )}

          {mode === 'register' && (
            <label className={styles.termsCheck}>
              <input type="checkbox" checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)} />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>,{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, and{' '}
                <a href="/data-usage" target="_blank" rel="noopener noreferrer">Data Usage Policy</a>
              </span>
            </label>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'One moment...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
