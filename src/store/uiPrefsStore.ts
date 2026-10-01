import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// View/segmented selections the user makes in the UI. These are device-local
// preferences (which filter is showing, which view is active) and, like the
// theme, are deliberately NOT synced via Dropbox — kept separate from the
// budget data (`budget_app_v1`).
export const UI_PREFS_STORAGE_KEY = 'budget_ui_prefs_v1'

/** Fixed expenses tab: show all rows or only the unpaid ones. */
export type CategoryFilter = 'all' | 'unpaid'
/** Savings tab: table or chart. */
export type SavingsView = 'table' | 'chart'

interface UiPrefsState {
  categoryFilter: CategoryFilter
  savingsView: SavingsView
  /** Dashboard balance card: the account list expanded or collapsed. */
  accountsOpen: boolean
  setCategoryFilter: (filter: CategoryFilter) => void
  setSavingsView: (view: SavingsView) => void
  setAccountsOpen: (open: boolean) => void
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      categoryFilter: 'all',
      savingsView: 'table',
      accountsOpen: false,
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setSavingsView: (savingsView) => set({ savingsView }),
      setAccountsOpen: (accountsOpen) => set({ accountsOpen }),
    }),
    {
      name: UI_PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
