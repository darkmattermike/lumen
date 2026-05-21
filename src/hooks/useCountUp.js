import { useState, useEffect, useRef } from 'react'

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useCountUp(target, {
  duration  = 800,
  decimals  = 0,
  prefix    = '',
  suffix    = '',
  easing    = 'ease-out',
  countFromZero = true,   // always count up from 0 on first mount
} = {}) {
  const [current, setCurrent]       = useState(countFromZero ? 0 : target)
  const [isAnimating, setAnimating] = useState(countFromZero)
  const prevTarget  = useRef(countFromZero ? 0 : target)
  const rafRef      = useRef(null)
  const startTime   = useRef(null)
  const mounted     = useRef(false)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target

    // Skip if no change and not the initial mount animation
    if (from === target && mounted.current) return
    mounted.current = true

    cancelAnimationFrame(rafRef.current)
    startTime.current = null
    setAnimating(true)

    const easeFn = easing === 'expo' ? easeOutExpo : easeOut

    function tick(ts) {
      if (!startTime.current) startTime.current = ts
      const elapsed  = ts - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased    = easeFn(progress)
      setCurrent(from + (target - from) * eased)
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

// Re-export AnimatedNumber for convenience
export { default as AnimatedNumber } from '../components/AnimatedNumber/AnimatedNumber'
