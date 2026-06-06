export type TabName = 'dashboard' | 'obligatory' | 'savings' | 'settings'

/**
 * Per-entity sync metadata. `updatedAt` drives last-writer-wins merge;
 * `deletedAt` is a tombstone so a delete survives merge with a stale copy
 * instead of being resurrected. Both are optional for backward-compat with
 * data written before the reliability rework (treated as "oldest").
 */
export interface EntityMeta {
  updatedAt?: string
  deletedAt?: string
}

export interface Category extends EntityMeta {
  id: string
  name: string
  budget: number
  budgetExpr?: string
  spent: number
  spentExpr?: string
  note?: string
  done: boolean
}

export interface SavingsRow extends EntityMeta {
  id: string
  month: string  // ISO "YYYY-MM"
  saved: number
}

/** Per-field timestamps for the independent scalars, used by entity merge. */
export interface BudgetMeta {
  bank: string | null
  incomeDay: string | null
}

export interface BudgetState {
  bank: number
  incomeDay: number
  categories: Category[]
  savings: SavingsRow[]
  updatedAt: string | null
  meta: BudgetMeta
}

export type SyncStatus = 'not_connected' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncInfo {
  status: SyncStatus
  lastSyncAt: number | null
  lastError: string | null
  account: { email?: string; name?: string } | null
  connected: boolean
}
