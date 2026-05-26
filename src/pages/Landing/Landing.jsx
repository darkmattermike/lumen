import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import s from './Landing.module.css'

// ── Orb component ─────────────────────────────────────────────
function Orb({ size = 20, mood = 'breathe', className = '', style = {} }) {
  const moodClass = mood === 'happy'    ? s.dotHappy
    : mood === 'thinking' ? s.dotThinking
    : ''
  return (
    <div
      className={`${s.dot} ${moodClass} ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  )
}

// Orb with pulsing rings
function OrbWithRings({ size = 160, mood = 'happy' }) {
  return (
    <div className={s.ringWrap} style={{ width: size, height: size }}>
      {[0,1,2,3].map(i => (
        <span key={i} className={s.ring} style={{ width: size, height: size }} />
      ))}
      <Orb size={size} mood={mood} style={{ position: 'relative', zIndex: 5 }} />
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────
export default function Landing() {
  const [navScrolled, setNavScrolled]   = useState(false)
  const [orbMood,     setOrbMood]       = useState('happy')
  const particleRef = useRef(null)

  // Nav scroll shrink
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll(`.${s.reveal}`)
    const io  = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add(s.visible); io.unobserve(e.target) }
      })
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Hero orb interaction
  function handleOrbHover() {
    setOrbMood('thinking')
    setTimeout(() => setOrbMood('happy'), 2000)
  }

  function handleOrbClick() {
    setOrbMood('happy')
    const wrap = particleRef.current
    if (!wrap) return
    for (let i = 0; i < 14; i++) {
      setTimeout(() => {
        const p = document.createElement('span')
        const angle = Math.random() * 360
        const dist  = 60 + Math.random() * 80
        p.style.cssText = `
          position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;
          background:radial-gradient(circle,rgba(93,202,165,.9),transparent);
          pointer-events:none;z-index:20;
          animation:lp-burst 500ms cubic-bezier(.25,.46,.45,.94) both;
          --a:${angle}deg;--d:${dist}px;
        `
        wrap.appendChild(p)
        setTimeout(() => p.remove(), 600)
      }, i * 20)
    }
  }

  return (
    <>
      {/* Particle burst keyframes injected once */}
      <style>{`
        @keyframes lp-burst {
          0%   { transform:translate(-50%,-50%) rotate(var(--a)) translateX(2px) scale(.5); opacity:1; }
          100% { transform:translate(-50%,-50%) rotate(var(--a)) translateX(var(--d)) scale(0); opacity:0; }
        }
      `}</style>

      <div className={s.page}>

        {/* ── Nav ── */}
        <nav className={`${s.nav} ${navScrolled ? s.navScrolled : ''}`}>
          <Link to="/" className={s.navLogo}>
            <Orb size={18} />
            <span className={s.navWordmark}>Lumen</span>
          </Link>
          <div className={s.navLinks}>
            <a href="#principles" className={s.navLink}>How it works</a>
            <a href="#features"   className={s.navLink}>Features</a>
            <a href="#pricing"    className={s.navLink}>Pricing</a>
            <a href="#security"   className={s.navLink}>Security</a>
          </div>
          <Link to="/register" className={s.navCta}>Start free</Link>
        </nav>


        {/* ── Hero ── */}
        <section className={s.hero}>
          <div className={s.heroEyebrow}>Your financial oracle</div>

          <div
            ref={particleRef}
            className={s.heroOrbWrap}
            onMouseEnter={handleOrbHover}
            onClick={handleOrbClick}
          >
            <OrbWithRings size={160} mood={orbMood} />
          </div>

          <div className={s.heroQ}>
            <span className={s.heroQDim}>How much can I</span>
            <span className={s.heroQMain}>spend right now</span>
            <em className={s.heroQGreen}>— exactly?</em>
          </div>

          <div className={s.heroAnswer}>Lumen knows the answer</div>

          <p className={s.heroSub}>
            Most apps tell you what you spent <strong>last month.</strong> Lumen
            tells you what you can spend <strong>today</strong> — after every
            upcoming bill, recurring charge, and paycheck between now and
            month-end. One number. Always honest.
          </p>

          <div className={s.heroActions}>
            <Link to="/register" className={s.btnPrimary}>Get your answer free →</Link>
            <a href="#features" className={s.btnGhost}>See how it works</a>
          </div>

          <div className={s.heroScroll}>
            <div className={s.heroScrollLine} />
            <div className={s.heroScrollLabel}>Scroll</div>
          </div>
        </section>


        {/* ── Four Principles ── */}
        <section className={s.principles} id="principles">
          {[
            { n: '01', q: 'Where am I?',     c: 'var(--safe)', hue: '0deg',   body: 'Every account balance, live. Checking, savings, credit, debt — one honest net worth number, updated the moment a transaction posts.' },
            { n: '02', q: 'What happened?',  c: 'var(--calm)', hue: '140deg', body: 'Every transaction, auto-categorized. Spending pace vs last month. Budget burn by category. AI that flags unusual charges before you notice them.' },
            { n: '03', q: "What's coming?",  c: 'var(--warn)', hue: '200deg', body: 'Bills calendar, payday schedule, projected cash flow. Know your balance before rent hits — not the morning after it clears.' },
            { n: '04', q: 'What if?',        c: 'var(--goal)', hue: '260deg', body: 'Model a big purchase or new subscription before you commit. See the ripple effect on your balance through month-end, in real time.' },
          ].map((p, i) => (
            <div key={p.n} className={`${s.principle} ${s.reveal} ${[s.d1,s.d1,s.d2,s.d3][i]}`}
              style={{ '--accent': p.c }}>
              <div className={s.principleOrbWrap}>
                <Orb size={14} style={{ filter: `hue-rotate(${p.hue})` }} />
              </div>
              <div className={s.pNum} style={{ '--accent': p.c }}>{p.n}</div>
              <div className={s.pQ}>{p.q}</div>
              <p className={s.pBody}>{p.body}</p>
              <div className={s.principleAccent} style={{ '--accent': p.c }} />
            </div>
          ))}
        </section>


        {/* ── Features ── */}
        <div className={s.features} id="features">

          {/* 01 — Where am I */}
          <div className={`${s.feature} ${s.reveal}`} style={{ '--accent': 'var(--safe)' }}>
            <div className={s.featureContent}>
              <div className={s.featureNum} style={{ '--accent': 'var(--safe)' }}>01 · Where am I</div>
              <h2 className={s.featureQ}>What's my <em style={{ fontStyle:'italic', color:'var(--safe)' }}>real</em><br />balance right now?</h2>
              <p className={s.featureBody}>
                Every account you own — checking, savings, credit cards, loans —
                synced live through Plaid. <strong>One number that's actually honest,</strong> updated
                the moment a transaction posts, not when your bank decides to show it.
              </p>
              <div className={s.featureTags}>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--safe)' }}>Live bank sync</span>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--safe)' }}>Net worth tracking</span>
                <span className={s.featureTag}>Plaid-powered</span>
                <span className={s.featureTag}>Read-only access</span>
              </div>
            </div>
            <div className={s.featureVisual} style={{ '--accent': 'var(--safe)' }}>
              <div className={s.cardStack}>
                {[
                  { icon:'🏦', name:'ATN Checking',   sub:'····4510 · Stearns Bank', bal:'$1,737',   color:'var(--safe)' },
                  { icon:'💰', name:'Market Savings',  sub:'····1244 · Stearns Bank', bal:'$6,103',   color:'var(--calm)' },
                  { icon:'💳', name:'Chase Sapphire',  sub:'····9821 · Chase',         bal:'−$2,841',  color:'var(--debt)' },
                ].map(a => (
                  <div key={a.name} className={s.acctCard}>
                    <span className={s.acctCardIcon}>{a.icon}</span>
                    <div className={s.acctCardInfo}>
                      <div className={s.acctCardName}>{a.name}</div>
                      <div className={s.acctCardSub}>{a.sub}</div>
                    </div>
                    <div className={s.acctCardBal} style={{ color: a.color }}>{a.bal}</div>
                  </div>
                ))}
                <div className={s.cardTotal}>
                  <span className={s.cardTotalL}>Net worth</span>
                  <span className={s.cardTotalV}>$12,113</span>
                </div>
              </div>
            </div>
          </div>

          {/* 02 — What happened */}
          <div className={`${s.feature} ${s.featureFlip} ${s.reveal}`} style={{ '--accent': 'var(--calm)' }}>
            <div className={s.featureContent}>
              <div className={s.featureNum} style={{ '--accent': 'var(--calm)' }}>02 · What happened</div>
              <h2 className={s.featureQ}>Where did my money <em style={{ fontStyle:'italic', color:'var(--calm)' }}>actually go?</em></h2>
              <p className={s.featureBody}>
                Every transaction, auto-categorized. Spending pace vs last month.
                Budget burn by category. <strong>Lumen flags unusual charges before
                you notice them</strong> — new merchants, first-time amounts, subscription increases.
              </p>
              <div className={s.featureTags}>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--calm)' }}>AI categorization</span>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--calm)' }}>Spending pace</span>
                <span className={s.featureTag}>Budget tracking</span>
                <span className={s.featureTag}>Anomaly detection</span>
              </div>
            </div>
            <div className={s.featureVisual} style={{ '--accent': 'var(--calm)' }}>
              <div className={s.paceCard}>
                <div className={s.paceHeader}>
                  <div className={s.pacePre}>This month · Day 21 of 31</div>
                  <div className={s.paceTitle}>Spending pace</div>
                </div>
                <div className={s.paceStats}>
                  {[['So far','$6,176','var(--warn)'],['Projected','$9,116','var(--calm)'],['Last mo.','$8,597','var(--ink-2)']].map(([l,v,c]) => (
                    <div key={l} className={s.paceStat}>
                      <div className={s.paceStatL}>{l}</div>
                      <div className={s.paceStatV} style={{ color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className={s.paceChart}>
                  <div className={s.paceBarLabel}><span>$0</span><span>On pace</span><span>$9,116</span></div>
                  <div className={s.paceBarTrack}>
                    <div className={s.paceBarFill} style={{ width:'68%', background:'var(--calm)' }} />
                  </div>
                  <div className={s.paceCats}>
                    {[['🛍 Shopping','100%','var(--debt)','$768'],['🥦 Groceries','80%','var(--warn)','$797'],['🏠 Rent','96%','var(--safe)','$1,830'],['📱 Subscriptions','75%','var(--calm)','$188']].map(([n,w,c,a]) => (
                      <div key={n} className={s.paceCat}>
                        <span className={s.paceCatName}>{n}</span>
                        <div className={s.paceCatBar}><div className={s.paceCatFill} style={{ width:w, background:c }} /></div>
                        <span className={s.paceCatAmt} style={{ color:c }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 03 — What's coming */}
          <div className={`${s.feature} ${s.reveal}`} style={{ '--accent': 'var(--warn)' }}>
            <div className={s.featureContent}>
              <div className={s.featureNum} style={{ '--accent': 'var(--warn)' }}>03 · What's coming</div>
              <h2 className={s.featureQ}>What hits my account <em style={{ fontStyle:'italic', color:'var(--warn)' }}>next?</em></h2>
              <p className={s.featureBody}>
                Bills calendar, payday schedule, projected cash flow through month-end.
                <strong> Know your balance before rent clears — not the morning after.</strong>{' '}
                Lumen auto-detects recurring charges and surfaces upcoming cash crunches.
              </p>
              <div className={s.featureTags}>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--warn)' }}>Bills calendar</span>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--warn)' }}>Cash flow forecast</span>
                <span className={s.featureTag}>Auto-detected recurring</span>
                <span className={s.featureTag}>Payday tracking</span>
              </div>
            </div>
            <div className={s.featureVisual} style={{ '--accent': 'var(--warn)' }}>
              <div className={s.calendarCard}>
                <div className={s.calHeader}>
                  <span className={s.calMonth}>May 2026</span>
                  <span className={s.calBalance}>$1,737 available</span>
                </div>
                <div className={s.calItems}>
                  {[
                    { day:'22', name:'Spotify',       sub:'Subscription · Today',   amt:'−$15',    c:'var(--debt)', dc:s.calDayToday },
                    { day:'25', name:'Payday 💰',     sub:'Direct deposit · 3 days', amt:'+$3,128', c:'var(--safe)', dc:s.calDaySoon },
                    { day:'25', name:'Rent',          sub:'Auto-pay · 3 days',       amt:'−$1,910', c:'var(--debt)', dc:s.calDaySoon },
                    { day:'28', name:'Sprint',        sub:'Recurring · 6 days',      amt:'−$180',   c:'var(--debt)', dc:'' },
                    { day:'31', name:'Auto Insurance',sub:'Monthly · 9 days',        amt:'−$294',   c:'var(--debt)', dc:'' },
                  ].map((r, i) => (
                    <div key={i} className={s.calItem}>
                      <div className={`${s.calDay} ${r.dc}`}>{r.day}</div>
                      <div className={s.calInfo}>
                        <div className={s.calName}>{r.name}</div>
                        <div className={s.calSub}>{r.sub}</div>
                      </div>
                      <div className={s.calAmt} style={{ color: r.c }}>{r.amt}</div>
                    </div>
                  ))}
                </div>
                <div className={s.calFooter}>
                  <span className={s.calFooterL}>Month-end projection</span>
                  <span className={s.calFooterV}>$2,476 remaining</span>
                </div>
              </div>
            </div>
          </div>

          {/* 04 — What if */}
          <div className={`${s.feature} ${s.featureFlip} ${s.reveal}`} style={{ '--accent': 'var(--goal)' }}>
            <div className={s.featureContent}>
              <div className={s.featureNum} style={{ '--accent': 'var(--goal)' }}>04 · What if</div>
              <h2 className={s.featureQ}>Can I actually <em style={{ fontStyle:'italic', color:'var(--goal)' }}>afford this?</em></h2>
              <p className={s.featureBody}>
                Model a big purchase, a new monthly subscription, or a salary change
                before you commit. <strong>Lumen shows the ripple effect on your balance
                through month-end, live</strong> — before it's real money.
              </p>
              <div className={s.featureTags}>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--goal)' }}>Scenario modeling</span>
                <span className={`${s.featureTag} ${s.featureTagLit}`} style={{ '--accent': 'var(--goal)' }}>Ask Lumen AI</span>
                <span className={s.featureTag}>Purchase decisions</span>
                <span className={s.featureTag}>What-if projections</span>
              </div>
            </div>
            <div className={s.featureVisual} style={{ '--accent': 'var(--goal)' }}>
              <div className={s.scenarioCard}>
                <div className={s.scHeader}>
                  <div className={s.scPre}>What if</div>
                  <div className={s.scTitle}>Scenario modeling</div>
                </div>
                <div className={s.scPrompt}>
                  <div className={s.scPromptLabel}>I want to buy...</div>
                  <div className={s.scInputFake}>New MacBook Pro — $2,499</div>
                </div>
                <div className={s.scResult}>
                  {[
                    ['Current balance',    '$1,737',  'var(--safe)'],
                    ['After purchase',     '−$762',   'var(--debt)'],
                    ['Upcoming bills',     '−$2,399', 'var(--warn)'],
                    ['Next payday (+3d)',  '+$3,128', 'var(--safe)'],
                  ].map(([l,v,c]) => (
                    <div key={l} className={s.scRow}>
                      <span className={s.scRowL}>{l}</span>
                      <span className={s.scRowV} style={{ color:c }}>{v}</span>
                    </div>
                  ))}
                  <div className={s.scVerdict}>
                    <span className={s.scVerdictIcon}>💡</span>
                    <span>You'd go <strong>negative until May 25</strong>, but recover after payday. Safe to buy — if you can wait 3 days.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>


        {/* ── Social Proof ── */}
        <section className={s.proof}>
          <div className={`${s.proofHeader} ${s.reveal}`}>
            <div className={s.proofEyebrow}>What people say</div>
            <h2 className={s.proofH}>Finally, an app that answers the right question.</h2>
          </div>
          <div className={s.proofGrid}>
            {[
              { q: 'I used to check my bank balance five times a day and still feel anxious. Lumen gave me **one number I actually trust** — I\'ve stopped anxiety-checking completely.', name: 'Sarah M.', role: 'Freelance designer · beta user', bg: 'radial-gradient(circle at 38% 34%,#ccfff0,#5dcaa5 48%,#1a5e42)' },
              { q: 'The bills calendar changed everything. I knew rent and three other charges were hitting the same week — moved money in advance. **First time I didn\'t overdraft in two years.**', name: 'Marcus T.', role: 'Software engineer · beta user', bg: 'radial-gradient(circle at 38% 34%,#ccd4ff,#6c8cff 48%,#1a2e6e)' },
              { q: 'My partner and I share a family plan. **No more "did you pay the electric bill?" conversations.** We both just look at Lumen. Most peaceful our finances have ever been.', name: 'Priya & James K.', role: 'Family plan · beta users', bg: 'radial-gradient(circle at 38% 34%,#ffe4cc,#f0b04c 48%,#6e3a0f)' },
            ].map((t, i) => (
              <div key={i} className={`${s.proofCard} ${s.reveal} ${[s.d1,s.d2,s.d3][i]}`}>
                <p className={s.proofQuote}>
                  {t.q.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                  )}
                </p>
                <div className={s.proofMeta}>
                  <div className={s.proofAvatar} style={{ background: t.bg }} />
                  <div>
                    <div className={s.proofName}>{t.name}</div>
                    <div className={s.proofRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* ── Pricing ── */}
        <section className={`${s.pricing} ${s.reveal}`} id="pricing">
          <div className={s.pricingHeader}>
            <div className={s.pricingEyebrow}>Pricing</div>
            <h2 className={s.pricingH}>Simple. No surprises.</h2>
            <p className={s.pricingSub}>Start free. Upgrade when you're ready.</p>
          </div>
          <div className={s.pricingGrid}>
            {/* Free */}
            <div className={`${s.plan} ${s.reveal}`}>
              <div className={s.planName}>Free</div>
              <div className={s.planPrice}>$0</div>
              <div className={s.planPeriod}>forever</div>
              <div className={s.planDivider} />
              <div className={s.planFeatures}>
                {['Manual account entry','Budget tracking','Bills calendar','Spending pace'].map(f => <div key={f} className={s.planFeature}>{f}</div>)}
                {['Live bank sync','AI insights','Family plan'].map(f => <div key={f} className={`${s.planFeature} ${s.planFeatureDim}`}>{f}</div>)}
              </div>
              <Link to="/register" className={s.planCta}>Get started</Link>
            </div>

            {/* Plus */}
            <div className={`${s.plan} ${s.planFeatured} ${s.reveal} ${s.d1}`}>
              <div className={s.planBadge}>Most popular</div>
              <div className={s.planName}>Plus</div>
              <div className={s.planPrice}>$4<span className={s.planPriceCents}>.99</span></div>
              <div className={s.planPeriod}>per month</div>
              <div className={s.planDivider} />
              <div className={s.planFeatures}>
                {['Everything in Free','Live bank sync via Plaid','Auto transaction import','AI categorization + insights','Scenario modeling','Gmail receipt parsing'].map(f => <div key={f} className={s.planFeature}>{f}</div>)}
                <div className={`${s.planFeature} ${s.planFeatureDim}`}>Family plan</div>
              </div>
              <Link to="/register" className={`${s.planCta} ${s.planCtaGreen}`}>Start free trial</Link>
            </div>

            {/* Pro */}
            <div className={`${s.plan} ${s.reveal} ${s.d2}`}>
              <div className={s.planName}>Pro</div>
              <div className={s.planPrice}>$9<span className={s.planPriceCents}>.99</span></div>
              <div className={s.planPeriod}>per month</div>
              <div className={s.planDivider} />
              <div className={s.planFeatures}>
                {['Everything in Plus','Up to 3 family members','Shared account view','Per-transaction privacy','Shared budget goals','Family spending digest','Priority support'].map(f => <div key={f} className={s.planFeature}>{f}</div>)}
              </div>
              <Link to="/register" className={s.planCta}>Start free trial</Link>
            </div>
          </div>
        </section>


        {/* ── Security ── */}
        <section className={s.security} id="security">
          {[
            { icon:'🔒', title:'Read-only access',    body:"Lumen can never move money, make payments, or change anything in your accounts. It can only read." },
            { icon:'🏦', title:'Plaid-powered',       body:"Bank connections are handled by Plaid — the same technology used by Venmo, Robinhood, and thousands of other apps." },
            { icon:'🛡️', title:'256-bit encryption',  body:"Your data is encrypted in transit and at rest. We never sell your financial data. Ever." },
            { icon:'✉️', title:'Your data, your call', body:"Export or delete your data any time. No lock-in. No hostage data. Cancel in 30 seconds." },
          ].map((s2, i) => (
            <div key={s2.title} className={`${s.secItem} ${s.reveal} ${[s.d1,s.d2,s.d3,''][i]}`}>
              <div className={s.secIcon}>{s2.icon}</div>
              <div className={s.secTitle}>{s2.title}</div>
              <p className={s.secBody}>{s2.body}</p>
            </div>
          ))}
        </section>


        {/* ── Final CTA ── */}
        <section className={s.finalCta}>
          <div className={`${s.finalOrbWrap} ${s.reveal}`}>
            <OrbWithRings size={100} mood="happy" />
          </div>
          <h2 className={`${s.finalH} ${s.reveal}`}>
            What's your<br />
            <span>number</span>
            <em>?</em>
          </h2>
          <p className={`${s.finalP} ${s.reveal}`}>Start free in under 5 minutes. No credit card required.</p>
          <div className={`${s.finalActions} ${s.reveal}`}>
            <Link to="/register" className={s.btnPrimary}>Get started free →</Link>
            <a href="#features" className={s.btnGhost}>Learn more</a>
          </div>
          <div className={`${s.finalNote} ${s.reveal}`}>
            🔒 No credit card · Bank-level security · Cancel anytime
          </div>
        </section>


        {/* ── Footer ── */}
        <footer className={s.footer}>
          <div>
            <div className={s.footerBrand}>
              <Orb size={16} />
              <span className={s.footerWordmark}>Lumen</span>
            </div>
            <p className={s.footerTagline}>Your financial picture, clearly. Built on four questions. Answered with one number.</p>
          </div>
          <div>
            <div className={s.footerLinks}>
              <Link to="/terms"      className={s.footerLink}>Terms</Link>
              <Link to="/privacy"    className={s.footerLink}>Privacy</Link>
              <Link to="/data-usage" className={s.footerLink}>Data Usage</Link>
              <a    href="#"         className={s.footerLink}>Support</a>
            </div>
            <div className={s.footerBottom}>
              <span>© 2026 Lumen. All rights reserved.</span>
              <span>Made with intent.</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
