/**
 * useCountUp
 * Animates a number from its previous value to a new target value.
 * Usage: const display = useCountUp(value, { duration: 800, prefix: '$' })
 */
import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, { duration = 700, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(target)
  const prevRef  = useRef(target)
  const frameRef = useRef(null)

  useEffect(() => {
    if (target === prevRef.current) return
    const from  = prevRef.current
    const to    = target
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(to)
        prevRef.current = to
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  const formatted = Number(display).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return formatted
}

/**
 * useAnimatedProgress
 * Returns a value that animates from 0 to target on mount, or between values on change.
 */
export function useAnimatedProgress(target, { duration = 600, delay = 0 } = {}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let timeout
    const start = () => {
      const startTime = performance.now()
      let frame
      function tick(now) {
        const elapsed  = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased    = 1 - Math.pow(1 - progress, 3)
        setValue(eased * target)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    }
    if (delay) {
      timeout = setTimeout(start, delay)
      return () => clearTimeout(timeout)
    }
    return start()
  }, [target, duration, delay])

  return value
}
