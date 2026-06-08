import { useState, useEffect, useRef } from 'react'

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useCountUp(target, {
  duration = 900,
  decimals = 0,
  prefix   = '',
  suffix   = '',
  easing   = 'expo',
} = {}) {
  const [current, setCurrent] = useState(0)
  const rafRef     = useRef(null)
  const startRef   = useRef(null)
  const fromRef    = useRef(0)       // what we're animating FROM
  const targetRef  = useRef(target)  // latest target (for cleanup)

  useEffect(() => {
    // Always animate from current displayed value → new target
    const from   = fromRef.current
    const to     = target
    targetRef.current = to
    fromRef.current   = to  // next animation starts from here

    // Cancel any in-progress animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null

    const easeFn = easing === 'expo' ? easeOutExpo : easeOutCubic

    function tick(ts) {
      if (!startRef.current) startRef.current = ts
      const elapsed  = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased    = easeFn(progress)
      const val      = from + (to - from) * eased
      setCurrent(val)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCurrent(to)
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [target, duration, easing]) // eslint-disable-line

  const formatted = `${prefix}${current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`

  return { display: formatted, isAnimating: rafRef.current !== null, value: current }
}

// Re-export AnimatedNumber for convenience
export { default as AnimatedNumber } from '../components/AnimatedNumber/AnimatedNumber'
