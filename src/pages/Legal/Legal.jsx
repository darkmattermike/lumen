import { useNavigate } from 'react-router-dom'
import styles from './Legal.module.css'

const EFFECTIVE_DATE = 'May 21, 2026'
const APP_NAME       = 'Lumen'
const CONTACT_EMAIL  = 'support@lumenfinance.com'
const DOMAIN         = 'lumenfinance.com'

function DocWrap({ children }) {
  const navigate = useNavigate()
  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className={styles.doc}>{children}</div>
    </div>
  )
}

export function TermsOfService() {
  return (
    <DocWrap>
      <h1>{APP_NAME} Terms of Service</h1>
      <p className={styles.effective}>Effective: {EFFECTIVE_DATE} · Domain: {DOMAIN}</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By creating an account or using {APP_NAME} ("the Service," "we," "us"), you agree to these Terms of Service in full. If you do not agree, do not create an account or use the Service. These terms constitute a legally binding agreement between you and the operators of {APP_NAME}.</p>
      </section>

      <section>
        <h2>2. What {APP_NAME} Is</h2>
        <p>{APP_NAME} is a personal finance management application that aggregates financial account data, analyzes spending patterns, and generates AI-powered insights to help you understand and manage your personal finances. {APP_NAME} is a financial <em>tool</em> — it does not provide investment advice, tax advice, or legal advice. Nothing in {APP_NAME} should be construed as a recommendation to buy, sell, or hold any financial instrument.</p>
      </section>

      <section>
        <h2>3. Eligibility</h2>
        <p>You must be at least 18 years of age to use {APP_NAME}. By using the Service, you represent that you meet this requirement. {APP_NAME} is intended for personal use only. Commercial resale or redistribution of the Service or its outputs is prohibited.</p>
      </section>

      <section>
        <h2>4. Account and Security</h2>
        <p>You are responsible for maintaining the security of your account credentials. You must use a strong, unique password. You agree to notify us immediately if you become aware of unauthorized access to your account. We are not liable for losses resulting from unauthorized access that occurs due to your failure to protect your credentials.</p>
        <p>We implement industry-standard security measures including encrypted data storage, bcrypt password hashing, short-lived access tokens, and rate limiting on authentication endpoints. However, no system is perfectly secure.</p>
      </section>

      <section>
        <h2>5. Financial Account Connections</h2>
        <p>When you connect a bank or financial account, you authorize {APP_NAME} to retrieve read-only transaction history, balances, and account metadata via Plaid, Inc. or manual CSV import. <strong>{APP_NAME} does not store your bank login credentials</strong>. We do not initiate transactions, move funds, or modify your financial accounts in any way. Your bank connection credentials are managed by Plaid and governed by Plaid's own terms and privacy policy.</p>
      </section>

      <section>
        <h2>6. Gmail Integration</h2>
        <p>If you choose to connect Gmail, you grant {APP_NAME} read-only access to your inbox for the limited purpose of identifying financial emails — receipts, subscription confirmations, billing notices, and similar financial communications. We do not read personal correspondence, access sent mail or drafts, or store full email bodies beyond what is necessary for financial matching. Gmail access can be revoked at any time from Settings or your Google Account permissions page.</p>
      </section>

      <section>
        <h2>7. AI Features and Limitations</h2>
        <p>AI-powered features including auto-categorization, Lumen Chat, insights, and scenario modeling are provided for informational purposes only. AI outputs are probabilistic and may be inaccurate, incomplete, or reflect errors in your underlying data. You should verify all AI-generated analysis independently before making financial decisions. {APP_NAME} expressly disclaims liability for decisions made based on AI outputs.</p>
      </section>

      <section>
        <h2>8. Acceptable Use</h2>
        <p>You agree not to: attempt to access another user's data; reverse engineer, decompile, or disassemble the Service; use automated tools to scrape or abuse the platform; violate any applicable law or regulation; or use the Service to process financial data belonging to others without their explicit authorization.</p>
      </section>

      <section>
        <h2>9. Service Availability and Changes</h2>
        <p>{APP_NAME} is provided "as is" and "as available." We do not guarantee uninterrupted access. We may modify, suspend, or discontinue features with reasonable notice where practicable. We will make reasonable efforts to notify you of material changes that affect your use of the Service.</p>
      </section>

      <section>
        <h2>10. Limitation of Liability</h2>
        <p>To the maximum extent permitted by applicable law, {APP_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to financial losses, lost profits, or data loss, arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages. Our total liability to you for any claims arising from use of the Service shall not exceed the amount you paid for the Service in the twelve months preceding the claim.</p>
      </section>

      <section>
        <h2>11. Indemnification</h2>
        <p>You agree to indemnify and hold harmless {APP_NAME} and its operators from any claims, damages, or expenses (including reasonable attorney fees) arising from your violation of these Terms or your use of the Service in a manner not authorized by these Terms.</p>
      </section>

      <section>
        <h2>12. Termination</h2>
        <p>You may delete your account at any time from Settings. Upon deletion, your data will be permanently removed from our systems within 30 days. Export your data before deleting if you want a local copy. We reserve the right to suspend or terminate accounts that violate these Terms, with or without prior notice depending on severity.</p>
      </section>

      <section>
        <h2>13. Governing Law</h2>
        <p>These Terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the American Arbitration Association's consumer rules, except that either party may seek injunctive relief in a court of competent jurisdiction.</p>
      </section>

      <section>
        <h2>14. Changes to Terms</h2>
        <p>We may update these Terms from time to time. We will notify you of material changes via email or in-app notice at least 14 days before they take effect. Continued use of the Service after changes constitutes your acceptance of the revised Terms.</p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>For questions about these Terms, contact us at <strong>{CONTACT_EMAIL}</strong>.</p>
      </section>
    </DocWrap>
  )
}

export function PrivacyPolicy() {
  return (
    <DocWrap>
      <h1>{APP_NAME} Privacy Policy</h1>
      <p className={styles.effective}>Effective: {EFFECTIVE_DATE} · Domain: {DOMAIN}</p>

      <section>
        <h2>Our Commitment</h2>
        <p>{APP_NAME} is built on a simple principle: your financial data exists to help <em>you</em>, not to be monetized. We do not sell your data. We do not use it for advertising. We do not share it with third parties except as specifically required to operate the Service and as described in this policy.</p>
      </section>

      <section>
        <h2>1. What We Collect</h2>
        <p><strong>Account information:</strong> Your name, email address, and a bcrypt-hashed version of your password. We never store your plain-text password.</p>
        <p><strong>Financial data:</strong> Transaction history, account balances, account names and types — sourced from your Plaid-connected accounts, CSV imports you upload, or data you enter manually.</p>
        <p><strong>Budget and planning data:</strong> Budget categories, caps, goals, recurring items, rules, and plans you create within {APP_NAME}.</p>
        <p><strong>Gmail-derived data:</strong> If you connect Gmail, we store extracted financial information from financial emails: merchant names, amounts, dates, subscription details, and email subjects. We do not store full email bodies or non-financial email content.</p>
        <p><strong>Device and session data:</strong> Access tokens, session metadata, and IP addresses associated with login events — used for security and to support "log out all devices" functionality. We do not track your browsing activity outside of {APP_NAME}.</p>
        <p><strong>Push notification tokens:</strong> If you enable notifications, we store a browser push subscription token to deliver alerts you've opted into.</p>
      </section>

      <section>
        <h2>2. How We Use Your Data</h2>
        <p>We use your data exclusively to provide {APP_NAME}'s features:</p>
        <ul>
          <li>Displaying your financial accounts, transactions, and summaries</li>
          <li>Generating budget tracking, forecasts, and cash flow projections</li>
          <li>Powering AI features — insights, categorization, chat, scenario modeling</li>
          <li>Sending alerts and notifications you've opted into</li>
          <li>Detecting anomalies and patterns in your spending to surface proactive alerts</li>
          <li>Matching Gmail-sourced financial data to your transactions</li>
        </ul>
        <p>We do not use your financial data for profiling, benchmarking against other users, building advertising audiences, or any purpose other than providing the Service to you.</p>
      </section>

      <section>
        <h2>3. Third-Party Services We Use</h2>
        <p><strong>Plaid, Inc.:</strong> Bank account connection infrastructure. When you connect a financial account, Plaid's own privacy policy governs the connection process. Plaid does not give us your banking credentials — they provide us with a secure access token that we use to retrieve read-only data.</p>
        <p><strong>Anthropic (Claude AI):</strong> When AI features are used, anonymized financial context is sent to Anthropic's API. This includes transaction descriptions, amounts, categories, and aggregate data — but never your name, email address, or account numbers. See our Data Usage Policy for specifics. If you use your own Anthropic API key (BYOK), your usage is governed by your agreement with Anthropic.</p>
        <p><strong>Google (Gmail API):</strong> If you connect Gmail, we use Google's OAuth 2.0 to obtain limited, read-only inbox access. Google's privacy policy governs your relationship with Google. We do not store your Gmail credentials.</p>
        <p><strong>Infrastructure:</strong> We use Railway (backend hosting), Neon (PostgreSQL database), and Vercel (frontend hosting). All infrastructure is located in the United States. Data is encrypted at rest and in transit.</p>
      </section>

      <section>
        <h2>4. Data Security</h2>
        <p>We implement the following security measures:</p>
        <ul>
          <li>All data encrypted in transit via TLS 1.2+</li>
          <li>Passwords hashed with bcrypt (cost factor 12)</li>
          <li>Short-lived JWT access tokens (15 minutes) with rotating refresh tokens</li>
          <li>API keys encrypted at rest using AES-256</li>
          <li>Rate limiting and brute-force lockout on authentication endpoints</li>
          <li>No storage of bank credentials or OAuth passwords</li>
        </ul>
        <p>Despite these measures, no system is completely secure. We encourage you to use a strong, unique password and to enable session monitoring in Settings.</p>
      </section>

      <section>
        <h2>5. Your Rights and Controls</h2>
        <p><strong>Access:</strong> You can view all your data within the app at any time.</p>
        <p><strong>Export:</strong> Download a complete copy of your data (transactions, accounts, budgets, goals) as JSON or CSV from Settings → Export Data.</p>
        <p><strong>Correction:</strong> Edit your account information and financial data directly within the app.</p>
        <p><strong>Deletion:</strong> Delete your account from Settings → Account → Delete Account. All data is permanently purged within 30 days.</p>
        <p><strong>Disconnect services:</strong> Disconnect Plaid accounts, Gmail, or push notifications independently at any time from Settings.</p>
        <p><strong>Session management:</strong> View and revoke individual active sessions from Settings → Security.</p>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <p>We retain your data for as long as your account is active. If your account is inactive for 24 consecutive months, we will notify you by email before deleting your data. Upon account deletion, data is removed within 30 days. Backup copies are purged within 90 days of deletion.</p>
      </section>

      <section>
        <h2>7. Children's Privacy</h2>
        <p>{APP_NAME} is not directed to individuals under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that a minor has created an account, we will delete it promptly.</p>
      </section>

      <section>
        <h2>8. Changes to This Policy</h2>
        <p>We will notify you of material changes to this Privacy Policy at least 14 days before they take effect via email and in-app notice. The updated policy will always be available at {DOMAIN}/privacy.</p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>For privacy-related questions or requests, contact us at <strong>{CONTACT_EMAIL}</strong>. We respond to all privacy inquiries within 5 business days.</p>
      </section>
    </DocWrap>
  )
}

export function DataUsagePolicy() {
  return (
    <DocWrap>
      <h1>{APP_NAME} Data Usage Policy</h1>
      <p className={styles.effective}>Effective: {EFFECTIVE_DATE} · Domain: {DOMAIN}</p>

      <section>
        <h2>Purpose of This Policy</h2>
        <p>This policy explains precisely how {APP_NAME} processes your financial data to power its features. It is meant to be specific — not a legal document full of vague language, but a plain explanation of exactly what happens to your data inside {APP_NAME}.</p>
      </section>

      <section>
        <h2>Transaction Data</h2>
        <p>Transactions synced via Plaid or imported via CSV are stored in your account database and used to:</p>
        <ul>
          <li>Display your spending history and trends</li>
          <li>Calculate budget category usage against your caps</li>
          <li>Power AI-generated insights and Lumen Chat responses</li>
          <li>Detect spending anomalies and patterns</li>
          <li>Build 30/60/90-day cash flow projections</li>
          <li>Match against Gmail receipts to enrich merchant names and categories</li>
        </ul>
        <p>Transactions are never shared with other users. Transaction data sent to Anthropic for AI processing is anonymized — we strip your name, email, and account numbers before sending.</p>
      </section>

      <section>
        <h2>AI Processing — What Gets Sent to Anthropic</h2>
        <p>When you use AI features (insights, Lumen Chat, auto-categorization, scenario modeling), {APP_NAME} constructs a context snapshot of your financial data and sends it to Anthropic's Claude API. This snapshot includes:</p>
        <ul>
          <li>Transaction names, amounts, dates, and categories (last 60–90 days)</li>
          <li>Account balances and types (no account numbers)</li>
          <li>Budget category names, caps, and current spending</li>
          <li>Active recurring items (bills, subscriptions, income)</li>
          <li>Active goals and plans</li>
          <li>Gmail-derived subscription and order summaries (if connected)</li>
        </ul>
        <p><strong>What is never sent to Anthropic:</strong> Your name, email address, full account numbers, bank credentials, Social Security number, or any document content beyond financial figures.</p>
        <p>Anthropic processes this data to generate a response and does not retain it for model training under our API agreement. If you use your own Anthropic API key (BYOK), your data usage is also governed by your personal Anthropic agreement.</p>
      </section>

      <section>
        <h2>Gmail Data Processing</h2>
        <p>When Gmail is connected, {APP_NAME} runs scheduled scans (approximately hourly) to identify financial emails. Here is exactly what we do:</p>
        <ul>
          <li><strong>Subscription detection:</strong> We identify emails from known subscription senders (Netflix, Spotify, Adobe, etc.) and extract service name, amount, and renewal date. We store: service name, amount, billing cycle, next renewal date, sender email, and email subject.</li>
          <li><strong>Order detection:</strong> We identify order confirmation emails and extract merchant name, amount, and order date. We store: merchant, amount, date, and email subject.</li>
          <li><strong>Transaction enrichment:</strong> We search for receipts matching recent Plaid transactions to improve merchant name accuracy.</li>
          <li><strong>Bill suggestions:</strong> We identify "payment due" emails from senders not already in your recurring items and suggest adding them.</li>
        </ul>
        <p><strong>What we do not do with Gmail:</strong> We do not read personal emails, access your contacts, read sent mail or drafts, store full email bodies, or share any email-derived data with third parties.</p>
      </section>

      <section>
        <h2>Document Uploads</h2>
        <p>If you upload documents (bank statements, pay stubs, loan documents), they are processed in memory to extract financial data (transactions, income figures, payment amounts). Document files are not stored permanently — only the extracted structured data is retained. Upload processing uses Anthropic's API under the same privacy constraints described above.</p>
      </section>

      <section>
        <h2>Push Notifications</h2>
        <p>If you enable push notifications, we store a Web Push subscription object (endpoint URL and encryption keys generated by your browser). We use this only to send you {APP_NAME} alerts. We do not use push tokens for tracking or share them with third parties. You can revoke push permission at any time.</p>
      </section>

      <section>
        <h2>Aggregation and Benchmarking</h2>
        <p>{APP_NAME} does not aggregate individual user data into shared datasets, industry benchmarks, or anonymized pools at this time. Your data is used only for your own account. If this policy changes, we will provide at least 30 days' notice and require your opt-in consent before any aggregated processing begins.</p>
      </section>

      <section>
        <h2>Data Retention by Type</h2>
        <ul>
          <li><strong>Transactions:</strong> Retained until account deletion</li>
          <li><strong>Gmail tokens:</strong> Deleted immediately upon disconnecting Gmail from Settings</li>
          <li><strong>Gmail-derived data (subscriptions, orders):</strong> Retained until account deletion or manual deletion within the Gmail Inbox page</li>
          <li><strong>Push notification tokens:</strong> Deleted when you revoke permission or delete your account</li>
          <li><strong>Uploaded documents:</strong> Not stored — only extracted data is retained</li>
          <li><strong>Session tokens:</strong> Expire after 30 days or earlier upon logout</li>
          <li><strong>Login audit logs:</strong> Retained for 90 days for security purposes</li>
        </ul>
      </section>

      <section>
        <h2>Your Control</h2>
        <p>You decide what data enters {APP_NAME}. Every data source — Plaid accounts, Gmail, push notifications, AI features — can be enabled or disabled independently. Disconnecting a source stops future data collection from that source immediately. The Export feature in Settings gives you a complete download of all stored data at any time in portable JSON and CSV formats.</p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>If you have specific questions about how your data is processed that aren't answered here, email us at <strong>{CONTACT_EMAIL}</strong>. We believe you have a right to understand exactly what happens to your financial data.</p>
      </section>
    </DocWrap>
  )
}
