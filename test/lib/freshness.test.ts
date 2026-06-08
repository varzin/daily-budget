/**
 * Phase B — freshness of the last balance entry. Pure date math: "today",
 * "yesterday", "N days ago", a null label when no timestamp exists, and the
 * staleness threshold.
 */
import { describe, expect, it } from 'vitest'
import {
  daysSince,
  formatUpdatedAgo,
  isStale,
  STALE_AFTER_DAYS,
} from '../../src/lib/freshness'

// Fixed "now": noon so same-day earlier timestamps still count as today.
const NOW = new Date('2026-06-06T12:00:00.000Z')
const at = (iso: string) => iso

describe('daysSince', () => {
  it('counts whole calendar days, not 24h windows', () => {
    expect(daysSince(at('2026-06-06T01:00:00.000Z'), NOW)).toBe(0) // same day
    expect(daysSince(at('2026-06-05T23:00:00.000Z'), NOW)).toBe(1) // yesterday
    expect(daysSince(at('2026-06-01T00:00:00.000Z'), NOW)).toBe(5)
  })

  it('clamps future timestamps to 0 and ignores junk', () => {
    expect(daysSince(at('2026-06-10T00:00:00.000Z'), NOW)).toBe(0)
    expect(daysSince('not-a-date', NOW)).toBe(0)
  })
})

describe('formatUpdatedAgo', () => {
  it('returns null when there is no timestamp', () => {
    expect(formatUpdatedAgo(null, NOW)).toBeNull()
    expect(formatUpdatedAgo(undefined, NOW)).toBeNull()
  })

  it('renders today / yesterday / N days ago', () => {
    expect(formatUpdatedAgo('2026-06-06T08:00:00.000Z', NOW)).toBe('Updated today')
    expect(formatUpdatedAgo('2026-06-05T08:00:00.000Z', NOW)).toBe('Updated yesterday')
    expect(formatUpdatedAgo('2026-06-03T08:00:00.000Z', NOW)).toBe('Updated 3 days ago')
  })
})

describe('isStale', () => {
  it('is false without a timestamp and below the threshold', () => {
    expect(isStale(null, NOW)).toBe(false)
    expect(isStale('2026-06-04T08:00:00.000Z', NOW)).toBe(false) // 2 days
  })

  it('flips on at exactly the threshold', () => {
    const iso = '2026-06-01T08:00:00.000Z' // 5 days before NOW
    expect(daysSince(iso, NOW)).toBe(STALE_AFTER_DAYS)
    expect(isStale(iso, NOW)).toBe(true)
  })
})
