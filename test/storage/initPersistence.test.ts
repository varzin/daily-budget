/**
 * Spec for WHEN persistence is requested. Per the chosen UX, we don't prompt
 * cold on load — we request once the user has meaningful data: immediately for
 * a returning user who already has data, otherwise on their first input. And we
 * ask at most once per session.
 *
 * The store and StorageManager are injected so this runs headless.
 */
import { describe, expect, it, vi } from 'vitest'
import { initStoragePersistence } from '../../src/lib/storagePersistence'
import type { BudgetState } from '../../src/types'

function emptyState(): BudgetState {
  return { bank: 0, incomeDay: 26, categories: [], savings: [], updatedAt: null, meta: { bank: null, incomeDay: null } }
}

/** Minimal fake of the slice of the Zustand store we depend on. */
function fakeStore(initial: BudgetState) {
  let s = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => s,
    subscribe: (cb: () => void) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    set(next: BudgetState) {
      s = next
      listeners.forEach((cb) => cb())
    },
  }
}

function fakeStorage(grant = true) {
  return {
    persisted: vi.fn(async () => false),
    persist: vi.fn(async () => grant),
    estimate: vi.fn(async () => ({ usage: 0, quota: 0 })),
  }
}

describe('initStoragePersistence', () => {
  it('does not request while the budget is still empty', async () => {
    const store = fakeStore(emptyState())
    const storage = fakeStorage()
    initStoragePersistence(store, storage)
    await Promise.resolve()
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('requests immediately when data already exists at startup', async () => {
    const store = fakeStore({ ...emptyState(), bank: 500 })
    const storage = fakeStorage()
    initStoragePersistence(store, storage)
    await Promise.resolve()
    expect(storage.persist).toHaveBeenCalledTimes(1)
  })

  it('requests on the first meaningful change, then never again', async () => {
    const store = fakeStore(emptyState())
    const storage = fakeStorage()
    initStoragePersistence(store, storage)
    await Promise.resolve()
    expect(storage.persist).not.toHaveBeenCalled()

    store.set({ ...emptyState(), bank: 100 }) // first input
    await Promise.resolve()
    expect(storage.persist).toHaveBeenCalledTimes(1)

    store.set({ ...emptyState(), bank: 200 }) // further edits
    await Promise.resolve()
    expect(storage.persist).toHaveBeenCalledTimes(1)
  })
})
