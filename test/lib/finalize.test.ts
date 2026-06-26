/**
 * computeFinalize (CLAUDE.md "Finalize month"): records this month's savings as
 * current balance − prior savings pool. Fixed expenses are intentionally NOT
 * subtracted, so the running balance equals the real bank balance and "saved
 * this month" is the genuine month-over-month change.
 */
import { describe, expect, it } from 'vitest'
import { computeFinalize, computeBalances } from '../../src/lib/math'
import type { SavingsRow } from '../../src/types'

const row = (month: string, saved: number): SavingsRow => ({ id: month, month, saved })

describe('computeFinalize', () => {
  it('records balance minus the prior savings pool, ignoring fixed expenses', () => {
    const savings = [row('2026-04', 1000), row('2026-05', 500)]
    const { prevPool, saved } = computeFinalize(3500, savings)
    expect(prevPool).toBe(1500)
    expect(saved).toBe(2000)
  })

  it('is unaffected by deleted (tombstoned) savings rows', () => {
    const savings = [row('2026-04', 1000), { ...row('2026-05', 500), deletedAt: '2026-05-02' }]
    expect(computeFinalize(3500, savings).prevPool).toBe(1000)
    expect(computeFinalize(3500, savings).saved).toBe(2500)
  })

  it('the running balance after finalize equals the real bank balance', () => {
    const savings = [row('2026-04', 1000), row('2026-05', 500)]
    const { saved } = computeFinalize(3500, savings)
    const balances = computeBalances([...savings, row('2026-06', saved)])
    expect(balances[balances.length - 1]).toBe(3500)
  })

  it('"saved this month" equals income minus spending across the cycle', () => {
    // Last finalize left the bank (= prior pool) at 2000; this cycle 1800 income
    // arrived and 1300 was spent, so the bank is now 2500.
    const prior = [row('2026-05', 2000)]
    const { saved } = computeFinalize(2500, prior)
    expect(saved).toBe(500) // 1800 income − 1300 spent
  })
})
