import { useState, useEffect, useRef } from 'react'
import s from './MeniscusLoader.module.css'

/* ──────────────────────────────────────────────────────────────
   Lumen — Meniscus loader (Stillwater · Dark)
   A glass circle that fills with sloshing water as real data
   arrives. progress: 0–100. Omit progress for an indeterminate
   half-full slosh.

   <MeniscusLoader progress={62} label="loading" />
   <PageLoader loadingFlags={[loading1, loading2]} />
   ────────────────────────────────────────────────────────────── */

export function MeniscusLoader({ progress, label = 'loading', size = 56 }) {
  const indeterminate = progress === undefined || progress === null
  // map 0–100 → water top position (98% = nearly empty, -12% = overfull)
  const p = indeterminate ? 50 : Math.max(0, Math.min(100, progress))
  const top = 98 - p * 1.1

  return (
    <div className={s.wrap}>
      <div
        className={`${s.vessel} ${p >= 100 ? s.vesselFull : ''}`}
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(p)}
        aria-label={label}>
        <div className={s.water} style={{ top: `${top}%` }} />
        <div className={s.shine} />
      </div>
      {label && <div className={s.label}>{label}</div>}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   useLoadProgress — turn an array of `loading` booleans (one per
   useApi call) into a single smooth progress value.

   const { data, loading }          = useApi(api.dashboard)
   const { data: tx, loading: l2 }  = useApi(() => api.transactions('?limit=40'))
   const { progress, done } = useLoadProgress([loading, l2])
   ────────────────────────────────────────────────────────────── */
export function useLoadProgress(loadingFlags) {
  const total = loadingFlags.length
  const finished = loadingFlags.filter(l => !l).length
  const target = total === 0 ? 100 : (finished / total) * 100

  // never let the water drop once it has risen
  const peak = useRef(0)
  if (target > peak.current) peak.current = target

  // floor of 8 so the vessel never reads as broken/empty
  const progress = Math.max(8, peak.current)
  return { progress, done: finished === total }
}

/* ──────────────────────────────────────────────────────────────
   PageLoader — full-page overlay that covers the fetch gap.
   Mounts instantly, becomes visible only if the wait exceeds
   150ms (no flash on fast loads), tops the water off when all
   flags resolve, then fades out and unmounts.

   {showLoader && <PageLoader loadingFlags={[loading, l2, l3]} />}
   — or simpler, let it manage itself:
   <PageLoader loadingFlags={[loading, l2, l3]} />
   ────────────────────────────────────────────────────────────── */
export function PageLoader({ loadingFlags, label = 'loading' }) {
  const { progress, done } = useLoadProgress(loadingFlags)
  const [phase, setPhase] = useState('loading') // loading → finishing → gone

  useEffect(() => {
    if (done && phase === 'loading') {
      setPhase('finishing')
      const t = setTimeout(() => setPhase('gone'), 750) // top off + fade
      return () => clearTimeout(t)
    }
  }, [done, phase])

  if (phase === 'gone') return null

  return (
    <div className={`${s.overlay} ${phase === 'finishing' ? s.overlayOut : ''}`}>
      <MeniscusLoader progress={phase === 'finishing' ? 100 : progress} label={label} size={60} />
    </div>
  )
}

export default MeniscusLoader
