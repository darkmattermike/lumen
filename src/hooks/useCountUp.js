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

  useEffect(() => {
    if (target === prevTarget.current) return
    const from = prevTarget.current
    prevTarget.current = target

    if (from === 0 && current === 0) { setCurrent(target); return }

    cancelAnimationFrame(rafRef.current)
    startTime.current = null
    setAnimating(true)

    function tick(ts) {
      if (!startTime.current) startTime.current = ts
      const elapsed  = ts - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased    = easing === 'ease-out' ? easeOut(progress) : progress
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

// Re-export AnimatedNumber for convenience (component lives in components/AnimatedNumber/)
export { default as AnimatedNumber } from '../components/AnimatedNumber/AnimatedNumber'
