/**
 * Monthly income (pace indicator, CLAUDE.md "Future ideas" #2) is a synced
 * scalar like buffer/currency: it persists, coerces safely (0 = "not set",
 * which hides the indicator), and merges per-field by `meta.monthlyIncome`.
 */
import { describe, expect, it } from 'vitest'
import { coerceMonthlyIncome, normalizeBudgetState, DEFAULT_BUFFER } from '../../src/store/persist'
import { mergeBudget } from '../../src/sync/merge'
import { DEFAULT_CURRENCY } from '../../src/lib/currency'
import type { BudgetState } from '../../src/types'

const T0 = '2026-06-01T00:00:00.000Z'
const T2 = '2026-06-03T00:00:00.000Z'

function doc(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 0,
    incomeDay: 26,
    buffer: DEFAULT_BUFFER,
    currency: DEFAULT_CURRENCY,
    monthlyIncome: 0,
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: { bank: null, incomeDay: null, buffer: null, currency: null, monthlyIncome: null },
    ...p,
  }
}

const meta = (p: Partial<BudgetState['meta']> = {}): BudgetState['meta'] => ({
  bank: null, incomeDay: null, buffer: null, currency: null, monthlyIncome: null, ...p,
})

describe('coerceMonthlyIncome', () => {
  it('collapses absent values to 0 (not set) — there is no other default', () => {
    expect(coerceMonthlyIncome(undefined)).toBe(0)
    expect(coerceMonthlyIncome(null)).toBe(0)
    expect(coerceMonthlyIncome('')).toBe(0)
  })

  it('clamps negatives to 0 and accepts numeric strings', () => {
    expect(coerceMonthlyIncome(-100)).toBe(0)
    expect(coerceMonthlyIncome('3000')).toBe(3000)
    expect(coerceMonthlyIncome(2500.5)).toBe(2500.5)
  })

  it('collapses non-numeric junk to 0', () => {
    expect(coerceMonthlyIncome('abc')).toBe(0)
    expect(coerceMonthlyIncome(Infinity)).toBe(0)
  })
})

describe('normalizeBudgetState', () => {
  it('defaults the income to 0 for legacy documents without the field', () => {
    const s = normalizeBudgetState({ bank: 100 })
    expect(s.monthlyIncome).toBe(0)
    expect(s.meta.monthlyIncome).toBeNull()
  })

  it('keeps an explicit income and its meta timestamp', () => {
    const s = normalizeBudgetState({ monthlyIncome: 3000, meta: meta({ monthlyIncome: T0 }) })
    expect(s.monthlyIncome).toBe(3000)
    expect(s.meta.monthlyIncome).toBe(T0)
  })
})

describe('monthlyIncome scalar merge', () => {
  it('takes the side whose income was edited more recently', () => {
    const local = doc({ monthlyIncome: 3000, meta: meta({ monthlyIncome: T0 }) })
    const remote = doc({ monthlyIncome: 3500, meta: meta({ monthlyIncome: T2 }) })
    expect(mergeBudget(local, remote).merged.monthlyIncome).toBe(3500)
  })

  it('merges the income independently of bank', () => {
    const local = doc({ bank: 999, monthlyIncome: 3000, meta: meta({ bank: T2, monthlyIncome: T0 }) })
    const remote = doc({ bank: 1, monthlyIncome: 3500, meta: meta({ bank: T0, monthlyIncome: T2 }) })
    const { merged } = mergeBudget(local, remote)
    expect(merged.bank).toBe(999)
    expect(merged.monthlyIncome).toBe(3500)
  })
})
