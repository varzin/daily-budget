/**
 * Currency tags in the entity merge (CLAUDE.md "Валюта у сумм"): a tag never
 * has a timestamp of its own — it travels with the amount it describes. So a
 * merge can never pair one device's number with another device's currency, and
 * switching the display currency on one device never re-labels the other's data.
 */
import { describe, expect, it } from 'vitest'
import { mergeBudget, sameDocument } from '../../src/sync/merge'
import { defaultState, normalizeBudgetState } from '../../src/store/persist'
import type { BudgetState, Category } from '../../src/types'

const T0 = '2026-07-01T00:00:00.000Z'
const T1 = '2026-07-02T00:00:00.000Z'
const T2 = '2026-07-03T00:00:00.000Z'

function doc(p: Partial<BudgetState> = {}): BudgetState {
  return {
    ...defaultState,
    categories: [],
    savings: [],
    updatedAt: T0,
    ...p,
    meta: { ...defaultState.meta, bank: T0, incomeDay: T0, ...p.meta },
  }
}

const cat = (p: Partial<Category> = {}): Category => ({
  id: 'rent',
  name: 'Rent',
  budget: 500,
  spent: 0,
  currency: 'EUR',
  done: false,
  updatedAt: T0,
  ...p,
})

describe('scalar tags ride their amount’s timestamp', () => {
  it('bankCurrency comes from the side that won bank', () => {
    const local = doc({ bank: 1500, bankCurrency: 'EUR', meta: { ...defaultState.meta, bank: T1 } })
    const remote = doc({ bank: 600000, bankCurrency: 'AMD', meta: { ...defaultState.meta, bank: T2 } })
    const { merged } = mergeBudget(local, remote)
    expect(merged).toMatchObject({ bank: 600000, bankCurrency: 'AMD' })
    // …and the other way round: an older remote never re-labels a newer local balance.
    const back = mergeBudget(remote, { ...local, meta: { ...local.meta, bank: T0 } }).merged
    expect(back).toMatchObject({ bank: 600000, bankCurrency: 'AMD' })
  })

  it('a newer display-currency switch does not drag the other side’s amounts', () => {
    // Local switched display to AMD late; remote re-entered the balance earlier, in EUR.
    const local = doc({
      currency: 'AMD',
      bank: 1000,
      bankCurrency: 'EUR',
      meta: { ...defaultState.meta, currency: T2, bank: T0 },
    })
    const remote = doc({ bank: 2000, bankCurrency: 'EUR', meta: { ...defaultState.meta, bank: T1 } })
    const { merged } = mergeBudget(local, remote)
    expect(merged.currency).toBe('AMD')
    expect(merged).toMatchObject({ bank: 2000, bankCurrency: 'EUR' })
  })

  it('bufferCurrency / monthlyIncomeCurrency come from their amount’s winner', () => {
    const local = doc({
      buffer: 200,
      bufferCurrency: 'EUR',
      monthlyIncome: 3000,
      monthlyIncomeCurrency: 'EUR',
      meta: { ...defaultState.meta, buffer: T2, monthlyIncome: T0 },
    })
    const remote = doc({
      buffer: 80000,
      bufferCurrency: 'AMD',
      monthlyIncome: 1_300_000,
      monthlyIncomeCurrency: 'AMD',
      meta: { ...defaultState.meta, buffer: T1, monthlyIncome: T1 },
    })
    const { merged } = mergeBudget(local, remote)
    expect(merged).toMatchObject({ buffer: 200, bufferCurrency: 'EUR' })
    expect(merged).toMatchObject({ monthlyIncome: 1_300_000, monthlyIncomeCurrency: 'AMD' })
  })
})

describe('entity tags are part of the entity content', () => {
  it('the newer category version wins together with its currency', () => {
    const local = doc({ categories: [cat({ budget: 500, currency: 'EUR', updatedAt: T1 })] })
    const remote = doc({ categories: [cat({ budget: 215000, currency: 'AMD', updatedAt: T2 })] })
    const { merged, conflicts } = mergeBudget(local, remote)
    expect(merged.categories[0]).toMatchObject({ budget: 215000, currency: 'AMD' })
    expect(conflicts).toEqual([])
  })

  it('same timestamp + different currency is a true collision (conflict-copy)', () => {
    const local = doc({ categories: [cat({ currency: 'EUR', updatedAt: T1 })] })
    const remote = doc({ categories: [cat({ currency: 'AMD', updatedAt: T1 })] })
    const { conflicts } = mergeBudget(local, remote)
    expect(conflicts).toHaveLength(1)
  })

  it('savings rows merge with their tag', () => {
    const row = { id: 's', month: '2026-06', saved: 100, currency: 'EUR', updatedAt: T1 }
    const local = doc({ savings: [row] })
    const remote = doc({ savings: [{ ...row, saved: 43000, currency: 'AMD', updatedAt: T2 }] })
    expect(mergeBudget(local, remote).merged.savings[0]).toMatchObject({ saved: 43000, currency: 'AMD' })
  })
})

describe('sameDocument sees the tags', () => {
  it('treats a tag-only difference as a change worth pushing', () => {
    const a = doc({ bankCurrency: 'EUR' })
    expect(sameDocument(a, doc({ bankCurrency: 'EUR' }))).toBe(true)
    expect(sameDocument(a, doc({ bankCurrency: 'AMD' }))).toBe(false)
    expect(sameDocument(a, doc({ bufferCurrency: 'AMD' }))).toBe(false)
    expect(sameDocument(a, doc({ monthlyIncomeCurrency: 'AMD' }))).toBe(false)
    expect(sameDocument(doc({ categories: [cat()] }), doc({ categories: [cat({ currency: 'AMD' })] }))).toBe(false)
  })
})

describe('a remote written by a pre-tag client', () => {
  it('is tagged with ITS currency before the merge, never the local display one', () => {
    // An old client (no tags) whose data is in USD.
    const remote = normalizeBudgetState({
      bank: 900,
      currency: 'USD',
      categories: [{ id: 'gym', name: 'Gym', budget: 40, spent: 0, done: false, updatedAt: T2 }],
      meta: { ...defaultState.meta, bank: T2 },
    } as unknown as Partial<BudgetState>)
    const local = doc({ currency: 'AMD', meta: { ...defaultState.meta, bank: T0 } })
    const { merged } = mergeBudget(local, remote)
    expect(merged).toMatchObject({ bank: 900, bankCurrency: 'USD' })
    expect(merged.categories.find((c) => c.id === 'gym')!.currency).toBe('USD')
  })
})
