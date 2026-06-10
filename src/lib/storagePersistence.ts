import type { BudgetState } from '../types'
import { useBudgetStore } from '../store/budgetStore'
import { hasMeaningfulData } from './backupNudge'

/**
 * localStorage durability — layer 1 from CLAUDE.md §"Надёжность хранения".
 *
 * `navigator.storage.persist()` marks the origin's storage *persistent*: the
 * browser then stops evicting it under storage pressure and, crucially for an
 * intermittently-opened PWA, exempts it from Safari ITP's 7-day cleanup. We do
 * NOT migrate to IndexedDB — it's the same script-writable storage class and
 * gets evicted the same way, so it buys nothing for durability.
 *
 * This is best-effort by design: the API is absent on some browsers and the
 * request can be silently denied, so every path degrades to a clear status the
 * Settings UI can show, and nothing here ever throws.
 */

export type PersistStatus = 'persisted' | 'best-effort' | 'unsupported'

/** The slice of the StorageManager API we use; injectable for tests. */
export interface StorageLike {
  persist?: () => Promise<boolean>
  persisted?: () => Promise<boolean>
  estimate?: () => Promise<{ usage?: number; quota?: number }>
}

function resolve(storage?: StorageLike | null): StorageLike | null {
  if (storage) return storage
  if (typeof navigator !== 'undefined' && navigator.storage) {
    return navigator.storage as StorageLike
  }
  return null
}

export function isPersistenceSupported(storage?: StorageLike | null): boolean {
  const s = resolve(storage)
  return !!(s && typeof s.persist === 'function' && typeof s.persisted === 'function')
}

export async function getPersistStatus(storage?: StorageLike | null): Promise<PersistStatus> {
  const s = resolve(storage)
  if (!s || typeof s.persisted !== 'function') return 'unsupported'
  try {
    return (await s.persisted()) ? 'persisted' : 'best-effort'
  } catch {
    return 'unsupported'
  }
}

/**
 * Request persistent storage once. Idempotent and cheap: if storage is already
 * persisted (or the API is missing) it does not re-request — so it won't
 * re-trigger Firefox's permission prompt. Returns the resulting status.
 */
export async function ensurePersistentStorage(
  storage?: StorageLike | null,
): Promise<PersistStatus> {
  const s = resolve(storage)
  if (!s || typeof s.persist !== 'function' || typeof s.persisted !== 'function') {
    return 'unsupported'
  }
  try {
    if (await s.persisted()) return 'persisted'
    return (await s.persist()) ? 'persisted' : 'best-effort'
  } catch {
    return 'unsupported'
  }
}

export async function getStorageEstimate(
  storage?: StorageLike | null,
): Promise<{ usage: number; quota: number } | null> {
  const s = resolve(storage)
  if (!s || typeof s.estimate !== 'function') return null
  try {
    const e = await s.estimate()
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
  } catch {
    return null
  }
}

// ---------- when to ask ----------

interface PersistStore {
  getState: () => BudgetState
  subscribe: (listener: () => void) => () => void
}

function browserStore(): PersistStore {
  return {
    getState: () => useBudgetStore.getState(),
    subscribe: (listener) => useBudgetStore.subscribe(listener),
  }
}

/**
 * Request persistence at the right moment: not cold on load (which both annoys
 * and lowers the grant odds in Chrome's heuristics), but once the user has
 * meaningful data — immediately for a returning user, otherwise on their first
 * input. Asks at most once per session.
 */
export function initStoragePersistence(
  store: PersistStore = browserStore(),
  storage?: StorageLike | null,
): void {
  let done = false
  let unsubscribe: (() => void) | null = null

  const attempt = (): void => {
    if (done || !hasMeaningfulData(store.getState())) return
    done = true
    unsubscribe?.()
    void ensurePersistentStorage(storage)
  }

  unsubscribe = store.subscribe(attempt)
  attempt() // returning user may already have data at startup
}
