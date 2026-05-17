import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import Spotlight from '../../components/Spotlight/Spotlight'
import { ACCOUNTS } from '../../data/mock'
import styles from './Accounts.module.css'

function AccountCard({ acct }) {
  return (
    <div className={`${styles.acctCard} ${acct.isDebt ? styles.debt : ''}`}>
      <div className={styles.acctTop}>
        <div className={styles.acctIcon}>{acct.icon}</div>
        <div className={styles.acctInfo}>
          <div className={styles.acctName}>{acct.name}</div>
          <div className={styles.acctType}>{acct.type}</div>
        </div>
        <div
          className={styles.acctStatus}
          style={{ background: acct.statusColor, color: acct.statusTextColor }}
        >
          {acct.status}
        </div>
      </div>
      <div className={styles.balLabel}>
        {acct.isDebt ? 'Remaining Balance' : 'Available Balance'}
      </div>
      <div className={styles.balance} style={{ color: acct.balanceColor }}>
        {acct.balance}
      </div>
      <div className={styles.meta}>
        {acct.meta.map(m => (
          <div key={m.label} className={styles.metaItem}>
            <div className={styles.metaLabel}>{m.label}</div>
            <div className={styles.metaVal} style={m.valueColor ? { color: m.valueColor } : {}}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Accounts() {
  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>⬦ Where I Am</div>
          <div className={styles.title}>Accounts</div>
          <div className={styles.sub}>
            Every connected account in one place. Lumen tracks balances, trends, and flags
            anything unusual — rate changes, unexpected charges, minimum balance risks.
          </div>
        </div>
        <div className={styles.netWorth}>
          <div className={styles.nwLabel}>Total Net Worth</div>
          <div className={styles.nwAmt}>$18,659</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <span className="delta pos">+$1,329 this month</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.groupLabel}>💳 Checking & Savings</div>
        {ACCOUNTS.assets.map(a => <AccountCard key={a.id} acct={a} />)}

        <div className={styles.groupLabel}>💳 Credit Cards & Loans</div>
        {ACCOUNTS.liabilities.map(a => <AccountCard key={a.id} acct={a} />)}

        <div className={styles.spotlightWrap}>
          <Spotlight
            tag="Lumen on Your Accounts"
            dotSize={32}
            footer={null}
          >
            Your net worth is up <strong>$1,329</strong> this month — right in line with your
            paycheck landing and no major unexpected charges. Marcus Savings interest hit{' '}
            <strong>$31.65</strong>. Your student loan balance has dropped{' '}
            <span className="b">$212</span> from the auto-payment. Net worth trajectory:{' '}
            <em>steady climb.</em>
          </Spotlight>
        </div>
      </div>
    </ScreenWrap>
  )
}
