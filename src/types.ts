export type TabName = 'dashboard' | 'obligatory' | 'savings' | 'settings'

export interface Category {
  id: string
  name: string
  budget: number
  budgetExpr?: string
  spent: number
  spentExpr?: string
  done: boolean
}

export interface SavingsRow {
  id: string
  month: string  // ISO "YYYY-MM"
  saved: number
}

export interface BudgetState {
  bank: number
  incomeDay: number
  categories: Category[]
  savings: SavingsRow[]
  updatedAt: string | null
}

export type SyncStatus = 'not_connected' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncInfo {
  status: SyncStatus
  lastSyncAt: number | null
  lastError: string | null
  account: { email?: string; name?: string } | null
  connected: boolean
}
