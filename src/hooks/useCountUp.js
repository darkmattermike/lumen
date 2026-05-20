/**
 * useCountUp — animates a number from its previous value to a new value.
 * Used on Dashboard balance, budget totals, etc.
 *
 * @param {number} target   — the number to animate to
 * @param {object} options
 *   duration  {number}  — animation duration ms (default 800)
 *   decimals  {number}  — decimal places (default 0)
 *   prefix    {string}  — e.g. '$'
 *   suffix    {string}  — e.g. '%'
 *   easing    {string}  — 'ease-out' | 'linear' (default 'ease-out')
 *
 * Returns: { display, isAnimating }
 *   display — formatted string ready to render
 *   isAnimating — true while counting
 */
import { useState, useEffect, useRef } from 'react'

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useCountUp(target, {
  duration = 800,
  decimals = 0,
  prefix   = '',
  suffix   = '',
  easing   = 'ease-out',
} = {}) {
  const [current, setCurrent]       = useState(target)
  const [isAnimating, setAnimating] = useState(false)
  const prevTarget  = useRef(target)
  const rafRef      = useRef(null)
  const startTime   = useRef(null)
  const startVal    = useRef(target)

  useEffect(() => {
    if (target === prevTarget.current) return
    const from = prevTarget.current
    prevTarget.current = target

    // Don't animate huge initial loads — only animate changes
    if (from === 0 && current === 0) {
      setCurrent(target)
      return
    }

    cancelAnimationFrame(rafRef.current)
    startVal.current = from
    startTime.current = null
    setAnimating(true)

    function tick(ts) {
      if (!startTime.current) startTime.current = ts
      const elapsed = ts - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing === 'ease-out' ? easeOut(progress) : progress
      const value = from + (target - from) * easedProgress
      setCurrent(value)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCurrent(target)
        setAnimating(false)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, easing])

  const formatted = `${prefix}${current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`

  return { display: formatted, isAnimating, value: current }
}

/**
 * AnimatedNumber — drop-in component wrapping useCountUp
 * <AnimatedNumber value={4218.50} prefix="$" decimals={2} className={styles.amount} style={{color:'var(--safe)'}} />
 */
export function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 800, className, style }) {
  const { display, isAnimating } = useCountUp(Number(value) || 0, { prefix, suffix, decimals, duration })
  return (
    <span className={className} style={style} data-animating={isAnimating || undefined}>
      {display}
    </span>
  )
}
