import { useMoney } from '../../lib/useMoney'
import type { Pace } from '../../lib/math'
import styles from './PacePill.module.css'

/**
 * Pace vs plan as a compact pill inside the daily widget (CLAUDE.md "Future
 * ideas" #2): green when there's money to spare against the income-derived
 * plan, red when behind it, neutral within ±1. The amount is how much extra
 * can be spent before the next income day while still landing on plan.
 * Renders nothing when the indicator is off (monthly income not set).
 */
export default function PacePill({ pace }: { pace: Pace | null }) {
  const money = useMoney()
  if (!pace) return null

  const onPlan = Math.abs(pace.ahead) < 1
  const ahead = pace.ahead > 0
  const amount = `${money.symbol}${money.fmt(Math.abs(pace.ahead))}`
  const tone = onPlan ? styles.neutral : ahead ? styles.good : styles.bad
  const title = onPlan
    ? 'On pace with your plan'
    : ahead
      ? `≈ ${amount} ahead of plan — extra you could spend before your next income day and still land on plan`
      : `≈ ${amount} behind plan — spend this much less before your next income day to get back on plan`

  return (
    <span className={`${styles.pill} ${tone}`} title={title}>
      {onPlan ? 'on plan' : `${ahead ? '+' : '−'}${amount}`}
      {!onPlan && <span className={styles.vs}>vs plan</span>}
    </span>
  )
}
