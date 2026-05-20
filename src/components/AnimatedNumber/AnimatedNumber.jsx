import { useCountUp } from '../../hooks/useCountUp'

/**
 * AnimatedNumber — animates a number from its previous value to a new value.
 * <AnimatedNumber value={4218.50} prefix="$" decimals={2} className={styles.amount} style={{color:'var(--safe)'}} />
 */
export default function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 800, className, style }) {
  const { display, isAnimating } = useCountUp(Number(value) || 0, { prefix, suffix, decimals, duration })
  return (
    <span className={className} style={style} data-animating={isAnimating || undefined}>
      {display}
    </span>
  )
}
