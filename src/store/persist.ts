import type { Account, BudgetMeta, BudgetState, Category, ExchangeRates, SavingsRow } from '../types'
import { normalizeMonth, uid } from '../lib/utils'
import { coerceCurrency, coerceCurrencyTag, DEFAULT_CURRENCY } from '../lib/currency'

// Same key the vanilla app used — existing users' data is preserved.
export const STORAGE_KEY = 'budget_app_v1'

/** Default green-zone cushion when the user hasn't customized it (in the default currency). */
export const DEFAULT_BUFFER = 200

/** Finalize resets the fixed-expense Spent by default — the common housekeeping. */
export const DEFAULT_RESET_SPENT_ON_FINALIZE = true

/**
 * The id of the account the legacy single balance becomes — and of a fresh
 * install's first account. It MUST be deterministic: two devices migrating the
 * same legacy balance independently then produce the same entity, which merges
 * cleanly, instead of two accounts that would double the balance.
 */
export const MAIN_ACCOUNT_ID = 'main'

export const defaultState: BudgetState = {
  accounts: [{ id: MAIN_ACCOUNT_ID, name: '', balance: 0, currency: DEFAULT_CURRENCY }],
  incomeDay: 26,
  buffer: DEFAULT_BUFFER,
  bufferCurrency: DEFAULT_CURRENCY,
  currency: DEFAULT_CURRENCY,
  monthlyIncome: 0,
  monthlyIncomeCurrency: DEFAULT_CURRENCY,
  resetSpentOnFinalize: DEFAULT_RESET_SPENT_ON_FINALIZE,
  rates: null,
  categories: [],
  savings: [],
  updatedAt: null,
  meta: {
    incomeDay: null,
    buffer: null,
    currency: null,
    monthlyIncome: null,
    resetSpentOnFinalize: null,
    rates: null,
  },
}

/** The synced/persisted data slice of the store — no action functions. */
export function selectBudgetState(s: BudgetState): BudgetState {
  return {
    accounts: s.accounts,
    incomeDay: s.incomeDay,
    buffer: s.buffer,
    bufferCurrency: s.bufferCurrency,
    currency: s.currency,
    monthlyIncome: s.monthlyIncome,
    monthlyIncomeCurrency: s.monthlyIncomeCurrency,
    resetSpentOnFinalize: s.resetSpentOnFinalize,
    rates: s.rates,
    categories: s.categories,
    savings: s.savings,
    updatedAt: s.updatedAt,
    meta: s.meta,
  }
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/**
 * Normalize savings rows on load / import / remote pull:
 *  - drop the legacy derived `bank` field (computed on the fly now)
 *  - convert legacy "MM.YYYY" months → ISO "YYYY-MM"
 *  - coerce types (non-finite `saved` → 0, missing id → generated)
 *  - tag the currency, `fallbackCurrency` when absent (the document's own
 *    currency for legacy rows — see coerceCurrencyTag)
 *  - preserve per-entity sync metadata (updatedAt / deletedAt tombstone)
 */
export function migrateSavings(
  savings: unknown,
  fallbackCurrency: string = DEFAULT_CURRENCY,
): SavingsRow[] {
  if (!Array.isArray(savings)) return []
  const out: SavingsRow[] = []
  for (const row of savings) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<SavingsRow> & { bank?: number }
    const item: SavingsRow = {
      id: optionalString(r.id) ?? uid(),
      month: normalizeMonth(String(r.month ?? '')),
      saved: finiteNumber(r.saved),
      currency: coerceCurrencyTag(r.currency, fallbackCurrency),
    }
    const updatedAt = optionalString(r.updatedAt)
    const deletedAt = optionalString(r.deletedAt)
    if (updatedAt) item.updatedAt = updatedAt
    if (deletedAt) item.deletedAt = deletedAt
    out.push(item)
  }
  return out
}

/**
 * Sanitize categories from untrusted sources (import file, remote pull).
 * Guarantees every field has the right type so malformed data can never reach
 * the store, the UI or the merge logic. Malformed entries are dropped rather
 * than guessed at; a missing id gets a generated one. A missing currency tag
 * takes `fallbackCurrency` (the document's own currency for legacy data).
 */
export function migrateCategories(
  categories: unknown,
  fallbackCurrency: string = DEFAULT_CURRENCY,
): Category[] {
  if (!Array.isArray(categories)) return []
  const out: Category[] = []
  for (const row of categories) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<Category>
    const item: Category = {
      id: optionalString(r.id) ?? uid(),
      name: typeof r.name === 'string' ? r.name : '',
      budget: finiteNumber(r.budget),
      spent: finiteNumber(r.spent),
      currency: coerceCurrencyTag(r.currency, fallbackCurrency),
      done: Boolean(r.done),
    }
    const budgetExpr = optionalString(r.budgetExpr)
    const spentExpr = optionalString(r.spentExpr)
    const note = optionalString(r.note)
    const updatedAt = optionalString(r.updatedAt)
    const deletedAt = optionalString(r.deletedAt)
    if (budgetExpr) item.budgetExpr = budgetExpr
    if (spentExpr) item.spentExpr = spentExpr
    if (note) item.note = note
    if (r.ongoing === true) item.ongoing = true
    if (updatedAt) item.updatedAt = updatedAt
    if (deletedAt) item.deletedAt = deletedAt
    out.push(item)
  }
  return out
}

/** The pre-accounts single balance, as found on legacy documents. */
interface LegacyBalance {
  bank?: unknown
  bankExpr?: unknown
  bankCurrency?: unknown
  meta?: { bank?: unknown } | null
}

/**
 * Sanitize accounts from untrusted sources, or migrate the legacy single
 * balance into one. A document with an `accounts` array is taken as is (even an
 * empty one — two devices may each have deleted a different account); one
 * without (pre-accounts) gets a single MAIN_ACCOUNT_ID account carrying the old
 * `bank` / `bankExpr` / `bankCurrency` and stamped with the old `meta.bank`, so
 * the migration is deterministic and keeps the balance's sync timestamp.
 */
export function migrateAccounts(
  input: Partial<BudgetState> & LegacyBalance,
  fallbackCurrency: string = DEFAULT_CURRENCY,
): Account[] {
  if (Array.isArray(input.accounts)) {
    const out: Account[] = []
    for (const row of input.accounts as unknown[]) {
      if (!row || typeof row !== 'object') continue
      const r = row as Partial<Account>
      const item: Account = {
        id: optionalString(r.id) ?? uid(),
        name: typeof r.name === 'string' ? r.name : '',
        balance: finiteNumber(r.balance),
        currency: coerceCurrencyTag(r.currency, fallbackCurrency),
      }
      const balanceExpr = optionalString(r.balanceExpr)
      const updatedAt = optionalString(r.updatedAt)
      const deletedAt = optionalString(r.deletedAt)
      if (balanceExpr) item.balanceExpr = balanceExpr
      if (updatedAt) item.updatedAt = updatedAt
      if (deletedAt) item.deletedAt = deletedAt
      if (typeof r.order === 'number' && Number.isFinite(r.order)) item.order = r.order
      out.push(item)
    }
    return out
  }
  const legacy: Account = {
    id: MAIN_ACCOUNT_ID,
    name: '',
    balance: finiteNumber(input.bank),
    currency: coerceCurrencyTag(input.bankCurrency, fallbackCurrency),
  }
  const balanceExpr = optionalString(input.bankExpr)
  const updatedAt = optionalString(input.meta?.bank)
  if (balanceExpr) legacy.balanceExpr = balanceExpr
  if (updatedAt) legacy.updatedAt = updatedAt
  return [legacy]
}

function coerceMeta(meta: unknown): BudgetMeta {
  const m = (meta && typeof meta === 'object' ? meta : {}) as Partial<
    Record<keyof BudgetMeta, unknown>
  >
  return {
    incomeDay: stringOrNull(m.incomeDay),
    buffer: stringOrNull(m.buffer),
    currency: stringOrNull(m.currency),
    monthlyIncome: stringOrNull(m.monthlyIncome),
    resetSpentOnFinalize: stringOrNull(m.resetSpentOnFinalize),
    rates: stringOrNull(m.rates),
  }
}

/**
 * Shape an arbitrary partial document into a fully-typed BudgetState, filling
 * defaults and sanitizing every entity. Never throws — the single normalization
 * path for imports, remote pulls, replaceState and localStorage rehydrate.
 *
 * Currency tags: every amount comes out tagged. A document written before
 * per-amount currencies has none, and in it every amount was implicitly in the
 * document's own `currency` — so that is what a missing tag is filled with.
 * A pre-accounts document's single balance becomes one account (migrateAccounts).
 * Both are pure shape migrations: no timestamp is bumped.
 */
export function normalizeBudgetState(input: Partial<BudgetState> & LegacyBalance): BudgetState {
  const currency = coerceCurrency(input.currency)
  return {
    accounts: migrateAccounts(input, currency),
    incomeDay: finiteNumber(input.incomeDay) || defaultState.incomeDay,
    buffer: coerceBuffer(input.buffer),
    bufferCurrency: coerceCurrencyTag(input.bufferCurrency, currency),
    currency,
    monthlyIncome: coerceMonthlyIncome(input.monthlyIncome),
    monthlyIncomeCurrency: coerceCurrencyTag(input.monthlyIncomeCurrency, currency),
    resetSpentOnFinalize: coerceResetSpentOnFinalize(input.resetSpentOnFinalize),
    rates: coerceRates(input.rates),
    categories: migrateCategories(input.categories, currency),
    savings: migrateSavings(input.savings, currency),
    updatedAt: stringOrNull(input.updatedAt),
    meta: coerceMeta(input.meta),
  }
}

/**
 * Validate that a parsed JSON blob (e.g. from an import or remote pull)
 * looks like a BudgetState. Returns a fully-shaped object with defaults
 * filled in where missing; throws when the document is unrecognizable.
 */
export function coerceBudgetState(input: unknown): BudgetState {
  if (!input || typeof input !== 'object') {
    throw new Error('File is not a valid budget export')
  }
  const o = input as Partial<BudgetState> & LegacyBalance
  // `accounts` for current documents, `bank` for pre-accounts ones.
  if (!('accounts' in o || 'bank' in o) || !('categories' in o) || !('savings' in o)) {
    throw new Error('File is missing required fields')
  }
  return normalizeBudgetState(o)
}

/**
 * Coerce a persisted/imported buffer. `0` is a valid choice (no cushion), so we
 * distinguish "absent" (→ default) from an explicit 0; negatives are clamped.
 */
export function coerceBuffer(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_BUFFER
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : DEFAULT_BUFFER
}

/**
 * Coerce a persisted/imported monthly income. Unlike the buffer there is no
 * meaningful default: 0 means "not set" (pace indicator hidden), so anything
 * absent, non-numeric or negative collapses to 0.
 */
export function coerceMonthlyIncome(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/**
 * Coerce the persisted/imported "reset spent on finalize" preference. Only an
 * explicit boolean is honoured; anything absent, legacy or malformed falls back
 * to the default (true).
 */
export function coerceResetSpentOnFinalize(value: unknown): boolean {
  return typeof value === 'boolean' ? value : DEFAULT_RESET_SPENT_ON_FINALIZE
}

/**
 * Coerce an untrusted cached exchange-rate table (from an import or a remote
 * pull) into a valid ExchangeRates, or null when absent/unusable. Requires a
 * base code, a date and at least one positive finite value; junk entries are
 * dropped rather than trusted. Also used by lib/rates.ts to shape API payloads.
 */
export function coerceRates(value: unknown): ExchangeRates | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Partial<ExchangeRates>
  if (typeof o.base !== 'string' || o.base === '') return null
  if (typeof o.date !== 'string' || o.date === '') return null
  if (!o.values || typeof o.values !== 'object') return null
  const values: Record<string, number> = {}
  for (const [k, v] of Object.entries(o.values as Record<string, unknown>)) {
    const n = Number(v)
    if (k && Number.isFinite(n) && n > 0) values[k.toLowerCase()] = n
  }
  if (Object.keys(values).length === 0) return null
  return { base: o.base.toUpperCase(), date: o.date, values }
}
