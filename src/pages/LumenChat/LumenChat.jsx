import { useState, useRef, useEffect } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import { api } from '../../data/api'
import styles from './LumenChat.module.css'

// ── Suggestion chips grouped by mode ─────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Can I afford a $800 laptop?',          mode: 'purchase',  icon: '🛒' },
  { label: 'How much on dining last 60 days?',      mode: 'query',     icon: '🔍' },
  { label: 'Save $5,000 by end of year',            mode: 'goal',      icon: '🎯' },
  { label: "What's my spending floor this month?",  mode: 'scenario',  icon: '📊' },
  { label: 'Show all Amazon charges this month',    mode: 'query',     icon: '🔍' },
  { label: 'What if I cut dining in half?',         mode: 'scenario',  icon: '📊' },
  { label: 'Can I afford a weekend trip for $400?', mode: 'purchase',  icon: '🛒' },
  { label: 'Build a $1,000 emergency fund',         mode: 'goal',      icon: '🎯' },
]

const MODE_LABELS = {
  purchase: { label: 'Purchase Decision', color: 'var(--calm)',  icon: '🛒' },
  query:    { label: 'Data Query',         color: 'var(--safe)',  icon: '🔍' },
  goal:     { label: 'Goal Planning',      color: 'var(--goal)',  icon: '🎯' },
  scenario: { label: 'Scenario Model',     color: 'var(--warn)',  icon: '📊' },
  chat:     { label: 'Lumen',              color: 'var(--calm)',  icon: '✦'  },
}

const VERDICT_CONFIG = {
  yes:     { color: 'var(--safe)',  label: 'Yes',      icon: '✅' },
  yes_but: { color: 'var(--warn)',  label: 'Go for it — but',  icon: '⚠️' },
  wait:    { color: 'var(--warn)',  label: 'Wait',     icon: '⏳' },
  no:      { color: 'var(--debt)',  label: 'Not right now', icon: '❌' },
}

function detectMode(text) {
  const t = text.toLowerCase()
  if (/can i afford|should i buy|worth (it|buying)|purchase/.test(t)) return 'purchase'
  if (/save|goal|by (january|february|march|april|may|june|july|august|september|october|november|december|end of year|next year)|emergency fund/.test(t)) return 'goal'
  if (/what if|scenario|refinanc|floor|minimum|payoff|timeline|savings rate/.test(t)) return 'scenario'

  // Only route to /query for simple single-subject lookups (merchant/category history).
  // Complex questions involving accounts, bills, investments, advice, or multi-part
  // reasoning must go to /ask which has full financial context injected.
  const isComplexFinancial = /bill|invest|account|balance|cover|afford|put in|savings|checking|upcoming|between now|need to|how much do i need|how much can i|cover bills|my investment/.test(t)
  if (!isComplexFinancial && /how much did|how many times|when did i (last|pay)|show me|total spent on|last \d+ days|charges from|find all|list all/.test(t)) return 'query'

  return 'chat'
}

// ── Message renderers ─────────────────────────────────────────────────────────
function PurchaseMessage({ data }) {
  if (!data) return null
  const cfg = VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.yes_but
  return (
    <div className={styles.purchaseCard}>
      <div className={styles.purchaseVerdict} style={{ background: cfg.color }}>
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
        <span className={styles.purchaseItem}>{data.item} · ${Number(data.amount).toLocaleString()}</span>
      </div>
      <div className={styles.purchaseHeadline}>{data.headline}</div>
      <p className={styles.purchaseReasoning}>{data.reasoning}</p>
      {data.alternative && (
        <div className={styles.purchaseAlt}>💡 {data.alternative}</div>
      )}
    </div>
  )
}

function QueryMessage({ data }) {
  if (!data) return null
  return (
    <div className={styles.queryCard}>
      <p className={styles.queryAnswer}>{data.answer}</p>
      {data.data?.length > 0 && (
        <div className={styles.queryTable}>
          {data.data.slice(0, 8).map((row, i) => (
            <div key={i} className={styles.queryRow}>
              <span className={styles.queryRowName}>{row.merchant || row.name || row.category || '—'}</span>
              <span className={styles.queryRowVal}>
                {row.total != null ? `$${Number(row.total).toFixed(2)}` :
                 row.amount != null ? `${Number(row.amount) < 0 ? '−' : '+'}$${Math.abs(Number(row.amount)).toFixed(2)}` : '—'}
              </span>
              {row.visits != null && <span className={styles.queryRowSub}>{row.visits}×</span>}
              {row.date   != null && <span className={styles.queryRowSub}>{String(row.date).slice(0,10)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GoalMessage({ data }) {
  if (!data) return null
  const g = data.goal || {}
  const p = data.plan || {}
  const feasibilityColor = {
    easy:         'var(--safe)',
    stretch:      'var(--warn)',
    aggressive:   'var(--warn)',
    not_feasible: 'var(--debt)',
  }[p.feasibility] || 'var(--calm)'

  return (
    <div className={styles.goalCard}>
      <div className={styles.goalHeader}>
        <span className={styles.goalIcon}>{g.icon || '🎯'}</span>
        <div>
          <div className={styles.goalName}>{g.name}</div>
          <div className={styles.goalTarget}>${Number(g.target_amount || 0).toLocaleString()}
            {g.target_date && ` · by ${new Date(g.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
          </div>
        </div>
        <div className={styles.goalBadge} style={{ color: feasibilityColor }}>
          {p.feasibility || 'savings'}
        </div>
      </div>
      {g.monthly_contribution > 0 && (
        <div className={styles.goalContrib}>
          ${Number(g.monthly_contribution).toLocaleString()}<span>/month needed</span>
          {p.months_needed && <span className={styles.goalMonths}> · {p.months_needed} months</span>}
        </div>
      )}
      <p className={styles.goalSummary}>{data.message}</p>
      <div className={styles.goalCreated}>✅ Goal created — track it on the Goals page</div>
    </div>
  )
}

function ScenarioMessage({ data }) {
  if (!data) return null
  return (
    <div className={styles.scenarioCard}>
      {data.headline && <div className={styles.scenarioHeadline}>{data.headline}</div>}
      {data.breakdown?.length > 0 && (
        <div className={styles.scenarioBreakdown}>
          {data.breakdown.map((row, i) => (
            <div key={i} className={`${styles.scenarioRow} ${row.highlight ? styles.scenarioRowHL : ''}`}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      )}
      <p className={styles.scenarioVerdict}>{data.verdict}</p>
      {data.caveat && <div className={styles.scenarioCaveat}>⚠️ {data.caveat}</div>}
    </div>
  )
}

function ChatMessage({ text }) {
  return <p className={styles.chatText}>{text}</p>
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LumenChat() {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [streamText, setStreamText] = useState('')
  const inputRef                  = useRef(null)
  const bottomRef                 = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  function addMessage(role, mode, content, structured = null) {
    setMessages(prev => [...prev, { role, mode, content, structured, id: Date.now() + Math.random() }])
  }

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    const mode = detectMode(msg)
    addMessage('user', mode, msg)

    try {
      if (mode === 'purchase') {
        // Extract amount from message
        const amtMatch = msg.match(/\$?([\d,]+(?:\.\d{2})?)/)?.[1]
        const amount   = amtMatch ? parseFloat(amtMatch.replace(',', '')) : 100
        const item     = msg.replace(/can i afford|should i buy|\$[\d,]+/gi, '').trim() || msg
        const data     = await api.purchaseDecision({ item, amount, message: msg })
        addMessage('assistant', 'purchase', null, data)

      } else if (mode === 'query') {
        const data = await api.nlQuery({ message: msg })
        addMessage('assistant', 'query', null, data)

      } else if (mode === 'goal') {
        const data = await api.goalPlan({ message: msg })
        addMessage('assistant', 'goal', null, data)

      } else if (mode === 'scenario') {
        const data = await api.scenario({ message: msg })
        addMessage('assistant', 'scenario', null, data)

      } else {
        // Streaming chat
        let full = ''
        setStreamText('')
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/lumen/ask`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body:    JSON.stringify({ message: msg, context_type: 'chat' }),
        })
        // Check for non-OK response before streaming
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          if (errBody.error === 'NO_KEY') {
            addMessage('assistant', 'chat', 'Add your Anthropic API key in Settings → AI to enable responses.')
          } else {
            addMessage('assistant', 'chat', `Error ${response.status}: ${errBody.message || 'Something went wrong.'}`)
          }
          return
        }

        const reader = response.body.getReader()
        const dec    = new TextDecoder()
        let streamDone = false
        while (!streamDone) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = dec.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.type === 'text') { full += evt.text; setStreamText(full) }
              if (evt.type === 'error') { full = evt.message || 'Something went wrong.'; streamDone = true; break }
              if (evt.type === 'done') { streamDone = true; break }
            } catch { /* ignore parse errors */ }
          }
        }
        setStreamText('')
        if (full) addMessage('assistant', 'chat', full)
      }
    } catch (err) {
      addMessage('assistant', 'chat', `Something went wrong: ${err.message}`)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <ScreenWrap>
      {/* Header — matches Rules/Goals/Insights */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <LumenDot
            size={44}
            mood={loading ? 'thinking' : 'idle'}
            rings={!loading}
          />
          <div>
            <div className={styles.pre}>AI Assistant</div>
            <h1 className={styles.title}>Lumen</h1>
            <p className={styles.sub}>Ask anything about your money — queries, purchase decisions, goals, what-ifs.</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.modeChips}>
            {Object.entries(MODE_LABELS).filter(([k]) => k !== 'chat').map(([key, cfg]) => (
              <div key={key} className={styles.modeChip} style={{ '--chip-color': cfg.color }}>
                <span>{cfg.icon}</span> {cfg.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div className={styles.chatBody}>
          {isEmpty && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>What do you want to know?</div>
              <div className={styles.emptyGrid}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className={styles.suggestion} onClick={() => send(s.label)}>
                    <span className={styles.suggestionIcon}>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`${styles.msg} ${styles[msg.role]}`}>
              {msg.role === 'assistant' && (
                <div className={styles.msgMeta}>
                  <span className={styles.msgMode} style={{ color: MODE_LABELS[msg.mode]?.color }}>
                    {MODE_LABELS[msg.mode]?.icon} {MODE_LABELS[msg.mode]?.label}
                  </span>
                </div>
              )}
              <div className={styles.msgBubble}>
                {msg.role === 'user' && <p className={styles.userText}>{msg.content}</p>}
                {msg.role === 'assistant' && msg.mode === 'purchase'  && <PurchaseMessage data={msg.structured} />}
                {msg.role === 'assistant' && msg.mode === 'query'     && <QueryMessage    data={msg.structured} />}
                {msg.role === 'assistant' && msg.mode === 'goal'      && <GoalMessage     data={msg.structured} />}
                {msg.role === 'assistant' && msg.mode === 'scenario'  && <ScenarioMessage data={msg.structured} />}
                {msg.role === 'assistant' && msg.mode === 'chat'      && <ChatMessage     text={msg.content} />}
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {loading && streamText && (
            <div className={`${styles.msg} ${styles.assistant}`}>
              <div className={styles.msgMeta}>
                <span className={styles.msgMode} style={{ color: 'var(--calm)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <LumenDot size={8} mood="speaking" />✦ Lumen
              </span>
              </div>
              <div className={styles.msgBubble}>
                <p className={styles.chatText}>{streamText}<span className={styles.cursor}>▌</span></p>
              </div>
            </div>
          )}

          {loading && !streamText && (
            <div className={`${styles.msg} ${styles.assistant}`}>
              <div className={styles.msgBubble}>
                <div className={styles.thinking}>
                  <LumenDot size={14} mood="thinking" rings />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Lumen anything — spend queries, purchase decisions, goals, what-ifs…"
            rows={1}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
    </ScreenWrap>
  )
}
