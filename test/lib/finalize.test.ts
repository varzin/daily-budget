/**
 * computeFinalize (CLAUDE.md "Finalize month"): records this month's savings as
 * current balance − prior savings pool. Fixed expenses are intentionally NOT
 * subtracted, so the running balance equals the real bank balance and "saved
 * this month" is the genuine month-over-month change.
 */
import { describe, expect, it } from 'vitest'
import { computeFinalize, computeBalances, finalizeTargetIndex } from '../../src/lib/math'
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

describe('re-finalizing a month that already has a row', () => {
  // A row with its own id, so duplicates of one month can be told apart.
  const r = (id: string, month: string, saved: number, p: Partial<SavingsRow> = {}): SavingsRow => ({
    id,
    month,
    saved,
    currency: 'EUR',
    ...p,
  })

  it('leaves the overwritten row out of the prior pool', () => {
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', 500)]
    const { prevPool, saved } = computeFinalize(3500, savings, '2026-05')
    expect(prevPool).toBe(1000)
    expect(saved).toBe(2500)
  })

  it('lands the running total on the bank balance after the overwrite', () => {
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', 500)]
    const { saved } = computeFinalize(3500, savings, '2026-05')
    const after = savings.map(x => (x.id === 'b' ? { ...x, saved } : x))
    expect(computeBalances(after).at(-1)).toBe(3500)
  })

  it('is idempotent: finalizing twice records the same figure', () => {
    const first = computeFinalize(3500, [r('a', '2026-04', 1000)], '2026-05').saved
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', first)]
    expect(computeFinalize(3500, savings, '2026-05').saved).toBe(first)
  })

  it('counts every row when this month has none yet', () => {
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', 500)]
    expect(computeFinalize(3500, savings, '2026-06')).toEqual({ prevPool: 1500, saved: 2000 })
  })

  it('without a month keeps the plain "balance − all rows" behaviour', () => {
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', 500)]
    expect(computeFinalize(3500, savings).prevPool).toBe(1500)
  })

  it('excludes only the overwritten row when a month is duplicated', () => {
    // Two live May rows: finalize overwrites the first; the second stays in the ledger.
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', 500), r('c', '2026-05', 200)]
    const { prevPool, saved } = computeFinalize(3500, savings, '2026-05')
    expect(prevPool).toBe(1200)
    const after = savings.map(x => (x.id === 'b' ? { ...x, saved } : x))
    expect(computeBalances(after).at(-1)).toBe(3500)
  })

  it('never targets a tombstoned row', () => {
    const savings = [r('a', '2026-04', 1000), r('b', '2026-05', 500, { deletedAt: 'D' })]
    expect(finalizeTargetIndex(savings, '2026-05')).toBe(-1)
    expect(computeFinalize(3500, savings, '2026-05')).toEqual({ prevPool: 1000, saved: 2500 })
  })

  it('finalizeTargetIndex picks the first live row of the month', () => {
    const savings = [r('x', '2026-05', 1, { deletedAt: 'D' }), r('b', '2026-05', 2), r('c', '2026-05', 3)]
    expect(finalizeTargetIndex(savings, '2026-05')).toBe(1)
  })
})
