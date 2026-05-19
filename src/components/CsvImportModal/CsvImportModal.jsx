/**
 * CsvImportModal
 * Reads a CSV file client-side with Papa.parse (loaded from CDN if not installed),
 * shows a preview, then POSTs to /api/import/csv.
 *
 * Expected CSV columns (flexible column matching):
 *   Date, Name/Description/Merchant, Amount, Category (optional), Account (optional), Note (optional)
 */
import { useState, useRef } from 'react'
import { api } from '../../data/api'
import styles from './CsvImportModal.module.css'

// Load PapaParse dynamically if not available
function getPapa() {
  return new Promise((resolve) => {
    if (window.Papa) return resolve(window.Papa)
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
    s.onload = () => resolve(window.Papa)
    document.head.appendChild(s)
  })
}

const COLUMN_ALIASES = {
  date:     ['date', 'transaction date', 'trans date', 'posted date', 'posting date', 'dt'],
  name:     ['name', 'description', 'merchant', 'payee', 'memo', 'details', 'transaction'],
  amount:   ['amount', 'debit', 'credit', 'transaction amount', 'amt', 'value'],
  category: ['category', 'type', 'cat'],
  account:  ['account', 'account name', 'bank'],
  note:     ['note', 'notes', 'memo', 'comment'],
}

function detectColumn(headers, field) {
  const aliases = COLUMN_ALIASES[field] || [field]
  return headers.find(h => aliases.includes((h || '').toLowerCase().trim())) || null
}

function mapRow(row, colMap) {
  return {
    date:     row[colMap.date]     || '',
    name:     row[colMap.name]     || '',
    amount:   row[colMap.amount]   || '',
    category: row[colMap.category] || '',
    account:  row[colMap.account]  || '',
    note:     row[colMap.note]     || '',
  }
}

export default function CsvImportModal({ onClose, onImported }) {
  const [step, setStep]         = useState('upload')   // upload | preview | importing | done
  const [rows, setRows]         = useState([])
  const [colMap, setColMap]     = useState({})
  const [headers, setHeaders]   = useState([])
  const [preview, setPreview]   = useState([])
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [accountId, setAccountId] = useState('')
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    try {
      const Papa = await getPapa()
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const hs = results.meta.fields || []
          setHeaders(hs)
          const map = {
            date:     detectColumn(hs, 'date'),
            name:     detectColumn(hs, 'name'),
            amount:   detectColumn(hs, 'amount'),
            category: detectColumn(hs, 'category'),
            account:  detectColumn(hs, 'account'),
            note:     detectColumn(hs, 'note'),
          }
          setColMap(map)
          setRows(results.data)
          setPreview(results.data.slice(0, 5).map(r => mapRow(r, map)))
          setStep('preview')
        },
        error: (err) => setError(`Parse error: ${err.message}`)
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleImport() {
    setStep('importing')
    setError('')
    try {
      const mapped = rows.map(r => mapRow(r, colMap))
      const res = await api.importCsv({ rows: mapped, account_id: accountId || null })
      setResult(res)
      setStep('done')
      if (onImported) onImported()
    } catch (err) {
      setError(err.message)
      setStep('preview')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Import CSV</h3>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>

        {step === 'upload' && (
          <div className={styles.body}>
            <div className={styles.uploadZone} onClick={() => fileRef.current?.click()}>
              <span style={{ fontSize: 36 }}>📂</span>
              <p>Click to select a CSV file</p>
              <span className={styles.hint}>Supports exports from Chase, BofA, Mint, YNAB, and most banks</span>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
            </div>
            <div className={styles.colGuide}>
              <strong>Expected columns (flexible matching):</strong>
              <ul>
                <li><code>Date</code> — transaction date (YYYY-MM-DD or MM/DD/YYYY)</li>
                <li><code>Name / Description / Merchant</code> — merchant or description</li>
                <li><code>Amount</code> — positive or negative number</li>
                <li><code>Category</code>, <code>Account</code>, <code>Note</code> — optional</li>
              </ul>
            </div>
            {error && <div className={styles.err}>{error}</div>}
          </div>
        )}

        {step === 'preview' && (
          <div className={styles.body}>
            <div className={styles.colMapGrid}>
              {Object.entries(colMap).map(([field, col]) => (
                <div key={field} className={styles.colMapRow}>
                  <span className={styles.colField}>{field}</span>
                  <select value={col || ''} onChange={e => setColMap(m => ({ ...m, [field]: e.target.value || null }))}>
                    <option value="">— skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className={styles.previewSection}>
              <h4>Preview ({rows.length} rows total)</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Date</th><th>Name</th><th>Amount</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td>{r.name}</td>
                        <td style={{ color: parseFloat(r.amount) < 0 ? 'var(--col-debt)' : 'var(--col-safe)' }}>{r.amount}</td>
                        <td>{r.category || <span style={{ color: 'var(--fg-muted)' }}>auto</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && <div className={styles.err}>{error}</div>}

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={() => setStep('upload')}>← Back</button>
              <button className={styles.importBtn} onClick={handleImport}>
                Import {rows.length} transaction{rows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className={styles.body} style={{ textAlign: 'center', padding: '48px 20px' }}>
            <span style={{ fontSize: 36 }}>⏳</span>
            <p style={{ color: 'var(--fg-secondary)', marginTop: 12 }}>Importing and categorizing…</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className={styles.body} style={{ textAlign: 'center', padding: '32px 20px' }}>
            <span style={{ fontSize: 40 }}>✅</span>
            <h4 style={{ marginTop: 12 }}>{result.imported} transaction{result.imported !== 1 ? 's' : ''} imported</h4>
            {result.skipped > 0 && <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{result.skipped} rows skipped (duplicates or invalid)</p>}
            {result.errors?.length > 0 && (
              <details style={{ marginTop: 12, textAlign: 'left', fontSize: 12, color: 'var(--fg-muted)' }}>
                <summary>{result.errors.length} errors</summary>
                <ul>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </details>
            )}
            <button className={styles.importBtn} style={{ marginTop: 20 }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
