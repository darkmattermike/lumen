import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../data/api'
import LumenDot from '../LumenDot/LumenDot'
import styles from './Onboarding.module.css'

// ── Conversation script ───────────────────────────────────────
const SCRIPT = [
  {
    id: 'welcome',
    lumen: "Hi! I'm Lumen — your financial picture, clearly. I track your money, spot patterns, and warn you about problems before they happen. Ready to get set up?",
    type: 'choice',
    choices: ["Let's do it", "Skip for now"],
  },
  {
    id: 'account_name',
    lumen: "Great! What's your main checking account called? Just something you'd recognize.",
    type: 'text',
    placeholder: 'e.g. Chase Checking',
    field: 'accountName',
  },
  {
    id: 'account_type',
    lumen: "And what type of account is it?",
    type: 'choice',
    choices: ['Checking', 'Savings', 'Credit Card', 'Cash'],
    field: 'accountType',
  },
  {
    id: 'account_balance',
    lumen: "What's the current balance? Just a rough number is fine.",
    type: 'number',
    placeholder: '0.00',
    prefix: '$',
    field: 'balance',
  },
  {
    id: 'income_amount',
    lumen: "Got it. Now — what's your take-home pay each paycheck? After taxes.",
    type: 'number',
    placeholder: 'e.g. 2500',
    prefix: '$',
    field: 'incomeAmount',
  },
  {
    id: 'income_freq',
    lumen: "And how often do you get paid?",
    type: 'choice',
    choices: ['Weekly', 'Every 2 weeks', 'Twice a month', 'Monthly'],
    field: 'incomeFreq',
  },
  {
    id: 'budget_cat',
    lumen: "Perfect. Which spending category do you most want to keep an eye on? Pick one to start — you can add more later.",
    type: 'choice',
    choices: ['Dining', 'Groceries', 'Transport', 'Shopping', 'Entertainment', 'Subscriptions'],
    field: 'budgetCategory',
  },
  {
    id: 'budget_cap',
    lumen: (data) => `What's your monthly cap for ${data.budgetCategory || 'that category'}?`,
    type: 'number',
    placeholder: 'e.g. 300',
    prefix: '$',
    field: 'budgetCap',
  },
  {
    id: 'connect',
    lumen: "Last thing for setup — how do you want to bring in your transactions?",
    type: 'choice',
    choices: ['Connect my bank (Plaid)', 'Import a CSV', "I'll do it later"],
    field: 'connectChoice',
    note: 'You can always connect your bank later in Accounts.',
  },
  {
    id: 'expense_intro',
    lumen: "One thing that makes Lumen really accurate — your recurring expenses. Bills, rent, subscriptions. Can you add your biggest one right now?",
    type: 'choice',
    choices: ['Sure', 'Skip for now'],
  },
  {
    id: 'expense_name',
    lumen: "What's the bill called?",
    type: 'text',
    placeholder: 'e.g. Rent, Netflix, Car payment',
    field: 'expenseName',
  },
  {
    id: 'expense_amount',
    lumen: (data) => `How much is ${data.expenseName || 'it'} each month?`,
    type: 'number',
    placeholder: 'e.g. 1200',
    prefix: '$',
    field: 'expenseAmount',
  },
  {
    id: 'expense_day',
    lumen: (data) => `And what day of the month does ${data.expenseName || 'it'} usually hit?`,
    type: 'number',
    placeholder: 'e.g. 1 for the 1st, 15 for the 15th',
    field: 'expenseDay',
  },
  {
    id: 'expense_reminder',
    lumen: "Perfect — saved. The more bills you add in the Calendar tab, the more accurate your \"free to spend\" number gets. Add the rest whenever you're ready.",
    type: 'choice',
    choices: ['Got it'],
  },
  {
    id: 'homescreen',
    lumen: "Lumen works best from your home screen — no browser bar, full screen, instant access. It takes about 10 seconds to install.",
    type: 'homescreen',
  },
  {
    id: 'claude_key',
    lumen: "Finally — Lumen has AI features (chat, auto-categorization, spending insights) that run on Claude by Anthropic. You bring your own free API key. Want to know how?",
    type: 'choice',
    choices: ['Show me how', 'Skip for now'],
  },
  {
    id: 'claude_instructions',
    lumen: "Head to console.anthropic.com → sign up free → API Keys → Create Key. Paste it in Settings → API Keys. Your first $5 of usage is free and lasts months for normal use.",
    type: 'claude_instructions',
  },
  {
    id: 'done',
    lumen: (data) => `You're all set${data.accountName ? `, ${data.accountName} is ready` : ''}! I'll start building your financial picture right away.`,
    type: 'done',
  },
]

// ── Typing animation ──────────────────────────────────────────
function LumenMessage({ text, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone]           = useState(false)
  const idx = useRef(0)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    idx.current = 0
    const interval = setInterval(() => {
      if (idx.current >= text.length) {
        clearInterval(interval)
        setDone(true)
        onDone?.()
        return
      }
      setDisplayed(t => t + text[idx.current])
      idx.current++
    }, 18)
    return () => clearInterval(interval)
  }, [text])

  return (
    <div className={styles.lumenBubble}>
      {displayed}
      {!done && <span className={styles.cursor} />}
    </div>
  )
}

// ── Main Onboarding ───────────────────────────────────────────
export default function Onboarding() {
  const { user, completeOnboarding } = useAuth()
  const [step, setStep]       = useState(0)
  const [messages, setMessages] = useState([])  // { role: 'lumen'|'user', text, id }
  const [inputReady, setInputReady] = useState(false)
  const [data, setData]       = useState({
    accountName: '', accountType: '', balance: '',
    incomeAmount: '', incomeFreq: '',
    budgetCategory: '', budgetCap: '',
    connectChoice: '',
    expenseName: '', expenseAmount: '', expenseDay: '',
  })
  const [textInput, setTextInput] = useState('')
  const [saving, setSaving]   = useState(false)
  const bottomRef = useRef(null)

  const currentStep = SCRIPT[step]
  const lumenText   = typeof currentStep?.lumen === 'function'
    ? currentStep.lumen(data) : currentStep?.lumen

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, inputReady])

  // Add first Lumen message on mount
  useEffect(() => {
    setMessages([{ role: 'lumen', text: SCRIPT[0].lumen, id: 0 }])
  }, [])

  function addLumenMessage(text, stepIdx) {
    setInputReady(false)
    setMessages(prev => [...prev, { role: 'lumen', text, id: stepIdx }])
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { role: 'user', text }])
  }

  async function advance(userText, newData) {
    addUserMessage(userText)

    const nextStep = step + 1

    if (nextStep >= SCRIPT.length) {
      // Done
      await saveAndFinish(newData)
      return
    }

    const next = SCRIPT[nextStep]
    const nextText = typeof next.lumen === 'function' ? next.lumen(newData) : next.lumen

    setTimeout(() => {
      setStep(nextStep)
      addLumenMessage(nextText, nextStep)
    }, 400)
  }

  async function handleChoice(choice) {
    if (currentStep.id === 'welcome') {
      if (choice === 'Skip for now') {
        await completeOnboarding()
        return
      }
      addUserMessage(choice)
      setTimeout(() => {
        const next = SCRIPT[1]
        setStep(1)
        addLumenMessage(next.lumen, 1)
      }, 400)
      return
    }

    // Skip expense entry entirely
    if (currentStep.id === 'expense_intro' && choice === 'Skip for now') {
      addUserMessage(choice)
      const skipTo = SCRIPT.findIndex(s => s.id === 'homescreen')
      setTimeout(() => {
        setStep(skipTo)
        addLumenMessage(SCRIPT[skipTo].lumen, skipTo)
      }, 400)
      return
    }

    // Skip Claude key instructions
    if (currentStep.id === 'claude_key' && choice === 'Skip for now') {
      addUserMessage(choice)
      const doneIdx = SCRIPT.findIndex(s => s.id === 'done')
      setTimeout(() => {
        setStep(doneIdx)
        const doneText = typeof SCRIPT[doneIdx].lumen === 'function' ? SCRIPT[doneIdx].lumen(data) : SCRIPT[doneIdx].lumen
        addLumenMessage(doneText, doneIdx)
      }, 400)
      return
    }

    if (currentStep.id === 'connect') {
      const newData = { ...data, connectChoice: choice }
      setData(newData)
      await advance(choice, newData)
      return
    }

    const newData = currentStep.field
      ? { ...data, [currentStep.field]: choice }
      : { ...data }
    if (currentStep.field) setData(newData)
    await advance(choice, newData)
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) return
    const val    = textInput.trim()
    const newData = { ...data, [currentStep.field]: val }
    setData(newData)
    setTextInput('')
    await advance(val, newData)
  }

  async function handleNumberSubmit() {
    const val = textInput.trim() || '0'
    const newData = { ...data, [currentStep.field]: val }
    setData(newData)
    setTextInput('')
    await advance(`$${Number(val).toLocaleString()}`, newData)
  }

  async function saveAndFinish(finalData) {
    setSaving(true)
    try {
      // Create account
      if (finalData.accountName) {
        await api.createAccount({
          name:    finalData.accountName,
          type:    (finalData.accountType || 'checking').toLowerCase().replace(' ', '_').replace('credit card', 'credit'),
          balance: Number(finalData.balance || 0),
          include_in_balance: true,
        })
      }
      // Create income recurring
      if (finalData.incomeAmount) {
        const freqMap = { 'Weekly': 'weekly', 'Every 2 weeks': 'biweekly', 'Twice a month': 'semimonthly', 'Monthly': 'monthly' }
        await api.createRecurring({
          name:        'Paycheck',
          amount:      Number(finalData.incomeAmount),
          type:        'income',
          day_of_month: 1,
          icon:        '💰',
          frequency:   freqMap[finalData.incomeFreq] || 'biweekly',
        })
      }
      // Create recurring expense
      if (finalData.expenseName && finalData.expenseAmount) {
        await api.createRecurring({
          name:         finalData.expenseName,
          amount:       Number(finalData.expenseAmount),
          type:         'bill',
          day_of_month: Number(finalData.expenseDay || 1),
          icon:         '📅',
          frequency:    'monthly',
        }).catch(() => {})
      }
        await api.createBudget({
          name:   finalData.budgetCategory,
          cap:    Number(finalData.budgetCap),
          period: 'monthly',
        })
      }
      await completeOnboarding()
    } catch (err) {
      console.error('[Onboarding] Save error:', err)
      await completeOnboarding()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.orbArea}>
        <LumenDot size={48} />
      </div>

      <div className={styles.thread}>
        {messages.map((msg, i) => (
          msg.role === 'lumen' ? (
            <div key={i} className={styles.lumenRow}>
              <LumenMessage
                text={msg.text}
                onDone={i === messages.length - 1 ? () => setInputReady(true) : undefined}
              />
            </div>
          ) : (
            <div key={i} className={styles.userRow}>
              <div className={styles.userBubble}>{msg.text}</div>
            </div>
          )
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area — only shows after Lumen finishes typing */}
      {inputReady && currentStep && (
        <div className={styles.inputArea}>
          {currentStep.type === 'choice' && (
            <div className={styles.choices}>
              {currentStep.choices.map(c => (
                <button key={c} className={styles.choiceBtn} onClick={() => handleChoice(c)}>
                  {c}
                </button>
              ))}
              {currentStep.note && (
                <div className={styles.choiceNote}>{currentStep.note}</div>
              )}
            </div>
          )}

          {(currentStep.type === 'text' || currentStep.type === 'number') && (
            <div className={styles.textInput}>
              {currentStep.prefix && <span className={styles.prefix}>{currentStep.prefix}</span>}
              <input
                autoFocus
                type={currentStep.type === 'number' ? 'number' : 'text'}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={currentStep.placeholder}
                onKeyDown={e => e.key === 'Enter' && (currentStep.type === 'number' ? handleNumberSubmit() : handleTextSubmit())}
                className={styles.input}
              />
              <button
                className={styles.sendBtn}
                onClick={currentStep.type === 'number' ? handleNumberSubmit : handleTextSubmit}
              >→</button>
            </div>
          )}

          {currentStep.type === 'done' && (
            <button
              className={styles.doneBtn}
              onClick={() => saveAndFinish(data)}
              disabled={saving}
            >
              {saving ? 'Setting up…' : "Let's go →"}
            </button>
          )}

          {currentStep.type === 'homescreen' && (
            <div className={styles.homescreenCard}>
              <div className={styles.homescreenInstructions}>
                <div className={styles.homescreenPlatform}>
                  <span className={styles.homescreenIcon}>🍎</span>
                  <div>
                    <div className={styles.homescreenPlatformName}>iPhone / iPad</div>
                    <div className={styles.homescreenStep}>Safari → Share button → "Add to Home Screen" → Add</div>
                  </div>
                </div>
                <div className={styles.homescreenPlatform}>
                  <span className={styles.homescreenIcon}>🤖</span>
                  <div>
                    <div className={styles.homescreenPlatformName}>Android</div>
                    <div className={styles.homescreenStep}>Chrome → Menu (⋮) → "Add to Home screen" → Add</div>
                  </div>
                </div>
              </div>
              <button className={styles.choiceBtn} onClick={() => {
                addUserMessage("Got it!")
                const nextIdx = step + 1
                setTimeout(() => {
                  setStep(nextIdx)
                  const nextText = typeof SCRIPT[nextIdx].lumen === 'function' ? SCRIPT[nextIdx].lumen(data) : SCRIPT[nextIdx].lumen
                  addLumenMessage(nextText, nextIdx)
                }, 400)
              }}>
                Got it →
              </button>
            </div>
          )}

          {currentStep.type === 'claude_instructions' && (
            <div className={styles.claudeCard}>
              <div className={styles.claudeSteps}>
                {[
                  ['1', 'Go to', 'console.anthropic.com'],
                  ['2', 'Create a free account'],
                  ['3', 'API Keys → Create Key → copy it'],
                  ['4', 'In Lumen: Settings → API Keys → paste'],
                ].map(([n, a, b]) => (
                  <div key={n} className={styles.claudeStep}>
                    <span className={styles.claudeStepNum}>{n}</span>
                    <span className={styles.claudeStepText}>{a}{b ? <> <strong>{b}</strong></> : null}</span>
                  </div>
                ))}
              </div>
              <div className={styles.claudeNote}>Your first $5 of usage is free — lasts months for normal use.</div>
              <button className={styles.choiceBtn} onClick={() => {
                addUserMessage("Thanks!")
                const doneIdx = SCRIPT.findIndex(s => s.id === 'done')
                setTimeout(() => {
                  setStep(doneIdx)
                  const doneText = typeof SCRIPT[doneIdx].lumen === 'function' ? SCRIPT[doneIdx].lumen(data) : SCRIPT[doneIdx].lumen
                  addLumenMessage(doneText, doneIdx)
                }, 400)
              }}>
                Done →
              </button>
            </div>
          )}
        </div>
      )}

      <button className={styles.skipBtn} onClick={() => completeOnboarding()}>
        Skip setup
      </button>
    </div>
  )
}
