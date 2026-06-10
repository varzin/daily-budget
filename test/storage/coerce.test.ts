/**
 * Specs for the hardened normalization layer (store/persist.ts): data from
 * untrusted sources — an imported file or the remote /budget.json — must be
 * sanitized field-by-field before it can reach the store, the UI or the merge
 * logic. Malformed entries are dropped or coerced, never passed through.
 */
import { describe, expect, it } from 'vitest'
import {
  coerceBudgetState,
  migrateCategories,
  migrateSavings,
  normalizeBudgetState,
  DEFAULT_BUFFER,
} from '../../src/store/persist'
import { DEFAULT_CURRENCY } from '../../src/lib/currency'

const T1 = '2026-06-01T09:00:00.000Z'

describe('migrateCategories', () => {
  it('returns [] for non-arrays', () => {
    expect(migrateCategories(undefined)).toEqual([])
    expect(migrateCategories('nope')).toEqual([])
    expect(migrateCategories({ 0: {} })).toEqual([])
  })

  it('drops non-object rows instead of crashing', () => {
    expect(migrateCategories([null, 'x', 42])).toEqual([])
  })

  it('coerces field types and fills safe defaults', () => {
    const [c] = migrateCategories([
      { id: 'a', name: 5, budget: '12.5', spent: null, done: 1, note: 7 },
    ])
    expect(c).toEqual({ id: 'a', name: '', budget: 12.5, spent: 0, done: true })
  })

  it('rejects non-finite numbers', () => {
    const [c] = migrateCategories([{ id: 'a', name: 'x', budget: Infinity, spent: NaN, done: false }])
    expect(c!.budget).toBe(0)
    expect(c!.spent).toBe(0)
  })

  it('generates an id when missing', () => {
    const [c] = migrateCategories([{ name: 'x', budget: 1, spent: 0, done: false }])
    expect(typeof c!.id).toBe('string')
    expect(c!.id.length).toBeGreaterThan(0)
  })

  it('preserves sync metadata (updatedAt / deletedAt tombstone)', () => {
    const [c] = migrateCategories([
      { id: 'a', name: 'x', budget: 1, spent: 0, done: false, updatedAt: T1, deletedAt: T1 },
    ])
    expect(c!.updatedAt).toBe(T1)
    expect(c!.deletedAt).toBe(T1)
  })

  it('drops non-string metadata and expressions', () => {
    const [c] = migrateCategories([
      { id: 'a', name: 'x', budget: 1, spent: 0, done: false, updatedAt: 123, budgetExpr: {} },
    ])
    expect(c!.updatedAt).toBeUndefined()
    expect(c!.budgetExpr).toBeUndefined()
  })
})

describe('migrateSavings', () => {
  it('drops non-object rows and coerces saved to a finite number', () => {
    const rows = migrateSavings([null, { id: 's1', month: '2026-06', saved: Infinity }])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.saved).toBe(0)
  })

  it('converts legacy MM.YYYY months and keeps tombstones', () => {
    const [r] = migrateSavings([{ id: 's1', month: '06.2026', saved: 10, deletedAt: T1 }])
    expect(r!.month).toBe('2026-06')
    expect(r!.deletedAt).toBe(T1)
  })
})

describe('normalizeBudgetState', () => {
  it('fills defaults for an empty object', () => {
    const s = normalizeBudgetState({})
    expect(s.bank).toBe(0)
    expect(s.incomeDay).toBe(26)
    expect(s.buffer).toBe(DEFAULT_BUFFER)
    expect(s.currency).toBe(DEFAULT_CURRENCY)
    expect(s.categories).toEqual([])
    expect(s.savings).toEqual([])
    expect(s.updatedAt).toBeNull()
    expect(s.meta).toEqual({
      bank: null,
      incomeDay: null,
      buffer: null,
      currency: null,
      monthlyIncome: null,
    })
  })

  it('sanitizes meta timestamps to strings or null', () => {
    const s = normalizeBudgetState({ meta: { bank: 42, incomeDay: T1 } as never })
    expect(s.meta.bank).toBeNull()
    expect(s.meta.incomeDay).toBe(T1)
  })

  it('falls back to the default for an unknown currency', () => {
    expect(normalizeBudgetState({ currency: 'XXX' }).currency).toBe(DEFAULT_CURRENCY)
  })

  it('keeps an explicit zero buffer', () => {
    expect(normalizeBudgetState({ buffer: 0 }).buffer).toBe(0)
  })
})

describe('coerceBudgetState', () => {
  it('throws for non-objects and missing required fields', () => {
    expect(() => coerceBudgetState('x')).toThrow()
    expect(() => coerceBudgetState(null)).toThrow()
    expect(() => coerceBudgetState({ foo: 1 })).toThrow()
  })

  it('accepts a minimal legacy document', () => {
    const s = coerceBudgetState({ bank: '100', categories: [], savings: [] })
    expect(s.bank).toBe(100)
    expect(s.buffer).toBe(DEFAULT_BUFFER)
  })
})
