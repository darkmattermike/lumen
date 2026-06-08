import { useState, useEffect, useRef } from 'react'

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

/* Animates a number from its previous displayed value to `target`. */
export function useCountUp(target, { duration = 1100, decimals = 0, prefix = '', suffix = '' } = {}) {
  const [current, setCurrent] = useState(0)
  const raf = useRef(null)
  const from = useRef(0)
  const startTs = useRef(null)

  useEffect(() => {
    const begin = from.current
    const end = Number(target) || 0
    from.current = end
    if (raf.current) cancelAnimationFrame(raf.current)
    startTs.current = null
    const tick = (ts) => {
      if (!startTs.current) startTs.current = ts
      const p = Math.min((ts - startTs.current) / duration, 1)
      setCurrent(begin + (end - begin) * easeOutCubic(p))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else { setCurrent(end); raf.current = null }
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  const display = `${prefix}${current.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  return { display, value: current }
}
