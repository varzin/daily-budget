/**
 * The cached FX rates are a synced scalar like buffer/currency/monthlyIncome:
 * they persist, coerce safely from untrusted sources, ride their own
 * `meta.rates` timestamp, and merge last-writer-wins independently of the other
 * scalars. The store's setRates action stamps that timestamp.
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
import type { BudgetState, ExchangeRates } from '../../src/types'

const T0 = '2026-07-01T00:00:00.000Z'
const T2 = '2026-07-03T00:00:00.000Z'

const ratesA: ExchangeRates = { base: 'EUR', date: '2026-06-30', values: { usd: 1.05 } }
const ratesB: ExchangeRates = { base: 'EUR', date: '2026-07-03', values: { usd: 1.11 } }

const meta = (p: Partial<BudgetState['meta']> = {}): BudgetState['meta'] => ({
  bank: null,
  incomeDay: null,
  buffer: null,
  currency: null,
  monthlyIncome: null,
  resetSpentOnFinalize: null,
  rates: null,
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
    rates: null,
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: meta(),
    ...p,
  }
}

describe('rates normalization / persistence', () => {
  it('defaults to null for legacy documents without the field', () => {
    const s = normalizeBudgetState({ bank: 100 })
    expect(s.rates).toBeNull()
    expect(s.meta.rates).toBeNull()
  })

  it('keeps a valid cached table and its meta timestamp', () => {
    const s = normalizeBudgetState({ rates: ratesA, meta: meta({ rates: T0 }) })
    expect(s.rates).toEqual(ratesA)
    expect(s.meta.rates).toBe(T0)
  })

  it('is included in the synced/persisted slice', () => {
    expect(selectBudgetState(doc({ rates: ratesA })).rates).toEqual(ratesA)
  })
})

describe('rates scalar merge', () => {
  it('takes the side whose rates were fetched more recently', () => {
    const local = doc({ rates: ratesA, meta: meta({ rates: T0 }) })
    const remote = doc({ rates: ratesB, meta: meta({ rates: T2 }) })
    expect(mergeBudget(local, remote).merged.rates).toEqual(ratesB)
  })

  it('merges rates independently of bank', () => {
    const local = doc({ bank: 999, rates: ratesA, meta: meta({ bank: T2, rates: T0 }) })
    const remote = doc({ bank: 1, rates: ratesB, meta: meta({ bank: T0, rates: T2 }) })
    const { merged } = mergeBudget(local, remote)
    expect(merged.bank).toBe(999)
    expect(merged.rates).toEqual(ratesB)
  })
})

describe('setRates', () => {
  beforeEach(() => {
    useBudgetStore.setState({ ...defaultState, categories: [], savings: [] })
  })

  it('stores the table and stamps meta.rates', () => {
    useBudgetStore.getState().setRates(ratesB)
    expect(useBudgetStore.getState().rates).toEqual(ratesB)
    expect(useBudgetStore.getState().meta.rates).toBeTruthy()
  })
})
