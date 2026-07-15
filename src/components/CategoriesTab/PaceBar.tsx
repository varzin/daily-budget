import type { CategoryPace } from '../../lib/math'
import styles from './CategoriesTab.module.css'

/**
 * Tiny spending-pace bar for an ongoing fixed expense. The coloured fill is how
 * much of the budget is spent; the tick marks how far into the pay period we
 * are. Fill past the tick = spending ahead of the calendar (orange → red).
 */
export default function PaceBar({ pace }: { pace: CategoryPace }) {
  const spentPct = Math.round(pace.spentRatio * 100)
  const elapsedPct = Math.round(pace.elapsed * 100)
  return (
    <span
      className={styles.pace}
      role="img"
      aria-label={`Spending pace: ${spentPct}% of budget spent, ${elapsedPct}% of the pay period elapsed`}
      title={`${spentPct}% spent · ${elapsedPct}% of the period elapsed`}
    >
      <span
        className={styles.paceFill}
        data-state={pace.state}
        style={{ width: `${pace.spentRatio * 100}%` }}
      />
      <span className={styles.paceMarker} style={{ left: `${pace.elapsed * 100}%` }} />
    </span>
  )
}
