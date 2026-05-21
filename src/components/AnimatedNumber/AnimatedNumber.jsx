import { useRef, useEffect } from 'react'
import { useCountUp } from '../../hooks/useCountUp'

/**
 * AnimatedNumber — counts from 0 to value on mount, then transitions on change.
 * <AnimatedNumber value={4218.50} prefix="$" decimals={2} className={styles.amount} />
 */
export default function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 900, easing = 'expo', className, style }) {
  const { display, isAnimating } = useCountUp(Number(value) || 0, { prefix, suffix, decimals, duration, easing })
  const spanRef  = useRef(null)
  const prevVal  = useRef(null)

  // Flash num-pop on value change (after first mount)
  useEffect(() => {
    if (prevVal.current !== null && prevVal.current !== value && spanRef.current) {
      spanRef.current.classList.remove('num-pop')
      // Force reflow to restart animation
      void spanRef.current.offsetWidth
      spanRef.current.classList.add('num-pop')
    }
    prevVal.current = value
  }, [value])

  return (
    <span
      ref={spanRef}
      className={className}
      style={style}
      data-animating={isAnimating || undefined}
    >
      {display}
    </span>
  )
}
