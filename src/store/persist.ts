import type { BudgetMeta, BudgetState, Category, SavingsRow } from '../types'
import { normalizeMonth, uid } from '../lib/utils'
import { coerceCurrency, DEFAULT_CURRENCY } from '../lib/currency'

// Same key the vanilla app used — existing users' data is preserved.
export const STORAGE_KEY = 'budget_app_v1'

/** Default green-zone cushion (€) when the user hasn't customized it. */
export const DEFAULT_BUFFER = 200

export const defaultState: BudgetState = {
  bank: 0,
  incomeDay: 26,
  buffer: DEFAULT_BUFFER,
  currency: DEFAULT_CURRENCY,
  categories: [],
  savings: [],
  updatedAt: null,
  meta: { bank: null, incomeDay: null, buffer: null, currency: null },
}

/** The synced/persisted data slice of the store — no action functions. */
export function selectBudgetState(s: BudgetState): BudgetState {
  return {
    bank: s.bank,
    incomeDay: s.incomeDay,
    buffer: s.buffer,
    currency: s.currency,
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
 *  - preserve per-entity sync metadata (updatedAt / deletedAt tombstone)
 */
export function migrateSavings(savings: unknown): SavingsRow[] {
  if (!Array.isArray(savings)) return []
  const out: SavingsRow[] = []
  for (const row of savings) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<SavingsRow> & { bank?: number }
    const item: SavingsRow = {
      id: optionalString(r.id) ?? uid(),
      month: normalizeMonth(String(r.month ?? '')),
      saved: finiteNumber(r.saved),
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
 * than guessed at; a missing id gets a generated one.
 */
export function migrateCategories(categories: unknown): Category[] {
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
    if (updatedAt) item.updatedAt = updatedAt
    if (deletedAt) item.deletedAt = deletedAt
    out.push(item)
  }
  return out
}

function coerceMeta(meta: unknown): BudgetMeta {
  const m = (meta && typeof meta === 'object' ? meta : {}) as Partial<
    Record<keyof BudgetMeta, unknown>
  >
  return {
    bank: stringOrNull(m.bank),
    incomeDay: stringOrNull(m.incomeDay),
    buffer: stringOrNull(m.buffer),
    currency: stringOrNull(m.currency),
  }
}

/**
 * Shape an arbitrary partial document into a fully-typed BudgetState, filling
 * defaults and sanitizing every entity. Never throws — the single normalization
 * path for imports, remote pulls and replaceState.
 */
export function normalizeBudgetState(input: Partial<BudgetState>): BudgetState {
  return {
    bank: finiteNumber(input.bank),
    incomeDay: finiteNumber(input.incomeDay) || defaultState.incomeDay,
    buffer: coerceBuffer(input.buffer),
    currency: coerceCurrency(input.currency),
    categories: migrateCategories(input.categories),
    savings: migrateSavings(input.savings),
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
  const o = input as Partial<BudgetState>
  if (!('bank' in o) || !('categories' in o) || !('savings' in o)) {
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
