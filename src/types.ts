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
  /**
   * ISO 4217 code `budget` and `spent` are denominated in (CLAUDE.md "Валюта у
   * сумм"). Part of the entity's content, so it travels with its `updatedAt`.
   * Never changes on its own — switching the display currency leaves it as is.
   */
  currency: string
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

/**
 * A money account (card, cash, savings account…). The dashboard balance is the
 * sum of every live account, each converted into the display currency
 * (CLAUDE.md "Счета"). Merged per entity by `id` like categories, with
 * tombstones on delete.
 */
export interface Account extends EntityMeta {
  id: string
  /** Optional label; the UI falls back to the currency code when empty. */
  name: string
  balance: number
  /**
   * The formula the balance was typed as ("1200+30", "50 USD"), kept so it
   * stays editable. Part of the entity, so it travels with its `updatedAt`.
   */
  balanceExpr?: string
  /** ISO 4217 code `balance` is denominated in. */
  currency: string
}

export interface SavingsRow extends EntityMeta {
  id: string
  month: string  // ISO "YYYY-MM"
  saved: number
  /** ISO 4217 code `saved` is denominated in; travels with the row's `updatedAt`. */
  currency: string
}

/** Per-field timestamps for the independent scalars, used by entity merge. */
export interface BudgetMeta {
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
  /**
   * The user's accounts; the balance is their sum in the display currency.
   * Replaces the legacy single `bank` / `bankExpr` / `bankCurrency` balance,
   * which normalization migrates into one account (persist.ts).
   */
  accounts: Account[]
  incomeDay: number
  /** Desired positive balance to keep by month end — the green-zone cushion. */
  buffer: number
  /** Currency of `buffer`; travels with it under `meta.buffer`. */
  bufferCurrency: string
  /**
   * Optional monthly income, used ONLY for the dashboard pace indicator
   * (planned daily rate vs the actual one). 0 means "not set" — the indicator
   * is hidden and nothing else depends on this field.
   */
  monthlyIncome: number
  /** Currency of `monthlyIncome`; travels with it under `meta.monthlyIncome`. */
  monthlyIncomeCurrency: string
  /**
   * The DISPLAY currency (ISO 4217, e.g. "EUR"; see lib/currency.ts for the
   * set): totals and the forecast are converted into it on the fly. It does not
   * say what any stored amount is in — every amount carries its own tag
   * (`Account.currency`, `Category.currency`, …), so switching it touches no data.
   * Default currency for newly created amounts.
   */
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
