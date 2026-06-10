/**
 * Pace indicator (CLAUDE.md "Future ideas" #2): the planned daily rate derived
 * from the optional monthly income vs the actual allowable daily rate.
 * Deliberately stateless — no snapshots/anchors, so a corrected balance or a
 * mid-day re-entry instantly re-derives the result.
 */
import { describe, expect, it } from 'vitest'
import { computeCycleLength, computePace, plannedObligatoryTotal } from '../../src/lib/math'
import type { Category } from '../../src/types'

describe('computeCycleLength', () => {
  it('measures the previous → next income day span mid-cycle', () => {
    // Income on the 26th; on June 10 the cycle is May 26 → June 26 = 31 days.
    expect(computeCycleLength(26, new Date(2026, 5, 10))).toBe(31)
  })

  it('uses the current month start when today is on/after the income day', () => {
    // On June 26 the cycle is June 26 → July 26 = 30 days.
    expect(computeCycleLength(26, new Date(2026, 5, 26))).toBe(30)
  })

  it('clamps day 31 to short months like computeDaysLeft does', () => {
    // Income on the 31st; on Feb 10 2026 the cycle is Jan 31 → Feb 28 = 28 days.
    expect(computeCycleLength(31, new Date(2026, 1, 10))).toBe(28)
  })

  it('crosses the year boundary', () => {
    // On Jan 10 2026 the cycle is Dec 26 2025 → Jan 26 2026 = 31 days.
    expect(computeCycleLength(26, new Date(2026, 0, 10))).toBe(31)
  })

  it('returns 0 for an invalid income day', () => {
    expect(computeCycleLength(0)).toBe(0)
    expect(computeCycleLength(32)).toBe(0)
  })
})

describe('plannedObligatoryTotal', () => {
  const cat = (p: Partial<Category>): Category => ({
    id: 'c', name: 'x', budget: 0, spent: 0, done: false, ...p,
  })

  it('sums full budgets regardless of spent/done — a paid bill is still planned', () => {
    const cats = [
      cat({ id: 'a', budget: 100, spent: 100, done: true }),
      cat({ id: 'b', budget: 50, spent: 20 }),
    ]
    expect(plannedObligatoryTotal(cats)).toBe(150)
  })

  it('excludes tombstoned categories and junk budgets', () => {
    const cats = [
      cat({ id: 'a', budget: 100, deletedAt: '2026-06-01T00:00:00.000Z' }),
      cat({ id: 'b', budget: NaN }),
      cat({ id: 'c', budget: -5 }),
    ]
    expect(plannedObligatoryTotal(cats)).toBe(0)
  })
})

describe('computePace', () => {
  // Baseline cycle: income 3000, fixed budgets 900, cushion 100, 30-day cycle
  // → planned rate (3000 − 900 − 100) / 30 = 66.67/day. Savings pool of 200 is
  // carried capital and stays out of the plan.
  const base = {
    plannedOblig: 900,
    savingsPool: 200,
    buffer: 100,
    monthlyIncome: 3000,
    cycleDays: 30,
  }

  it('is null when the income is not set (indicator off)', () => {
    expect(computePace({ ...base, monthlyIncome: 0, bank: 1000, oblig: 0, daysLeft: 10 })).toBeNull()
  })

  it('is null when the cycle maths is degenerate', () => {
    expect(computePace({ ...base, bank: 1000, oblig: 0, daysLeft: 0 })).toBeNull()
    expect(computePace({ ...base, cycleDays: 0, bank: 1000, oblig: 0, daysLeft: 10 })).toBeNull()
  })

  it('reads 0 ahead when spending exactly on plan', () => {
    // Day 16 of 30 (15 left): paid 450 of fixed (450 remaining), spent 15 days
    // of the planned rate (1000) on top → bank 3200 − 450 − 1000 = 1750.
    const pace = computePace({ ...base, bank: 1750, oblig: 450, daysLeft: 15 })
    expect(pace).not.toBeNull()
    expect(pace!.perDayPlan).toBeCloseTo(2000 / 30, 10)
    expect(pace!.perDayActual).toBeCloseTo(2000 / 30, 10)
    expect(pace!.ahead).toBe(0)
  })

  it('reports the saved amount when underspending', () => {
    // Same day, but 100 less spent: the whole underspend shows up as "ahead".
    const pace = computePace({ ...base, bank: 1850, oblig: 450, daysLeft: 15 })
    expect(pace!.ahead).toBe(100)
  })

  it('reports a negative figure when overspending', () => {
    const pace = computePace({ ...base, bank: 1600, oblig: 450, daysLeft: 15 })
    expect(pace!.ahead).toBe(-150)
  })

  it('counts carry-over from the previous cycle as being ahead', () => {
    // Cycle start (30 days left), nothing paid yet, but 150 left over from
    // last month on top of income + the savings pool.
    const pace = computePace({ ...base, bank: 3000 + 200 + 150, oblig: 900, daysLeft: 30 })
    expect(pace!.ahead).toBe(150)
  })
})
