import { useState, useRef } from 'react'
import { api } from '../../data/api'
import styles from './DocumentUpload.module.css'

const DOC_TYPES = [
  { value: 'auto',             label: 'Auto-detect',       icon: '🔍', desc: 'Let Lumen figure it out' },
  { value: 'bank_statement',   label: 'Bank Statement',    icon: '🏦', desc: 'Import transactions from PDF' },
  { value: 'pay_stub',         label: 'Pay Stub',          icon: '💼', desc: 'Update income model' },
  { value: 'loan',             label: 'Loan / Lease',      icon: '📋', desc: 'Auto-create recurring payment' },
]

function ResultView({ result, docType }) {
  if (!result) return null

  if (docType === 'bank_statement' || result.doc_type === 'bank_statement') {
    return (
      <div className={styles.result}>
        <div className={styles.resultIcon}>✅</div>
        <div className={styles.resultTitle}>Statement imported</div>
        {result.institution && <div className={styles.resultSub}>{result.institution}</div>}
        {result.period && <div className={styles.resultSub}>{result.period}</div>}
        <div className={styles.resultStats}>
          <div className={styles.resultStat}>
            <span className={styles.rsVal}>{result.tx_found}</span>
            <span className={styles.rsLabel}>Found</span>
          </div>
          <div className={styles.resultStat}>
            <span className={styles.rsVal} style={{ color: 'var(--safe)' }}>{result.tx_imported}</span>
            <span className={styles.rsLabel}>Imported</span>
          </div>
        </div>
        {result.tx_imported > 0 && (
          <p className={styles.resultNote}>Transactions imported and categorized. Check the Transactions page.</p>
        )}
      </div>
    )
  }

  if (docType === 'pay_stub' || result.doc_type === 'pay_stub') {
    return (
      <div className={styles.result}>
        <div className={styles.resultIcon}>✅</div>
        <div className={styles.resultTitle}>Pay stub parsed</div>
        {result.employer && <div className={styles.resultSub}>{result.employer}</div>}
        <div className={styles.resultStats}>
          {result.gross_pay && (
            <div className={styles.resultStat}>
              <span className={styles.rsVal}>${Number(result.gross_pay).toLocaleString()}</span>
              <span className={styles.rsLabel}>Gross</span>
            </div>
          )}
          {result.net_pay && (
            <div className={styles.resultStat}>
              <span className={styles.rsVal} style={{ color: 'var(--safe)' }}>${Number(result.net_pay).toLocaleString()}</span>
              <span className={styles.rsLabel}>Net</span>
            </div>
          )}
          {result.federal_tax && (
            <div className={styles.resultStat}>
              <span className={styles.rsVal} style={{ color: 'var(--debt)' }}>${Number(result.federal_tax).toLocaleString()}</span>
              <span className={styles.rsLabel}>Fed tax</span>
            </div>
          )}
        </div>
        {result.recurring_updated && (
          <p className={styles.resultNote}>
            Updated "{result.recurring_updated.name}" from ${Number(result.recurring_updated.old_amount).toLocaleString()} → ${Number(result.recurring_updated.new_amount).toLocaleString()}
          </p>
        )}
      </div>
    )
  }

  if (docType === 'loan' || result.doc_type === 'loan_doc') {
    return (
      <div className={styles.result}>
        <div className={styles.resultIcon}>✅</div>
        <div className={styles.resultTitle}>Loan document parsed</div>
        {result.lender && <div className={styles.resultSub}>{result.lender} · {result.loan_type}</div>}
        <div className={styles.resultStats}>
          {result.monthly_payment && (
            <div className={styles.resultStat}>
              <span className={styles.rsVal}>${Number(result.monthly_payment).toLocaleString()}</span>
              <span className={styles.rsLabel}>Monthly</span>
            </div>
          )}
          {result.interest_rate && (
            <div className={styles.resultStat}>
              <span className={styles.rsVal}>{result.interest_rate}%</span>
              <span className={styles.rsLabel}>Rate</span>
            </div>
          )}
          {result.current_balance && (
            <div className={styles.resultStat}>
              <span className={styles.rsVal}>${Number(result.current_balance).toLocaleString()}</span>
              <span className={styles.rsLabel}>Balance</span>
            </div>
          )}
        </div>
        {result.recurring_created && (
          <p className={styles.resultNote}>
            Created recurring bill: "{result.recurring_created.name}" — ${Number(result.recurring_created.amount).toLocaleString()}/mo on day {result.recurring_created.day_of_month}
          </p>
        )}
      </div>
    )
  }

  // Generic fallback
  return (
    <div className={styles.result}>
      <div className={styles.resultIcon}>✅</div>
      <div className={styles.resultTitle}>Document processed</div>
      {result.summary && <p className={styles.resultSummary}>{result.summary}</p>}
      {result.key_figures?.length > 0 && (
        <div className={styles.resultFigures}>
          {result.key_figures.map((f, i) => (
            <div key={i} className={styles.resultFigure}>
              <span className={styles.rfLabel}>{f.label}</span>
              <span className={styles.rfVal}>{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentUpload({ onClose, onSuccess }) {
  const [docType, setDocType]   = useState('auto')
  const [file, setFile]         = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [result, setResult]     = useState(null)
  const inputRef                = useRef(null)

  function handleFile(f) {
    if (!f) return
    const ok = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    if (!ok) { setError('Only PDF files are supported'); return }
    setFile(f)
    setError(null)
    setResult(null)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function submit() {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)

      let r
      switch (docType) {
        case 'bank_statement': r = await api.uploadBankStatement(fd); break
        case 'pay_stub':       r = await api.uploadPayStub(fd);       break
        case 'loan':           r = await api.uploadLoanDoc(fd);       break
        default:               r = await api.uploadDocument(fd);      break
      }

      setResult(r)
      onSuccess?.(r)
    } catch (err) {
      setError(err.message || 'Upload failed')
    }
    setLoading(false)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Upload Document</div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {!result ? (
          <>
            {/* Doc type selector */}
            <div className={styles.typeGrid}>
              {DOC_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`${styles.typeBtn} ${docType === t.value ? styles.typeBtnOn : ''}`}
                  onClick={() => setDocType(t.value)}
                >
                  <span className={styles.typeIcon}>{t.icon}</span>
                  <span className={styles.typeLabel}>{t.label}</span>
                  <span className={styles.typeDesc}>{t.desc}</span>
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              className={`${styles.dropZone} ${dragging ? styles.dropZoneDrag : ''} ${file ? styles.dropZoneHasFile : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={e => handleFile(e.target.files[0])} className={styles.fileInput} />
              {file ? (
                <>
                  <div className={styles.fileIcon}>📄</div>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <div className={styles.dropIcon}>⬆️</div>
                  <div className={styles.dropLabel}>Drop a PDF here or click to browse</div>
                  <div className={styles.dropSub}>Max 20MB · PDF only</div>
                </>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                className={styles.submitBtn}
                onClick={submit}
                disabled={!file || loading}
              >
                {loading ? 'Processing…' : 'Upload & Parse'}
              </button>
            </div>
          </>
        ) : (
          <>
            <ResultView result={result} docType={docType} />
            <div className={styles.modalFooter}>
              <button className={styles.submitBtn} onClick={onClose}>Done</button>
              <button className={styles.cancelBtn} onClick={() => { setResult(null); setFile(null) }}>
                Upload another
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
