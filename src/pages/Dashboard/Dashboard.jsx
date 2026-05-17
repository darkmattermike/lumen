import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import LumenDot from '../../components/LumenDot/LumenDot'
import PressureGauge from '../../components/PressureGauge/PressureGauge'
import BillRow from '../../components/BillRow/BillRow'
import WhatIfTheater from '../../components/WhatIfTheater/WhatIfTheater'
import { UPCOMING_BILLS } from '../../data/mock'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  return (
    <ScreenWrap>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.dotCol}>
          <LumenDot size={56} rings />
          <div className={styles.dotMeta}>
            <div className={styles.dotLabel}>Lumen</div>
            <div className={styles.dotStatus}>
              <span className="pdot" />
              <span>Online</span>
            </div>
          </div>
        </div>

        <div className={styles.balanceCol}>
          <div className={styles.pre}>◈ FREE TO SPEND · MAY 17, 2025 · LIVE</div>
          <div className={styles.amount}>$4,218</div>
          <div className={styles.prose}>
            After every bill <strong>already promised</strong> over the next{' '}
            <span className="b">9 days</span>, you'll have <strong>$4,028</strong> clear.
            Bills are <span className="w">spaced out</span> — no cluster weeks. Paycheck
            lands <strong>May 24</strong>. The pressure gauge reads SAFE.
          </div>
        </div>

        <div className={styles.rightCol}>
          <PressureGauge label="SAFE" sub="Good until May 24" dashOffset={70} />
          <div className={styles.statStack}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>After Bills</span>
              <span className={styles.statVal} style={{ color: 'var(--safe)' }}>$4,028</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Next Paycheck</span>
              <span className={styles.statVal} style={{ color: 'rgba(108,140,255,0.8)' }}>May 24</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Four Principle Zones ── */}
      <div className={styles.zones}>
        <div className={`${styles.zone} ${styles.now}`}>
          <div className={styles.zoneTag}>✦ Where I Am</div>
          <div className={styles.zoneVal}>$4,218</div>
          <div className={styles.zoneProse}>
            Checking live. <strong>$4,028</strong> after all committed bills this cycle.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>Checking</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>$4,218</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>After bills</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>$4,028</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Savings</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>$8,441</span></div>
          </div>
        </div>

        <div className={`${styles.zone} ${styles.was}`}>
          <div className={styles.zoneTag}>↩ What Happened</div>
          <div className={styles.zoneVal}>$1,511</div>
          <div className={styles.zoneProse}>
            Spent last 7 days. Rent hit hardest at <strong>$1,350</strong>. Electric ran{' '}
            <span className="w">$40 higher</span> — AC season.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>🏠 Rent</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−$1,350</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>💰 Paycheck</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+$2,840</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>Net change</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+$1,328</span></div>
          </div>
        </div>

        <div className={`${styles.zone} ${styles.nxt}`}>
          <div className={styles.zoneTag}>→ What's Coming</div>
          <div className={styles.zoneVal}>$189.99</div>
          <div className={styles.zoneProse}>
            Bills <span className="w">spaced out</span>. No cluster weeks. Paycheck{' '}
            <strong>May 24</strong> resets the board.
          </div>
          <div className={styles.zoneRows}>
            <div className={styles.zoneRow}><span className={styles.zrn}>⚡ Electric · May 17</span><span className={styles.zrv} style={{ color: 'var(--debt)' }}>−$94</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn}>📱 AT&T · May 20</span><span className={styles.zrv} style={{ color: 'var(--warn)' }}>−$85</span></div>
            <div className={styles.zoneRow}><span className={styles.zrn} style={{ color: 'rgba(93,202,165,0.7)' }}>💰 Paycheck · May 24</span><span className={styles.zrv} style={{ color: 'var(--safe)' }}>+$2,840</span></div>
          </div>
        </div>

        <div className={`${styles.zone} ${styles.ask}`}>
          <div className={styles.zoneTag}>✦ What If</div>
          <div className={styles.zoneVal}>Live</div>
          <div className={styles.zoneProse}>
            Any scenario — dinner, trip, subscription, purchase.{' '}
            <strong>Lumen runs it</strong> against your real numbers.
          </div>
          <div className={styles.quickChips}>
            <span className="wi-chip" style={{ fontSize: 11, padding: '6px 12px' }}>🍽️ Dinner</span>
            <span className="wi-chip" style={{ fontSize: 11, padding: '6px 12px' }}>✈️ Trip</span>
          </div>
        </div>
      </div>

      {/* ── Body: Theater + Aside ── */}
      <div className={styles.body}>
        <WhatIfTheater />

        <div className={styles.aside}>
          <div className={styles.asideLabel}>Bill Schedule</div>
          {UPCOMING_BILLS.map(b => (
            <BillRow key={b.id} {...b} />
          ))}

          <div className={styles.asideLabel} style={{ marginTop: 16 }}>Lumen Noticed</div>

          <div className={styles.insightBlue}>
            <div className={styles.insightTag} style={{ color: 'rgba(108,140,255,0.7)' }}>
              <span className="pdot" style={{ background: 'rgba(108,140,255,0.7)' }} />
              Noticed
            </div>
            <div className={styles.insightText}>
              Groceries <strong style={{ color: 'rgba(108,140,255,0.85)' }}>down 12%</strong> from last month.
              Rent on time <strong style={{ color: 'rgba(108,140,255,0.85)' }}>12 months straight.</strong>
            </div>
          </div>

          <div className={styles.insightGreen}>
            <div className={styles.insightTag} style={{ color: 'rgba(93,202,165,0.6)' }}>✓ On Track</div>
            <div className={styles.insightText}>
              No subscriptions raised prices this month.{' '}
              <strong style={{ color: 'rgba(93,202,165,0.8)' }}>Unusual</strong> — worth noting.
            </div>
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
