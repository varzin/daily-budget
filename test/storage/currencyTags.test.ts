/**
 * Per-amount currency tags (CLAUDE.md "Валюта у сумм / валюта отображения"):
 * every amount — balance, cushion, income, each category, each savings row —
 * carries its own currency, and the store's `currency` is only the DISPLAY
 * currency. Covers the legacy migration (normalize / import / rehydrate), the
 * setters, that a display switch touches no data, and finalize tagging.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useBudgetStore } from '../../src/store/budgetStore'
import {
  STORAGE_KEY,
  coerceBudgetState,
  defaultState,
  normalizeBudgetState,
  selectBudgetState,
} from '../../src/store/persist'
import type { BudgetState, ExchangeRates } from '../../src/types'

const RATES: ExchangeRates = { base: 'EUR', date: '2026-10-01', values: { usd: 1.25, amd: 400 } }

const T0 = '2026-07-01T00:00:00.000Z'

/** A document written before per-amount currencies existed. */
const legacy = {
  bank: 1500,
  incomeDay: 26,
  buffer: 300,
  currency: 'USD',
  monthlyIncome: 4000,
  categories: [{ id: 'rent', name: 'Rent', budget: 900, spent: 0, done: false, updatedAt: T0 }],
  savings: [{ id: 's1', month: '2026-06', saved: 250, updatedAt: T0 }],
  updatedAt: T0,
  meta: { bank: T0, incomeDay: T0, buffer: T0, currency: T0, monthlyIncome: T0 },
}

function reset(p: Partial<BudgetState> = {}): void {
  useBudgetStore.setState({ ...defaultState, categories: [], savings: [], ...p })
}

describe('legacy migration', () => {
  it('tags every amount with the document’s own currency', () => {
    const s = normalizeBudgetState(legacy as unknown as Partial<BudgetState>)
    expect(s.currency).toBe('USD')
    expect(s.accounts[0]!.currency).toBe('USD')
    expect(s.bufferCurrency).toBe('USD')
    expect(s.monthlyIncomeCurrency).toBe('USD')
    expect(s.categories[0]!.currency).toBe('USD')
    expect(s.savings[0]!.currency).toBe('USD')
  })

  it('is a pure shape migration — no timestamp changes', () => {
    const s = normalizeBudgetState(legacy as unknown as Partial<BudgetState>)
    expect(s.updatedAt).toBe(T0)
    expect(s.accounts[0]!.updatedAt).toBe(T0) // the old meta.bank
    expect(s.meta.buffer).toBe(T0)
    expect(s.categories[0]!.updatedAt).toBe(T0)
    expect(s.savings[0]!.updatedAt).toBe(T0)
  })

  it('keeps explicit tags and repairs malformed ones with the document currency', () => {
    const s = normalizeBudgetState({
      ...(legacy as unknown as Partial<BudgetState>),
      bankCurrency: 'AMD',
      bufferCurrency: 'nope',
      monthlyIncomeCurrency: 'eur',
      categories: [{ ...legacy.categories[0]!, currency: 42 }] as never,
      savings: [{ ...legacy.savings[0]!, currency: 'GEL' }] as never,
    })
    expect(s.accounts[0]!.currency).toBe('AMD')
    expect(s.bufferCurrency).toBe('USD')
    expect(s.monthlyIncomeCurrency).toBe('EUR')
    expect(s.categories[0]!.currency).toBe('USD')
    expect(s.savings[0]!.currency).toBe('GEL')
  })

  it('applies to an imported legacy export', () => {
    const s = coerceBudgetState(legacy)
    expect(s.accounts[0]!.currency).toBe('USD')
    expect(s.categories[0]!.currency).toBe('USD')
  })

  it('applies on localStorage rehydrate, using the STORED currency (not the default)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: legacy, version: 0 }))
    await useBudgetStore.persist.rehydrate()
    const s = useBudgetStore.getState()
    expect(s.currency).toBe('USD')
    expect(s.accounts[0]!.currency).toBe('USD')
    expect(s.bufferCurrency).toBe('USD')
    expect(s.monthlyIncomeCurrency).toBe('USD')
    expect(s.categories[0]!.currency).toBe('USD')
    expect(s.savings[0]!.currency).toBe('USD')
    // Shape migration only — nothing looks like a new edit to the sync engine.
    expect(s.updatedAt).toBe(T0)
    expect(s.accounts[0]!.updatedAt).toBe(T0)
    expect(s.categories[0]!.updatedAt).toBe(T0)
    localStorage.clear()
  })

  it('survives an export → import round trip', () => {
    const tagged = normalizeBudgetState({
      ...(legacy as unknown as Partial<BudgetState>),
      bankCurrency: 'AMD',
      categories: [{ ...legacy.categories[0]!, currency: 'EUR' }] as never,
    })
    const back = coerceBudgetState(JSON.parse(JSON.stringify(selectBudgetState(tagged))))
    expect(back).toEqual(tagged)
  })
})

describe('setCurrency switches the display only', () => {
  beforeEach(() => {
    reset({
      accounts: [
        { id: 'main', name: '', balance: 1500, balanceExpr: '1000+500', currency: 'EUR', updatedAt: T0 },
        { id: 'cash', name: 'Cash', balance: 20000, currency: 'AMD', updatedAt: T0 },
      ],
      buffer: 200,
      monthlyIncome: 3000,
      categories: [
        { id: 'rent', name: 'Rent', budget: 500, spent: 100, currency: 'EUR', done: false, updatedAt: T0 },
      ],
      savings: [{ id: 's1', month: '2026-06', saved: 250, currency: 'EUR', updatedAt: T0 }],
    })
  })

  it('leaves every stored amount and tag untouched', () => {
    const before = selectBudgetState(useBudgetStore.getState())
    useBudgetStore.getState().setCurrency('AMD')
    const after = selectBudgetState(useBudgetStore.getState())
    expect(after.currency).toBe('AMD')
    const strip = (s: BudgetState) => {
      const { currency: _c, updatedAt: _u, meta, ...rest } = s
      const { currency: _mc, ...m } = meta
      return { ...rest, meta: m }
    }
    expect(strip(after)).toEqual(strip(before))
  })

  it('EUR → AMD → EUR restores the data byte for byte', () => {
    const before = JSON.stringify({ ...selectBudgetState(useBudgetStore.getState()), updatedAt: null, meta: null })
    useBudgetStore.getState().setCurrency('AMD')
    useBudgetStore.getState().setCurrency('EUR')
    const after = JSON.stringify({ ...selectBudgetState(useBudgetStore.getState()), updatedAt: null, meta: null })
    expect(after).toBe(before)
  })
})

describe('buffer / income tags', () => {
  beforeEach(() => reset())

  it('setBuffer re-tags when given a currency and keeps the tag otherwise', () => {
    useBudgetStore.getState().setBuffer(200, 'USD')
    expect(useBudgetStore.getState()).toMatchObject({ buffer: 200, bufferCurrency: 'USD' })
    useBudgetStore.getState().setBuffer(300)
    expect(useBudgetStore.getState()).toMatchObject({ buffer: 300, bufferCurrency: 'USD' })
  })

  it('setMonthlyIncome re-tags when given a currency and keeps the tag otherwise', () => {
    useBudgetStore.getState().setMonthlyIncome(4000, 'AMD')
    expect(useBudgetStore.getState()).toMatchObject({ monthlyIncome: 4000, monthlyIncomeCurrency: 'AMD' })
    useBudgetStore.getState().setMonthlyIncome(5000)
    expect(useBudgetStore.getState().monthlyIncomeCurrency).toBe('AMD')
  })

  it('stamps the amount’s own meta field', () => {
    useBudgetStore.getState().setBuffer(1, 'USD')
    useBudgetStore.getState().setMonthlyIncome(1, 'USD')
    const { meta } = useBudgetStore.getState()
    expect(meta.buffer).not.toBeNull()
    expect(meta.monthlyIncome).not.toBeNull()
    expect(meta.currency).toBeNull()
  })
})

describe('new entities default to the display currency', () => {
  beforeEach(() => reset({ currency: 'AMD' }))

  it('addCategory without a currency takes the display currency', () => {
    useBudgetStore.getState().addCategory({ name: 'Food', budget: 1, spent: 0, done: false })
    expect(useBudgetStore.getState().categories[0]!.currency).toBe('AMD')
  })

  it('addCategory keeps an explicit currency', () => {
    useBudgetStore.getState().addCategory({ name: 'Rent', budget: 1, spent: 0, done: false, currency: 'EUR' })
    expect(useBudgetStore.getState().categories[0]!.currency).toBe('EUR')
  })

  it('addSavingsRow takes the display currency', () => {
    useBudgetStore.getState().addSavingsRow()
    expect(useBudgetStore.getState().savings[0]!.currency).toBe('AMD')
  })

  it('updateCategory can re-tag; other edits keep the tag', () => {
    useBudgetStore.getState().addCategory({ name: 'Rent', budget: 1, spent: 0, done: false, currency: 'EUR' })
    const id = useBudgetStore.getState().categories[0]!.id
    useBudgetStore.getState().updateCategory(id, { spent: 1 })
    expect(useBudgetStore.getState().categories[0]!.currency).toBe('EUR')
    useBudgetStore.getState().updateCategory(id, { currency: 'USD' })
    expect(useBudgetStore.getState().categories[0]!.currency).toBe('USD')
  })
})

describe('finalizeMonth in the display currency', () => {
  const month = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  it('converts the prior pool into the display currency and tags the row with it', () => {
    reset({
      currency: 'AMD',
      rates: RATES,
      savings: [{ id: 'old', month: '2026-01', saved: 500, currency: 'EUR', updatedAt: T0 }],
    })
    useBudgetStore.getState().finalizeMonth(1_000_000) // the display-currency total
    const row = useBudgetStore.getState().savings.find((r) => r.month === month)!
    expect(row.currency).toBe('AMD')
    expect(row.saved).toBe(800_000) // ֏1 000 000 − €500 (= ֏200 000)
  })

  it('re-tags an existing row for this month when overwriting it', () => {
    reset({
      currency: 'USD',
      rates: RATES,
      // The row being overwritten is not part of the prior pool.
      savings: [{ id: 'cur', month, saved: 99, currency: 'EUR', updatedAt: T0 }],
    })
    useBudgetStore.getState().finalizeMonth(250)
    const rows = useBudgetStore.getState().savings
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'cur', saved: 250, currency: 'USD' })
  })
})
