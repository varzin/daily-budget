import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BudgetState, Category, SavingsRow } from '../types'
import { uid, currentMonthKey, round2 } from '../lib/utils'
import {
  STORAGE_KEY,
  defaultState,
  migrateSavings,
  coerceBudgetState,
} from './persist'

// ---------- echo-suppression flag (read by sync/dropbox.ts) ----------
//
// When `replaceState({ fromRemote: true })` writes the store, we set this
// flag for the duration of the synchronous `set()` call. The Dropbox
// subscriber checks it in its callback and skips scheduling a push, so
// pulling a remote change doesn't immediately push the same data back.
let lastChangeWasRemote = false
export function wasLastChangeRemote(): boolean {
  return lastChangeWasRemote
}

// ---------- math helpers used by finalizeMonth ----------
// Tombstoned entities (deletedAt set) are excluded from all sums.
function categoryAmount(cat: Category): number {
  if (cat.done || cat.deletedAt) return 0
  const budget = Number(cat.budget) || 0
  const spent = Number(cat.spent) || 0
  return Math.max(0, budget - spent)
}
function obligatoryTotal(categories: Category[]): number {
  return categories.reduce((sum, c) => sum + categoryAmount(c), 0)
}
function currentSavingsTotal(savings: SavingsRow[]): number {
  return savings.reduce((sum, r) => sum + (r.deletedAt ? 0 : Number(r.saved) || 0), 0)
}

// ---------- store types ----------
type BudgetActions = {
  setBank: (n: number) => void
  setIncomeDay: (n: number) => void
  addCategory: (input: Omit<Category, 'id'>) => void
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void
  toggleCategoryDone: (id: string) => void
  addSavingsRow: () => void
  updateSavingsRow: (id: string, patch: Partial<SavingsRow>) => void
  deleteSavingsRow: (id: string) => void
  finalizeMonth: (bankAtFinalize: number) => void
  exportData: () => void
  importData: (file: File) => Promise<void>
  replaceState: (s: BudgetState, opts?: { fromRemote?: boolean }) => void
}

export type BudgetStore = BudgetState & BudgetActions

const now = (): string => new Date().toISOString()

// Helper: every local mutation goes through this so we always bump the
// document-level updatedAt. Per-entity `updatedAt` (and `meta` for scalars)
// are stamped by the individual actions — that's what entity merge compares.
function touch<T extends Partial<BudgetState>>(patch: T): T & { updatedAt: string } {
  return { ...patch, updatedAt: now() }
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // ---------- bank / income ----------
      setBank: (n) => {
        const t = now()
        set(touch({ bank: Number(n) || 0, meta: { ...get().meta, bank: t } }))
      },
      setIncomeDay: (n) => {
        const t = now()
        set(touch({ incomeDay: Number(n) || 0, meta: { ...get().meta, incomeDay: t } }))
      },

      // ---------- categories ----------
      addCategory: (input) => {
        const cat: Category = { id: uid(), ...input, updatedAt: now() }
        set(touch({ categories: [...get().categories, cat] }))
      },
      updateCategory: (id, patch) => {
        const t = now()
        set(touch({
          categories: get().categories.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: t } : c,
          ),
        }))
      },
      // Delete = tombstone: keep the row with `deletedAt` so the deletion
      // survives a merge with a stale copy instead of being resurrected.
      deleteCategory: (id) => {
        const t = now()
        set(touch({
          categories: get().categories.map((c) =>
            c.id === id ? { ...c, deletedAt: t, updatedAt: t } : c,
          ),
        }))
      },
      toggleCategoryDone: (id) => {
        const t = now()
        set(touch({
          categories: get().categories.map((c) =>
            c.id === id ? { ...c, done: !c.done, updatedAt: t } : c,
          ),
        }))
      },

      // ---------- savings ----------
      addSavingsRow: () => {
        const row: SavingsRow = { id: uid(), month: currentMonthKey(), saved: 0, updatedAt: now() }
        set(touch({ savings: [...get().savings, row] }))
      },
      updateSavingsRow: (id, patch) => {
        const t = now()
        set(touch({
          savings: get().savings.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: t } : r,
          ),
        }))
      },
      deleteSavingsRow: (id) => {
        const t = now()
        set(touch({
          savings: get().savings.map((r) =>
            r.id === id ? { ...r, deletedAt: t, updatedAt: t } : r,
          ),
        }))
      },
      finalizeMonth: (bankAtFinalize) => {
        const { categories, savings } = get()
        const bank = Number(bankAtFinalize) || 0
        const oblig = obligatoryTotal(categories)
        const prevPool = currentSavingsTotal(savings)
        const saved = round2(bank - oblig - prevPool)
        const month = currentMonthKey()

        const t = now()
        const existingIdx = savings.findIndex((r) => r.month === month && !r.deletedAt)
        let nextSavings: SavingsRow[]
        if (existingIdx >= 0) {
          nextSavings = savings.map((r, i) =>
            i === existingIdx ? { ...r, saved, updatedAt: t } : r,
          )
        } else {
          nextSavings = [...savings, { id: uid(), month, saved, updatedAt: t }]
        }
        set(touch({ savings: nextSavings }))
      },

      // ---------- import / export ----------
      exportData: () => {
        const s = get()
        const payload: BudgetState = {
          bank: s.bank,
          incomeDay: s.incomeDay,
          categories: s.categories,
          savings: s.savings,
          updatedAt: s.updatedAt,
          meta: s.meta,
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `budget-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      },
      importData: async (file) => {
        let text: string
        try {
          text = await file.text()
        } catch {
          throw new Error('Could not read file')
        }
        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          throw new Error('File is not valid JSON')
        }
        const next = coerceBudgetState(parsed)
        // Import is treated as a local change — bump updatedAt so Dropbox
        // picks it up and pushes the imported data.
        get().replaceState(next, { fromRemote: false })
      },

      // ---------- replace (remote pull or import) ----------
      replaceState: (s, opts) => {
        const fromRemote = !!opts?.fromRemote
        const next: BudgetState = {
          bank: Number(s.bank) || 0,
          incomeDay: Number(s.incomeDay) || defaultState.incomeDay,
          categories: Array.isArray(s.categories) ? s.categories : [],
          savings: migrateSavings(s.savings),
          // Preserve remote's updatedAt; bump it for local imports.
          updatedAt: fromRemote
            ? (s.updatedAt ?? null)
            : now(),
          meta: {
            bank: s.meta?.bank ?? null,
            incomeDay: s.meta?.incomeDay ?? null,
          },
        }
        lastChangeWasRemote = fromRemote
        try {
          // replace=true wipes the slice and reinstalls only the keys we
          // pass — but we must keep the action functions, so we merge.
          set(next)
        } finally {
          // Flip back on the next microtask so the subscriber (which
          // runs synchronously from set) sees the flag, but nothing
          // afterwards does.
          queueMicrotask(() => {
            lastChangeWasRemote = false
          })
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the data — never the action functions.
      partialize: (state): BudgetState => ({
        bank: state.bank,
        incomeDay: state.incomeDay,
        categories: state.categories,
        savings: state.savings,
        updatedAt: state.updatedAt,
        meta: state.meta,
      }),
      // Run the legacy-month migration exactly once on rehydrate.
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) return
        const migrated = migrateSavings(rehydrated.savings)
        const changed =
          migrated.length !== rehydrated.savings.length ||
          migrated.some((r, i) => r.month !== rehydrated.savings[i]?.month)
        if (changed) {
          // Don't bump updatedAt for a pure shape migration — otherwise
          // every existing install would push a "new" state to Dropbox.
          useBudgetStore.setState({ savings: migrated })
        }
      },
    },
  ),
)
