import styles from './Legal.module.css'

const EFFECTIVE_DATE = 'January 1, 2025'
const APP_NAME = 'Lumen'

export function TermsOfService() {
  return (
    <div className={styles.wrap}>
      <div className={styles.doc}>
        <h1>{APP_NAME} Terms of Service</h1>
        <p className={styles.effective}>Effective: {EFFECTIVE_DATE}</p>

        <section>
          <h2>1. Acceptance</h2>
          <p>By creating an account or using {APP_NAME}, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2>2. What {APP_NAME} Does</h2>
          <p>{APP_NAME} is a personal finance management application. It connects to financial accounts via third-party aggregators (including Plaid), reads email data you authorize, and uses AI to provide financial insights. {APP_NAME} is a tool to help you understand your own finances — it does not provide investment, tax, or legal advice.</p>
        </section>

        <section>
          <h2>3. Account Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your login credentials. You must be at least 18 years of age to use {APP_NAME}. You agree to provide accurate information and to keep it current.</p>
        </section>

        <section>
          <h2>4. Financial Data</h2>
          <p>When you connect a bank account, you authorize {APP_NAME} to retrieve read-only transaction and balance data on your behalf via Plaid or manual import. {APP_NAME} does not store your bank login credentials. We do not initiate transactions, transfer funds, or modify your accounts in any way.</p>
        </section>

        <section>
          <h2>5. AI Features</h2>
          <p>AI-powered features (insights, categorization, chat, scenario modeling) are provided for informational purposes only. AI outputs may be inaccurate or incomplete. Do not make significant financial decisions based solely on AI-generated content. Always consult a qualified financial professional for major decisions.</p>
        </section>

        <section>
          <h2>6. Gmail Integration</h2>
          <p>If you connect Gmail, {APP_NAME} requests read-only access to your inbox to identify financial emails (receipts, bills, subscription notices). We do not read personal correspondence, store email content beyond what is necessary for financial analysis, or share your email data with third parties.</p>
        </section>

        <section>
          <h2>7. Acceptable Use</h2>
          <p>You may not use {APP_NAME} to violate any law, attempt to access other users' data, reverse engineer the service, or use automated means to scrape or abuse the platform.</p>
        </section>

        <section>
          <h2>8. Service Availability</h2>
          <p>{APP_NAME} is provided "as is" and "as available." We do not guarantee uninterrupted access. We may modify, suspend, or discontinue features with reasonable notice.</p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, {APP_NAME} and its operators shall not be liable for indirect, incidental, or consequential damages arising from your use of the service, including financial losses resulting from reliance on {APP_NAME}'s analysis.</p>
        </section>

        <section>
          <h2>10. Changes to Terms</h2>
          <p>We may update these terms from time to time. We will notify you of material changes via email or in-app notice. Continued use after changes constitutes acceptance of the revised terms.</p>
        </section>

        <section>
          <h2>11. Termination</h2>
          <p>You may delete your account at any time. Upon deletion, your data will be removed from our systems within 30 days. We reserve the right to suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>For questions about these terms, contact us through the support channel in the app.</p>
        </section>
      </div>
    </div>
  )
}

export function PrivacyPolicy() {
  return (
    <div className={styles.wrap}>
      <div className={styles.doc}>
        <h1>{APP_NAME} Privacy Policy</h1>
        <p className={styles.effective}>Effective: {EFFECTIVE_DATE}</p>

        <section>
          <h2>1. What We Collect</h2>
          <p><strong>Account data:</strong> Email address, name, and hashed password.</p>
          <p><strong>Financial data:</strong> Transaction history, account balances, and budget data — sourced from Plaid connections, CSV imports, or manual entry.</p>
          <p><strong>Email data:</strong> If you connect Gmail, we read financial emails to extract transaction context. We do not store full email bodies beyond what is necessary for financial analysis.</p>
          <p><strong>Usage data:</strong> Basic logs of feature use to improve the product. We do not sell or share usage data.</p>
        </section>

        <section>
          <h2>2. How We Use Your Data</h2>
          <p>We use your data exclusively to provide {APP_NAME}'s features to you. Specifically: displaying your financial picture, generating insights and forecasts, enabling AI analysis (using your Anthropic API key or ours), and sending alerts you've opted into.</p>
          <p>We do not sell your data. We do not use your financial data for advertising. We do not share your personal data with third parties except as described in Section 3.</p>
        </section>

        <section>
          <h2>3. Third-Party Services</h2>
          <p><strong>Plaid:</strong> Bank connection infrastructure. Plaid's own privacy policy governs your data during connection. Plaid does not store your credentials on our servers.</p>
          <p><strong>Anthropic Claude:</strong> AI analysis. If you use our Anthropic API key, financial context is sent to Anthropic's API to generate insights. If you use your own BYOK key, your usage is governed by your agreement with Anthropic.</p>
          <p><strong>Infrastructure:</strong> We use Railway (backend hosting), Neon (database), and Vercel (frontend). Your data is stored in encrypted databases in the United States.</p>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>All data is encrypted in transit (TLS) and at rest. API keys are stored encrypted. We use bcrypt for password hashing. We do not store bank credentials.</p>
        </section>

        <section>
          <h2>5. Your Rights</h2>
          <p>You may export all your data at any time using the export feature in Settings. You may delete your account at any time, which will permanently remove all your data within 30 days. You may disconnect Plaid or Gmail at any time.</p>
        </section>

        <section>
          <h2>6. Push Notifications</h2>
          <p>If you enable push notifications, we store a device subscription token to send you alerts. You may disable notifications at any time in your browser settings or by revoking permission in the app.</p>
        </section>

        <section>
          <h2>7. Children's Privacy</h2>
          <p>{APP_NAME} is not intended for users under 18. We do not knowingly collect data from minors.</p>
        </section>

        <section>
          <h2>8. Changes</h2>
          <p>We will notify you of material changes to this policy. Continued use constitutes acceptance.</p>
        </section>
      </div>
    </div>
  )
}

export function DataUsagePolicy() {
  return (
    <div className={styles.wrap}>
      <div className={styles.doc}>
        <h1>{APP_NAME} Data Usage Policy</h1>
        <p className={styles.effective}>Effective: {EFFECTIVE_DATE}</p>

        <section>
          <h2>Purpose of This Policy</h2>
          <p>This policy explains specifically how {APP_NAME} processes your financial data to provide its features. It supplements the Privacy Policy.</p>
        </section>

        <section>
          <h2>Transaction Data</h2>
          <p>Transactions synced via Plaid or imported via CSV are stored in your account and used to: calculate spending summaries, power budget tracking, generate AI insights, detect patterns and anomalies, and build cash flow forecasts. Transactions are never shared with other users or third parties outside of AI processing (Anthropic) on your behalf.</p>
        </section>

        <section>
          <h2>AI Processing</h2>
          <p>When AI features are used (auto-categorization, insights, Lumen Chat, scenario modeling), anonymized financial context is sent to Anthropic's API. This includes transaction descriptions, amounts, categories, and aggregate spending summaries. We do not send your name, email, or account numbers to Anthropic.</p>
          <p>If you use BYOK (Bring Your Own Key), your usage is subject to your personal agreement with Anthropic. If you use our key, usage is subject to our Anthropic agreement.</p>
        </section>

        <section>
          <h2>Gmail Data</h2>
          <p>When Gmail is connected, {APP_NAME} reads emails from financial senders to extract: merchant names, amounts, and dates for transaction context. Email subjects and relevant snippets are stored for matching purposes. Full email bodies are processed in memory and not stored permanently.</p>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>Your data is retained for as long as your account is active. Upon account deletion, all data including transactions, accounts, goals, and email tokens is permanently deleted within 30 days. Export your data before deleting if you want a local copy.</p>
        </section>

        <section>
          <h2>Aggregation</h2>
          <p>{APP_NAME} does not aggregate individual user data into shared datasets or benchmarks at this time. If this changes, we will update this policy and notify you.</p>
        </section>

        <section>
          <h2>Your Control</h2>
          <p>You control what data enters {APP_NAME}: which accounts to connect, whether to enable Gmail, whether to use AI features. Every data source can be disconnected independently. The export feature gives you a complete copy of all stored data at any time.</p>
        </section>
      </div>
    </div>
  )
}
