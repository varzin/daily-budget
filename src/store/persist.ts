import type { BudgetState, SavingsRow } from '../types'
import { normalizeMonth } from '../lib/utils'

// Same key the vanilla app used — existing users' data is preserved.
export const STORAGE_KEY = 'budget_app_v1'

export const defaultState: BudgetState = {
  bank: 0,
  incomeDay: 26,
  categories: [],
  savings: [],
  updatedAt: null,
}

/**
 * Normalize savings rows on load / replace:
 *  - drop the legacy derived `bank` field (computed on the fly now)
 *  - convert legacy "MM.YYYY" months → ISO "YYYY-MM"
 */
export function migrateSavings(savings: unknown): SavingsRow[] {
  if (!Array.isArray(savings)) return []
  return savings.map((row) => {
    const r = row as Partial<SavingsRow> & { bank?: number }
    return {
      id: String(r.id ?? ''),
      month: normalizeMonth(String(r.month ?? '')),
      saved: Number(r.saved) || 0,
    }
  })
}

/**
 * Validate that a parsed JSON blob (e.g. from an import or remote pull)
 * looks like a BudgetState. Returns a fully-shaped object with defaults
 * filled in where missing.
 */
export function coerceBudgetState(input: unknown): BudgetState {
  if (!input || typeof input !== 'object') {
    throw new Error('File is not a valid budget export')
  }
  const o = input as Partial<BudgetState>
  if (!('bank' in o) || !('categories' in o) || !('savings' in o)) {
    throw new Error('File is missing required fields')
  }
  return {
    bank: Number(o.bank) || 0,
    incomeDay: Number(o.incomeDay) || defaultState.incomeDay,
    categories: Array.isArray(o.categories) ? o.categories : [],
    savings: migrateSavings(o.savings),
    updatedAt: o.updatedAt ?? null,
  }
}
