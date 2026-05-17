import { useState } from 'react'
import LumenDot from '../LumenDot/LumenDot'
import styles from './WhatIfTheater.module.css'

const SCENARIOS = [
  { id: 'dinner',   emoji: '🍽️', label: 'Dinner out',       cost: '~$65',       verdict: { balance: '$4,153', delta: '−$65',  note: 'dining: 121% of cap', text: 'Dinner at around <w>$65</w> takes your free cash to <s>$4,153</s>. After every bill already promised this cycle, that leaves <s>$3,963</s>. Pressure gauge stays exactly on SAFE — <em>not a single point of movement.</em> Dining is technically over your $200 cap, but your overall finances are completely healthy. My read: <s>go to dinner.</s>' } },
  { id: 'trip',     emoji: '✈️', label: 'Weekend trip',     cost: '~$380',      verdict: { balance: '$3,838', delta: '−$380', note: 'safe but noticeable', text: 'A $380 trip takes you to <s>$3,838</s>. After committed bills: <s>$3,648</s>. Pressure ticks from SAFE toward WATCH but doesn\'t cross. Paycheck May 24 resets you fully. If you\'re comfortable, this is a <s>greenlight with eyes open.</s>' } },
  { id: 'shopping', emoji: '🛍️', label: 'Shopping spree',   cost: '~$200',      verdict: { balance: '$4,018', delta: '−$200', note: 'on track',            text: 'Spending <w>$200</w> brings you to <s>$4,018</s>. After bills: <s>$3,828</s>. The gauge barely moves. <em>No flags.</em> This one\'s comfortable.' } },
  { id: 'spotify',  emoji: '🎵', label: 'Cancel Spotify',   cost: 'save $10.99/mo', verdict: { balance: '$4,229', delta: '+$10.99/mo', note: 'subscription saved', text: 'Cutting Spotify saves <s>$10.99/month</s> — <s>$131.88/year</s>. Small individually, but Lumen tracks 3 active streaming services and notices Netflix had only 2 hours of use this month. Worth pairing this with a Netflix audit too.' } },
  { id: 'coffee',   emoji: '☕', label: 'Daily coffee',     cost: '+$6/day',     verdict: { balance: '$4,032', delta: '+$6/day', note: '~$186/mo at pace',  text: 'Daily coffee at $6 adds up to <w>~$186/month</w>. That\'s within budget now but eats into your dining cap. Over 12 months: <w>$2,232</w>. Lumen says: enjoy it — <em>just know the math.</em>' } },
  { id: 'netflix',  emoji: '📺', label: 'Cancel Netflix',   cost: 'save $15.49/mo', verdict: { balance: '$4,233', delta: '+$15.49/mo', note: 'low usage detected', text: 'Netflix has seen <w>2 hours of use this month</w>. Canceling saves <s>$185.88/year</s>. Lumen flagged this — it\'s the highest-impact low-effort saving you can make right now.' } },
  { id: 'uber',     emoji: '🚗', label: 'Ubers this week',  cost: '~$45',        verdict: { balance: '$4,173', delta: '−$45',  note: '3x your avg pace',   text: 'Adding $45 in Ubers takes you to <s>$4,173</s>. Transport budget is already at 85% though — this pushes it <w>past cap</w>. Your finances stay healthy. Lumen\'s note: Uber usage is already running <w>3x your 90-day average</w>. Worth watching.' } },
]

export default function WhatIfTheater() {
  const [active, setActive] = useState('dinner')
  const scenario = SCENARIOS.find(s => s.id === active)

  return (
    <div className={styles.theater}>
      <div className={styles.header}>
        <LumenDot size={14} />
        <div>
          <div className={styles.title}>What <em>if</em>...</div>
          <div className={styles.sub}>Tap a scenario. Lumen runs the real numbers.</div>
        </div>
      </div>

      <div className={styles.chips}>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            className={`${styles.chip} ${active === s.id ? styles.chipOn : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.emoji} {s.label} · {s.cost}
          </button>
        ))}
        <button className={`${styles.chip} ${styles.chipAsk}`}>
          ✦ Ask your own
        </button>
      </div>

      <div className={styles.spotlight}>
        <div className={styles.dotCol}>
          <LumenDot size={44} rings />
          <div className={styles.dotLabel}>Lumen</div>
        </div>
        <div className={styles.response}>
          <div className={styles.responseTag}>
            <span className="pdot" />
            Responding to: {scenario.label} ({scenario.cost})
          </div>
          <div
            className={styles.responseText}
            dangerouslySetInnerHTML={{ __html: formatResponse(scenario.verdict.text) }}
          />
          <div className={styles.resultBar}>
            <div className={styles.newBalance}>{scenario.verdict.balance}</div>
            <span className="delta neg">{scenario.verdict.delta}</span>
            <span className="delta neu">{scenario.verdict.note}</span>
          </div>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              placeholder="Ask Lumen anything — 'What if I booked flights to Miami for the long weekend?'"
            />
            <button className={styles.send}>→</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Converts shorthand tags in verdict text to HTML
function formatResponse(text) {
  return text
    .replace(/<s>(.*?)<\/s>/g, '<strong>$1</strong>')
    .replace(/<w>(.*?)<\/w>/g, '<span class="w">$1</span>')
    .replace(/<em>(.*?)<\/em>/g, '<em>$1</em>')
}
