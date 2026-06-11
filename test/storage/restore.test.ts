/**
 * Undo for deletions (CLAUDE.md §"Замена нативных диалогов"): a delete is a
 * tombstone, so the toast's Undo restores the entity by dropping `deletedAt`
 * and bumping `updatedAt` — which must also win the entity merge against a
 * stale tombstoned copy from another device.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useBudgetStore } from '../../src/store/budgetStore'
import { defaultState } from '../../src/store/persist'
import { mergeBudget } from '../../src/sync/merge'
import type { BudgetState, Category } from '../../src/types'

beforeEach(() => {
  localStorage.clear()
  useBudgetStore.setState({ ...defaultState, categories: [], savings: [] })
})

const store = () => useBudgetStore.getState()

describe('restoreCategory', () => {
  it('clears the tombstone and bumps updatedAt', () => {
    store().addCategory({ name: 'Rent', budget: 700, spent: 0, done: false })
    const id = store().categories[0]!.id

    store().deleteCategory(id)
    const deleted = store().categories[0]!
    expect(deleted.deletedAt).toBeTruthy()

    store().restoreCategory(id)
    const restored = store().categories[0]!
    expect(restored.deletedAt).toBeUndefined()
    expect(restored.name).toBe('Rent')
    expect(restored.updatedAt).toBeTruthy()
  })

  it('leaves other categories untouched', () => {
    store().addCategory({ name: 'Rent', budget: 700, spent: 0, done: false })
    store().addCategory({ name: 'Gym', budget: 30, spent: 0, done: false })
    const [rent, gym] = store().categories
    store().deleteCategory(rent!.id)
    store().restoreCategory(rent!.id)
    expect(store().categories.find((c) => c.id === gym!.id)).toEqual(gym)
  })
})

describe('restoreSavingsRow', () => {
  it('clears the tombstone and bumps updatedAt', () => {
    store().addSavingsRow()
    const id = store().savings[0]!.id

    store().deleteSavingsRow(id)
    expect(store().savings[0]!.deletedAt).toBeTruthy()

    store().restoreSavingsRow(id)
    expect(store().savings[0]!.deletedAt).toBeUndefined()
  })
})

describe('restore vs stale tombstone merge', () => {
  const T1 = '2026-06-01T00:00:00.000Z'
  const T2 = '2026-06-02T00:00:00.000Z'

  function doc(categories: Category[]): BudgetState {
    return { ...defaultState, categories, savings: [], updatedAt: T1 }
  }

  it('a restored entity (newer updatedAt) survives the merge', () => {
    const base = { id: 'a', name: 'Rent', budget: 700, spent: 0, done: false }
    // Another device still carries the tombstone from before the undo.
    const stale = { ...base, updatedAt: T1, deletedAt: T1 }
    const restored = { ...base, updatedAt: T2 }

    const { merged } = mergeBudget(doc([restored]), doc([stale]))
    expect(merged.categories).toHaveLength(1)
    expect(merged.categories[0]!.deletedAt).toBeUndefined()
  })
})
