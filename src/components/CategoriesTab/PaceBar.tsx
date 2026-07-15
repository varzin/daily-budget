import type { CategoryPace } from '../../lib/math'
import styles from './CategoriesTab.module.css'

/**
 * Human summary of a pace bar — reused for the row button's aria-label and the
 * bar's hover tooltip, so the two never drift apart.
 */
export function paceSummary(pace: CategoryPace): string {
  const spentPct = Math.round(pace.spentRatio * 100)
  const elapsedPct = Math.round(pace.elapsed * 100)
  return `${spentPct}% spent · ${elapsedPct}% of the pay period elapsed`
}

/**
 * Tiny spending-pace bar for an ongoing fixed expense. The coloured fill is how
 * much of the budget is spent; the tick marks how far into the pay period we
 * are. Fill past the tick = spending ahead of the calendar (orange → red).
 *
 * Decorative (aria-hidden): the same information is announced through the row
 * button's aria-label — an inner role="img" label would be swallowed by the
 * button's own aria-label and never reach a screen reader anyway.
 */
export default function PaceBar({ pace }: { pace: CategoryPace }) {
  return (
    <span className={styles.pace} aria-hidden="true" title={paceSummary(pace)}>
      <span
        className={styles.paceFill}
        data-state={pace.state}
        style={{ width: `${pace.spentRatio * 100}%` }}
      />
      <span className={styles.paceMarker} style={{ left: `${pace.elapsed * 100}%` }} />
    </span>
  )
}
