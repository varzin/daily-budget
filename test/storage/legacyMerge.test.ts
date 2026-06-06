/**
 * Migration-safety specs: data written before the reliability rework has no
 * per-entity timestamps and no `meta`. Merging such legacy documents must
 * behave like the old "newest whole file wins" — never spuriously conflict,
 * resurrect a deletion, or lose the newer balance — so upgrading an existing
 * install (localStorage and/or the existing /budget.json) is safe.
 */
import { describe, expect, it } from 'vitest'
import { mergeBudget } from '../../src/sync/merge'
import type { BudgetState, Category } from '../../src/types'

const T_OLD = '2026-05-01T00:00:00.000Z'
const T_NEW = '2026-05-02T00:00:00.000Z'

/** A legacy document: scalar-only meta absent, entities carry no timestamps. */
function legacy(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 0,
    incomeDay: 26,
    categories: [],
    savings: [],
    updatedAt: null,
    // meta exists on the type but is "empty" (null) for legacy data.
    meta: { bank: null, incomeDay: null },
    ...p,
  }
}

function cat(id: string, budget: number): Category {
  return { id, name: id, budget, spent: 0, done: false }
}

describe('legacy merge (no per-entity metadata)', () => {
  it('takes the whole newer document by document updatedAt', () => {
    const local = legacy({ bank: 100, updatedAt: T_OLD, categories: [cat('a', 10)] })
    const remote = legacy({ bank: 200, updatedAt: T_NEW, categories: [cat('a', 20)] })

    const { merged, conflicts } = mergeBudget(local, remote)

    expect(merged.bank).toBe(200) // newer side
    expect(merged.categories.find((c) => c.id === 'a')?.budget).toBe(20)
    expect(conflicts).toHaveLength(0) // no spurious conflict copies
  })

  it('keeps local when local is the newer document', () => {
    const local = legacy({ bank: 999, updatedAt: T_NEW })
    const remote = legacy({ bank: 1, updatedAt: T_OLD })
    expect(mergeBudget(local, remote).merged.bank).toBe(999)
  })

  it('does not resurrect a deletion: the newer side without the row wins whole', () => {
    // Newer remote no longer has category "a" (it was deleted there);
    // older local still lists it. Whole-document fallback must respect the
    // deletion rather than union the stale row back in.
    const local = legacy({ updatedAt: T_OLD, categories: [cat('a', 10), cat('b', 5)] })
    const remote = legacy({ updatedAt: T_NEW, categories: [cat('b', 5)] })

    const { merged } = mergeBudget(local, remote)
    expect(merged.categories.map((c) => c.id)).toEqual(['b'])
  })

  it('produces no conflict copies even when legacy content diverges', () => {
    const local = legacy({ updatedAt: T_OLD, categories: [cat('a', 10)] })
    const remote = legacy({ updatedAt: T_NEW, categories: [cat('a', 20)] })
    expect(mergeBudget(local, remote).conflicts).toHaveLength(0)
  })

  it('switches to entity merge once either side is stamped', () => {
    // Local edited "a" after upgrade (stamped, recent); remote still legacy.
    const local = legacy({
      updatedAt: T_NEW,
      categories: [{ ...cat('a', 11), updatedAt: T_NEW }],
      meta: { bank: null, incomeDay: null },
    })
    const remote = legacy({ updatedAt: T_OLD, categories: [cat('a', 20)] })

    const { merged } = mergeBudget(local, remote)
    // Stamped local edit (recent) beats the un-stamped (epoch) remote per-entity.
    expect(merged.categories.find((c) => c.id === 'a')?.budget).toBe(11)
  })
})
