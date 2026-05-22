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
    lumen: "Last thing — how do you want to bring in your transactions?",
    type: 'choice',
    choices: ['Connect my bank (Plaid)', 'Import a CSV', "I'll do it later"],
    field: 'connectChoice',
    note: 'You can always connect your bank later in Accounts.',
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

    if (currentStep.id === 'connect') {
      const newData = { ...data, connectChoice: choice }
      setData(newData)
      await advance(choice, newData)
      return
    }

    const newData = { ...data, [currentStep.field]: choice }
    setData(newData)
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
      // Create budget
      if (finalData.budgetCategory && finalData.budgetCap) {
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
        </div>
      )}

      <button className={styles.skipBtn} onClick={() => completeOnboarding()}>
        Skip setup
      </button>
    </div>
  )
}
