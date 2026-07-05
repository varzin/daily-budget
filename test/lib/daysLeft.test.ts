/**
 * Income-cycle calendar maths. The tricky part is income day 29–31 in shorter
 * months: the income arrives on the month's last day (dates clamp), so "has
 * income come yet" must compare against the clamped day. Before the fix, the
 * last day of a short month read as "income still ahead" and daysLeft
 * collapsed to 1 — the widget offered the whole month's money for one day.
 */
import { describe, expect, it } from 'vitest'
import { computeDaysLeft, computeCycleLength } from '../../src/lib/math'

describe('computeDaysLeft', () => {
  it('counts days to the upcoming income day in the same month', () => {
    // July 6 → income on the 26th: 20 days.
    expect(computeDaysLeft(26, new Date(2026, 6, 6))).toBe(20)
  })

  it('rolls to next month when today is the income day', () => {
    // On July 15 with income on the 15th, the new cycle runs to Aug 15.
    expect(computeDaysLeft(15, new Date(2026, 6, 15))).toBe(31)
  })

  it('rolls to next month when today is past the income day', () => {
    // July 20, income on the 15th → Aug 15 is 26 days out.
    expect(computeDaysLeft(15, new Date(2026, 6, 20))).toBe(26)
  })

  it('treats the clamped last day of a short month as the income day', () => {
    // Income day 31: in April it arrives on the 30th. On Apr 30 the new
    // cycle runs to May 31 — a full 31 days, not 1.
    expect(computeDaysLeft(31, new Date(2026, 3, 30))).toBe(31)
    // Income day 30 in February (non-leap): arrives Feb 28; next is Mar 30.
    expect(computeDaysLeft(30, new Date(2026, 1, 28))).toBe(30)
  })

  it('still counts to the clamped day while it is genuinely ahead', () => {
    // Apr 15, income day 31 → clamped Apr 30 is 15 days out.
    expect(computeDaysLeft(31, new Date(2026, 3, 15))).toBe(15)
  })

  it('returns 0 for an invalid income day', () => {
    expect(computeDaysLeft(0)).toBe(0)
    expect(computeDaysLeft(32)).toBe(0)
  })

  it('stays consistent with computeCycleLength across every day of 2026', () => {
    // Invariants: 1 ≤ daysLeft ≤ cycleDays, and day-over-day it either
    // decrements or resets to the new cycle's full length on the income day.
    for (let incomeDay = 1; incomeDay <= 31; incomeDay++) {
      let prev: number | null = null
      for (
        let t = new Date(2026, 0, 1);
        t < new Date(2027, 0, 1);
        t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)
      ) {
        const dl = computeDaysLeft(incomeDay, t)
        const cyc = computeCycleLength(incomeDay, t)
        expect(dl).toBeGreaterThanOrEqual(1)
        expect(dl).toBeLessThanOrEqual(cyc)
        if (prev !== null && dl !== cyc) expect(dl).toBe(prev - 1)
        prev = dl
      }
    }
  })
})

describe('computeCycleLength — clamped income day', () => {
  it('starts the new cycle on the clamped last day of a short month', () => {
    // Apr 30 with income day 31: the cycle is Apr 30 → May 31 = 31 days.
    expect(computeCycleLength(31, new Date(2026, 3, 30))).toBe(31)
    // Feb 28 (non-leap) with income day 30: Feb 28 → Mar 30 = 30 days.
    expect(computeCycleLength(30, new Date(2026, 1, 28))).toBe(30)
  })
})
