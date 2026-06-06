/**
 * Phase B — "Updated <when>" freshness hint (CLAUDE.md "«Актуально на <дата>»").
 * The minimal model self-corrects only when the user re-enters their balance, so
 * between entries the forecast quietly ages. We surface the age of the last
 * balance entry (`meta.bank`) as an always-on, muted line, escalating gently
 * once it's stale.
 */

/** Whole calendar days between an ISO timestamp and `now` (clamped at >= 0). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 0
  const msPerDay = 24 * 60 * 60 * 1000
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(0, Math.round((startNow - startThen) / msPerDay))
}

/** Days after which the last balance entry reads as stale (gentle nudge). */
export const STALE_AFTER_DAYS = 5

export function isStale(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false
  return daysSince(iso, now) >= STALE_AFTER_DAYS
}

/**
 * Human "Updated …" label for the last balance entry, or null when we have no
 * timestamp (pre-rework data, or nothing entered yet) and should show nothing.
 */
export function formatUpdatedAgo(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null
  const d = daysSince(iso, now)
  if (d <= 0) return 'Updated today'
  if (d === 1) return 'Updated yesterday'
  return `Updated ${d} days ago`
}
