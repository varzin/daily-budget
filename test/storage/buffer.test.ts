/**
 * Phase A — configurable green-zone cushion (CLAUDE.md "Future ideas" #1).
 * The buffer is a synced scalar: it persists, coerces sensibly (0 is a valid
 * "no cushion" choice, absent falls back to the default), and merges per-field
 * by `meta.buffer` exactly like bank / incomeDay.
 */
import { describe, expect, it } from 'vitest'
import { coerceBuffer, DEFAULT_BUFFER } from '../../src/store/persist'
import { mergeBudget } from '../../src/sync/merge'
import type { BudgetState } from '../../src/types'

const T0 = '2026-05-01T00:00:00.000Z'
const T2 = '2026-05-03T00:00:00.000Z'

function doc(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 0,
    incomeDay: 26,
    buffer: DEFAULT_BUFFER,
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: { bank: null, incomeDay: null, buffer: null },
    ...p,
  }
}

describe('coerceBuffer', () => {
  it('falls back to the default when absent', () => {
    expect(coerceBuffer(undefined)).toBe(DEFAULT_BUFFER)
    expect(coerceBuffer(null)).toBe(DEFAULT_BUFFER)
    expect(coerceBuffer('')).toBe(DEFAULT_BUFFER)
  })

  it('keeps an explicit 0 (no cushion) rather than defaulting', () => {
    expect(coerceBuffer(0)).toBe(0)
  })

  it('clamps negatives to 0 and accepts numeric strings', () => {
    expect(coerceBuffer(-50)).toBe(0)
    expect(coerceBuffer('300')).toBe(300)
    expect(coerceBuffer(150.5)).toBe(150.5)
  })

  it('falls back on non-numeric junk', () => {
    expect(coerceBuffer('abc')).toBe(DEFAULT_BUFFER)
  })
})

describe('buffer scalar merge', () => {
  it('takes the side whose buffer was edited more recently', () => {
    const local = doc({ buffer: 200, meta: { bank: null, incomeDay: null, buffer: T0 } })
    const remote = doc({ buffer: 500, meta: { bank: null, incomeDay: null, buffer: T2 } })
    expect(mergeBudget(local, remote).merged.buffer).toBe(500)
  })

  it('merges buffer independently of another scalar', () => {
    // Local has the newer income day, remote has the newer buffer — each field
    // wins on its own timestamp.
    const local = doc({ incomeDay: 10, buffer: 200, meta: { incomeDay: T2, buffer: T0 } as never })
    const remote = doc({ incomeDay: 20, buffer: 500, meta: { incomeDay: T0, buffer: T2 } as never })
    const { merged } = mergeBudget(local, remote)
    expect(merged.incomeDay).toBe(10)
    expect(merged.buffer).toBe(500)
  })
})
