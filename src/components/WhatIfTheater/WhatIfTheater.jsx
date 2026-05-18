import { useState, useRef, useEffect } from 'react'
import LumenDot from '../LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './WhatIfTheater.module.css'

const QUICK_CHIPS = [
  { emoji: '🍽️', label: 'Dinner out tonight (~$65)' },
  { emoji: '✈️', label: 'Weekend trip (~$380)' },
  { emoji: '🛍️', label: 'Shopping spree (~$200)' },
  { emoji: '🎵', label: 'Cancel a subscription' },
  { emoji: '☕', label: 'Daily coffee habit (+$6/day)' },
  { emoji: '🚗', label: 'Ubers this week (~$45)' },
]

// Extract a dollar amount from a response string if present
function extractAmount(text) {
  const match = text.match(/\$[\d,]+(?:\.\d{1,2})?/)
  if (!match) return null
  return parseFloat(match[0].replace(/[$,]/g, ''))
}

export default function WhatIfTheater({ balance, balanceAfterBills, activePlans = [], plannedSpend = 0 }) {
  const [question, setQuestion]   = useState('')
  const [response, setResponse]   = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeChip, setActiveChip] = useState(null)
  const [noKey, setNoKey]         = useState(false)
  const [error, setError]         = useState('')
  const [pinned, setPinned]       = useState(false)
  const [plans, setPlans]         = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    api.plans().then(d => setPlans(d.plans || [])).catch(() => {})
  }, [])

  async function ask(message) {
    if (!message.trim() || streaming) return
    setStreaming(true)
    setResponse('')
    setError('')
    setNoKey(false)
    setPinned(false)

    try {
      const res = await api.lumenAsk(message, 'what_if')

      if (res.status === 402) {
        setNoKey(true)
        setStreaming(false)
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Something went wrong')
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'text')  setResponse(prev => prev + parsed.text)
            if (parsed.type === 'done')  setStreaming(false)
            if (parsed.type === 'error') { setError(parsed.message); setStreaming(false) }
          } catch {}
        }
      }
    } catch (err) {
      setError('Connection error. Check your API key in Settings.')
      setStreaming(false)
    }
  }

  async function handlePin() {
    const amount = extractAmount(question) || extractAmount(response)
    try {
      const plan = await api.createPlan({ question: activeChip || question, response, amount })
      setPlans(prev => [plan, ...prev])
      setPinned(true)
    } catch {}
  }

  async function handlePlanStatus(id, status) {
    try {
      await api.updatePlan(id, { status })
      setPlans(prev => prev.filter(p => p.id !== id))
    } catch {}
  }

  function handleChip(chip) {
    setActiveChip(chip.label)
    setQuestion(chip.label)
    ask(chip.label)
  }

  function handleSend() {
    ask(question)
    setActiveChip(null)
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className={styles.theater}>
      <div className={styles.header}>
        <LumenDot size={14} />
        <div>
          <div className={styles.title}>What <em>if</em>...</div>
          <div className={styles.sub}>Ask anything. Lumen runs it against your real numbers.</div>
        </div>
      </div>

      {/* Quick chips */}
      <div className={styles.chips}>
        {QUICK_CHIPS.map(c => (
          <button
            key={c.label}
            className={`${styles.chip} ${activeChip === c.label ? styles.chipOn : ''}`}
            onClick={() => handleChip(c)}
            disabled={streaming}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Spotlight response area */}
      <div className={styles.spotlight}>
        <div className={styles.dotCol}>
          <LumenDot size={44} rings />
          <div className={styles.dotLabel}>Lumen</div>
        </div>

        <div className={styles.response}>
          {noKey ? (
            <div className={styles.noKey}>
              <div className={styles.noKeyTitle}>Anthropic key not connected</div>
              <div className={styles.noKeyText}>
                Add your Anthropic API key in <strong>Settings → AI & Integration Keys</strong> to unlock live AI responses from Lumen.
              </div>
            </div>
          ) : error ? (
            <div className={styles.errorText}>{error}</div>
          ) : response ? (
            <>
              <div className={styles.responseTag}>
                <span className="pdot" />
                {activeChip || question}
              </div>
              <div className={styles.responseText}>
                {response}
                {streaming && <span className={styles.cursor}>▋</span>}
              </div>
              {!streaming && (
                <div className={styles.planActions}>
                  {pinned ? (
                    <div className={styles.pinnedConfirm}>📌 Pinned as a plan</div>
                  ) : (
                    <>
                      <button className={styles.pinBtn} onClick={handlePin}>📌 Pin as Plan</button>
                      <button className={styles.dismissBtn} onClick={() => { setResponse(''); setQuestion(''); setActiveChip(null) }}>Dismiss</button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : streaming ? (
            <>
              <div className={styles.responseTag}>
                <span className="pdot" style={{ animation: 'blink .8s infinite' }} />
                Thinking...
              </div>
              <div className={styles.thinkingDots}>
                <span /><span /><span />
              </div>
            </>
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.placeholderText}>
                Tap a scenario above or ask your own question below. Lumen reads your live balance, upcoming bills, spending patterns, and budget caps before responding.
              </div>
              {balance !== undefined && (
                <div className={styles.placeholderNums}>
                  <div className={styles.pn}>
                    <div className={styles.pnLabel}>Available</div>
                    <div className={styles.pnVal}>${Number(balance).toLocaleString()}</div>
                  </div>
                  <div className={styles.pnDivider} />
                  <div className={styles.pn}>
                    <div className={styles.pnLabel}>After Bills</div>
                    <div className={styles.pnVal}>${Number(balanceAfterBills || 0).toLocaleString()}</div>
                  </div>
                  {plannedSpend > 0 && (
                    <>
                      <div className={styles.pnDivider} />
                      <div className={styles.pn}>
                        <div className={styles.pnLabel}>📌 After Plans</div>
                        <div className={styles.pnVal} style={{ color: (balanceAfterBills - plannedSpend) >= 0 ? 'var(--safe)' : 'var(--debt)' }}>
                          ${Number(balanceAfterBills - plannedSpend).toLocaleString()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="What if I booked flights to Miami this weekend?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              disabled={streaming}
            />
            <button
              className={styles.send}
              onClick={handleSend}
              disabled={streaming || !question.trim()}
            >
              {streaming ? '…' : '→'}
            </button>
          </div>
        </div>
      </div>

      {/* Pinned plans */}
      {plans.length > 0 && (
        <div className={styles.plansWrap}>
          <div className={styles.plansHead}>📌 Active Plans</div>
          {plans.map(p => (
            <div key={p.id} className={styles.planCard}>
              <div className={styles.planQuestion}>{p.question}</div>
              <div className={styles.planResponse}>{p.response}</div>
              <div className={styles.planFooter}>
                {p.amount && <span className={styles.planAmt}>~${Number(p.amount).toLocaleString()}</span>}
                <div className={styles.planBtns}>
                  <button className={styles.completeBtn} onClick={() => handlePlanStatus(p.id, 'completed')}>
                    ✓ Completed
                  </button>
                  <button className={styles.dismissPlanBtn} onClick={() => handlePlanStatus(p.id, 'dismissed')}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


