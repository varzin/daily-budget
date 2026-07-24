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
  /**
   * Ongoing expense: the money is spent gradually across the whole pay period
   * (food, transport…) rather than as a single bill. Purely presentational —
   * it only enables the spending-pace bar in the table; the daily-budget maths
   * still treats it as budget − spent like any other fixed expense.
   */
  ongoing?: boolean
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
  buffer: string | null
  currency: string | null
  monthlyIncome: string | null
  resetSpentOnFinalize: string | null
  /** When the cached exchange rates were last fetched (drives daily refresh). */
  rates: string | null
}

/**
 * Cached foreign-exchange rates, used to convert currency amounts written inside
 * a formula (e.g. "10 AMD") into the app's default currency. Fetched once a day
 * from the free, keyless fawazahmed0 currency-api. `values` is keyed by
 * lowercase ISO code and reads as "1 `base` = value units of that currency", so
 * a cross-rate between any two listed currencies is derivable — see
 * lib/rates.ts `makeRateResolver`. The whole object is a synced scalar (rides
 * `meta.rates`), so one device's fetch benefits the others, including offline.
 */
export interface ExchangeRates {
  /** ISO 4217 code the rates are relative to (the default currency at fetch). */
  base: string
  /** Rate date reported by the provider, ISO "YYYY-MM-DD". */
  date: string
  /** Lowercase ISO code → units of that currency per 1 `base`. */
  values: Record<string, number>
}

export interface BudgetState {
  bank: number
  /**
   * The arithmetic expression the balance was entered as (e.g. "1200+30" — a
   * split across accounts), kept so it stays editable instead of collapsing to
   * a number. Absent when the balance was typed as a plain number. Carries NO
   * timestamp of its own: it travels with `bank` under `meta.bank`, the same way
   * `budgetExpr` travels with a category's `updatedAt` — so a merge can never
   * pair one device's number with another device's formula.
   */
  bankExpr?: string
  incomeDay: number
  /** Desired positive balance to keep by month end — the green-zone cushion. */
  buffer: number
  /**
   * Optional monthly income, used ONLY for the dashboard pace indicator
   * (planned daily rate vs the actual one). 0 means "not set" — the indicator
   * is hidden and nothing else depends on this field.
   */
  monthlyIncome: number
  /** ISO 4217 currency code (e.g. "EUR"); see lib/currency.ts for the set. */
  currency: string
  /**
   * Whether "Finalize month" resets the Spent of every fixed-expense category
   * by default. Synced as a preference so the habit follows the user across
   * devices. Defaults to true.
   */
  resetSpentOnFinalize: boolean
  /**
   * Cached FX rates for currency-in-formula conversion (null until first fetch).
   * A synced scalar carrying its own `meta.rates` timestamp — see ExchangeRates.
   */
  rates: ExchangeRates | null
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
