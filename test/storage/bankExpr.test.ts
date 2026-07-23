/**
 * The Current balance field accepts a formula ("1200+30" — a split across
 * accounts). The point of a formula field is that the formula stays editable,
 * so `bankExpr` is persisted next to the number rather than living in component
 * state. It is NOT an independent scalar: it carries no timestamp of its own and
 * travels with `bank` under `meta.bank`, so a merge can never pair one device's
 * number with another device's formula.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useBudgetStore } from '../../src/store/budgetStore'
import {
  defaultState,
  normalizeBudgetState,
  selectBudgetState,
  DEFAULT_BUFFER,
} from '../../src/store/persist'
import { mergeBudget } from '../../src/sync/merge'
import { DEFAULT_CURRENCY } from '../../src/lib/currency'
import type { BudgetState } from '../../src/types'

const T0 = '2026-07-01T00:00:00.000Z'
const T2 = '2026-07-03T00:00:00.000Z'

const meta = (p: Partial<BudgetState['meta']> = {}): BudgetState['meta'] => ({
  bank: null,
  incomeDay: null,
  buffer: null,
  currency: null,
  monthlyIncome: null,
  resetSpentOnFinalize: null,
  ...p,
})

function doc(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 0,
    incomeDay: 26,
    buffer: DEFAULT_BUFFER,
    currency: DEFAULT_CURRENCY,
    monthlyIncome: 0,
    resetSpentOnFinalize: true,
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: meta(),
    ...p,
  }
}

describe('bankExpr persistence', () => {
  it('survives normalization so the formula outlives a reload', () => {
    const s = normalizeBudgetState({ bank: 1230, bankExpr: '1200+30' })
    expect(s.bank).toBe(1230)
    expect(s.bankExpr).toBe('1200+30')
  })

  it('is absent when the balance was typed as a plain number', () => {
    expect(normalizeBudgetState({ bank: 1230 }).bankExpr).toBeUndefined()
    expect(normalizeBudgetState({ bank: 1230, bankExpr: '' }).bankExpr).toBeUndefined()
  })

  it('drops untrusted non-string values from an import or remote pull', () => {
    const s = normalizeBudgetState({ bank: 10, bankExpr: 42 as unknown as string })
    expect(s.bankExpr).toBeUndefined()
  })

  it('is included in the synced/persisted slice', () => {
    const slice = selectBudgetState(doc({ bank: 1230, bankExpr: '1200+30' }))
    expect(slice.bankExpr).toBe('1200+30')
    // Omitted entirely (not `undefined`) when there is no formula.
    expect('bankExpr' in selectBudgetState(doc({ bank: 1230 }))).toBe(false)
  })
})

describe('setBank', () => {
  beforeEach(() => {
    useBudgetStore.setState({ ...defaultState, categories: [], savings: [] })
  })

  it('stores the formula alongside the evaluated number', () => {
    useBudgetStore.getState().setBank(1230, '1200+30')
    expect(useBudgetStore.getState().bank).toBe(1230)
    expect(useBudgetStore.getState().bankExpr).toBe('1200+30')
  })

  it('drops the formula when the balance is retyped as a plain number', () => {
    useBudgetStore.getState().setBank(1230, '1200+30')
    useBudgetStore.getState().setBank(900)
    expect(useBudgetStore.getState().bank).toBe(900)
    expect(useBudgetStore.getState().bankExpr).toBeUndefined()
  })

  it('stamps meta.bank — the formula rides that one timestamp', () => {
    useBudgetStore.getState().setBank(1230, '1200+30')
    expect(useBudgetStore.getState().meta.bank).toBeTruthy()
  })
})

describe('bankExpr merge', () => {
  it('follows the winning side of bank rather than merging on its own', () => {
    const local = doc({ bank: 1230, bankExpr: '1200+30', meta: meta({ bank: T0 }) })
    const remote = doc({ bank: 500, bankExpr: '400+100', meta: meta({ bank: T2 }) })
    const { merged } = mergeBudget(local, remote)
    expect(merged.bank).toBe(500)
    expect(merged.bankExpr).toBe('400+100')
  })

  it('clears a stale formula when the winner had none — never a mismatched pair', () => {
    const local = doc({ bank: 1230, bankExpr: '1200+30', meta: meta({ bank: T0 }) })
    const remote = doc({ bank: 900, meta: meta({ bank: T2 }) })
    const { merged } = mergeBudget(local, remote)
    expect(merged.bank).toBe(900)
    expect(merged.bankExpr).toBeUndefined()
  })

  it('keeps the local formula when local wins bank', () => {
    const local = doc({ bank: 1230, bankExpr: '1200+30', meta: meta({ bank: T2 }) })
    const remote = doc({ bank: 500, bankExpr: '400+100', meta: meta({ bank: T0 }) })
    const { merged } = mergeBudget(local, remote)
    expect(merged.bank).toBe(1230)
    expect(merged.bankExpr).toBe('1200+30')
  })
})
