/**
 * "Reset spent on finalize" is a synced preference (CLAUDE.md "Finalize month")
 * like buffer/currency/monthlyIncome: it defaults to true, coerces safely
 * (only an explicit boolean is honoured), persists, and merges per-field by
 * `meta.resetSpentOnFinalize` so the habit follows the user across devices.
 */
import { describe, expect, it } from 'vitest'
import {
  coerceResetSpentOnFinalize,
  normalizeBudgetState,
  DEFAULT_BUFFER,
  DEFAULT_RESET_SPENT_ON_FINALIZE,
} from '../../src/store/persist'
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
    resetSpentOnFinalize: DEFAULT_RESET_SPENT_ON_FINALIZE,
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: {
      bank: null, incomeDay: null, buffer: null, currency: null,
      monthlyIncome: null, resetSpentOnFinalize: null,
    },
    ...p,
  }
}

const meta = (p: Partial<BudgetState['meta']> = {}): BudgetState['meta'] => ({
  bank: null, incomeDay: null, buffer: null, currency: null,
  monthlyIncome: null, resetSpentOnFinalize: null, ...p,
})

describe('coerceResetSpentOnFinalize', () => {
  it('defaults to true for absent / legacy / malformed values', () => {
    expect(coerceResetSpentOnFinalize(undefined)).toBe(true)
    expect(coerceResetSpentOnFinalize(null)).toBe(true)
    expect(coerceResetSpentOnFinalize('nope')).toBe(true)
    expect(coerceResetSpentOnFinalize(1)).toBe(true)
  })

  it('honours an explicit boolean either way', () => {
    expect(coerceResetSpentOnFinalize(false)).toBe(false)
    expect(coerceResetSpentOnFinalize(true)).toBe(true)
  })
})

describe('normalizeBudgetState', () => {
  it('defaults the preference to true for legacy documents', () => {
    const s = normalizeBudgetState({ bank: 100 })
    expect(s.resetSpentOnFinalize).toBe(true)
    expect(s.meta.resetSpentOnFinalize).toBeNull()
  })

  it('keeps an explicit false and its meta timestamp', () => {
    const s = normalizeBudgetState({
      resetSpentOnFinalize: false,
      meta: meta({ resetSpentOnFinalize: T0 }),
    })
    expect(s.resetSpentOnFinalize).toBe(false)
    expect(s.meta.resetSpentOnFinalize).toBe(T0)
  })
})

describe('resetSpentOnFinalize scalar merge', () => {
  it('takes the side whose preference was edited more recently', () => {
    const local = doc({ resetSpentOnFinalize: true, meta: meta({ resetSpentOnFinalize: T0 }) })
    const remote = doc({ resetSpentOnFinalize: false, meta: meta({ resetSpentOnFinalize: T2 }) })
    expect(mergeBudget(local, remote).merged.resetSpentOnFinalize).toBe(false)
  })

  it('merges the preference independently of bank', () => {
    const local = doc({ bank: 999, resetSpentOnFinalize: false, meta: meta({ bank: T2, resetSpentOnFinalize: T0 }) })
    const remote = doc({ bank: 1, resetSpentOnFinalize: true, meta: meta({ bank: T0, resetSpentOnFinalize: T2 }) })
    const { merged } = mergeBudget(local, remote)
    expect(merged.bank).toBe(999)
    expect(merged.resetSpentOnFinalize).toBe(true)
  })
})
