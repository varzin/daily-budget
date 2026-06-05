/**
 * Test harness that runs the REAL `src/sync/dropbox.ts` against an in-memory
 * `FakeDropbox`, so the e2e specs exercise the actual pull/merge/push flow.
 *
 * The "other device" in every scenario is represented simply by the contents
 * of the shared Dropbox file (seed it with `dbx.setFile(...)`); only one live
 * sync module instance is needed per test.
 *
 * It also pins the TARGET data model for the reliability rework (CLAUDE.md
 * §"Dropbox-синхронизация"): every entity carries its own `updatedAt`, deletes
 * are kept as tombstones (`deletedAt`), and the two scalars (`bank`,
 * `incomeDay`) carry per-field timestamps under `meta`. The current code does
 * not track any of this yet — which is exactly why these specs are red.
 */
import { vi } from 'vitest'
import { FakeDropbox } from './fakeDropbox'

const STORAGE_KEY = 'budget_app_v1'
const TOKENS_KEY = 'budget_app_dropbox_v1'
export const FILE_PATH = '/budget.json'

// ---- target data model --------------------------------------------------

export interface EntityMeta {
  /** When this entity was last changed on the device that wrote it. */
  updatedAt: string
  /** Tombstone: set when the entity was deleted. Never resurrected by merge. */
  deletedAt?: string
}

export interface CategoryEntity extends EntityMeta {
  id: string
  name: string
  budget: number
  spent: number
  done: boolean
  note?: string
}

export interface SavingsEntity extends EntityMeta {
  id: string
  month: string
  saved: number
}

/** The document shape that lives in /budget.json after the rework. */
export interface SyncDoc {
  bank: number
  incomeDay: number
  categories: CategoryEntity[]
  savings: SavingsEntity[]
  updatedAt: string | null
  /** Per-field timestamps for the two scalars. */
  meta: { bank: string; incomeDay: string }
}

// ---- builders -----------------------------------------------------------

export function cat(
  id: string,
  fields: Partial<Omit<CategoryEntity, 'id'>> & { updatedAt: string },
): CategoryEntity {
  return {
    id,
    name: fields.name ?? id,
    budget: fields.budget ?? 0,
    spent: fields.spent ?? 0,
    done: fields.done ?? false,
    note: fields.note,
    updatedAt: fields.updatedAt,
    deletedAt: fields.deletedAt,
  }
}

export function saving(
  id: string,
  fields: Partial<Omit<SavingsEntity, 'id'>> & { updatedAt: string },
): SavingsEntity {
  return {
    id,
    month: fields.month ?? '2026-06',
    saved: fields.saved ?? 0,
    updatedAt: fields.updatedAt,
    deletedAt: fields.deletedAt,
  }
}

export function doc(partial: Partial<SyncDoc> = {}): SyncDoc {
  const t = partial.updatedAt ?? '2026-06-01T00:00:00.000Z'
  return {
    bank: partial.bank ?? 0,
    incomeDay: partial.incomeDay ?? 26,
    categories: partial.categories ?? [],
    savings: partial.savings ?? [],
    updatedAt: t,
    meta: partial.meta ?? { bank: t, incomeDay: t },
  }
}

// ---- the device under test ---------------------------------------------

export type SyncModule = typeof import('../../src/sync/dropbox')
export type StoreModule = typeof import('../../src/store/budgetStore')

export interface Device {
  dbx: FakeDropbox
  sync: SyncModule
  store: StoreModule['useBudgetStore']
  /** Write a full document into local state (as if it lived in the store). */
  seedLocal: (d: SyncDoc) => void
  /** Read local state back out in document shape. */
  readLocal: () => SyncDoc
}

/**
 * Spin up a fresh, "connected" device wired to `dbx`. Resets the module
 * registry first so the sync singleton and the Zustand store start clean.
 */
export async function makeDevice(dbx: FakeDropbox): Promise<Device> {
  vi.resetModules()

  // Clean browser state, then plant non-expiring Dropbox tokens.
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(
    TOKENS_KEY,
    JSON.stringify({
      access_token: 'fake-access',
      refresh_token: 'fake-refresh',
      expires_at: Date.now() + 1_000_000_000,
    }),
  )

  vi.stubGlobal('fetch', dbx.fetch)

  const store = await import('../../src/store/budgetStore')
  const sync = await import('../../src/sync/dropbox')
  // Let persist's async rehydrate settle (storage is empty, so it's a no-op).
  await Promise.resolve()

  const useBudgetStore = store.useBudgetStore

  const device: Device = {
    dbx,
    sync,
    store: useBudgetStore,
    seedLocal(d) {
      useBudgetStore.setState({
        bank: d.bank,
        incomeDay: d.incomeDay,
        categories: d.categories as never,
        savings: d.savings as never,
        updatedAt: d.updatedAt,
        // `meta` is an extra field the rework will formalise on the store.
        meta: d.meta,
      } as never)
    },
    readLocal() {
      const s = useBudgetStore.getState() as unknown as SyncDoc
      return {
        bank: s.bank,
        incomeDay: s.incomeDay,
        categories: s.categories as CategoryEntity[],
        savings: s.savings as SavingsEntity[],
        updatedAt: s.updatedAt,
        meta: s.meta ?? { bank: '', incomeDay: '' },
      }
    },
  }
  return device
}

// ---- assertions helpers -------------------------------------------------

/** The live (non-tombstoned) categories from a document, keyed by id. */
export function liveCategories(d: SyncDoc): Map<string, CategoryEntity> {
  const m = new Map<string, CategoryEntity>()
  for (const c of d.categories) if (!c.deletedAt) m.set(c.id, c)
  return m
}

export function findCategory(d: SyncDoc, id: string): CategoryEntity | undefined {
  return d.categories.find((c) => c.id === id)
}

export const STORE_KEY = STORAGE_KEY
