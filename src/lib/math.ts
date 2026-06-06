import type { Category, SavingsRow } from '../types'

export type BudgetResult =
  | { kind: 'ok'; perDay: number }
  | { kind: 'deficit'; deficit: number; daysNoSpend: number }

export type SavedIndicator = 'blue' | 'green' | 'yellow' | 'red'

function safeDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

/** Days until next income day; if today is on/after it, count to next month. */
export function computeDaysLeft(incomeDay: number, today: Date = new Date()): number {
  if (!incomeDay || incomeDay < 1 || incomeDay > 31) return 0

  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  let target: Date
  if (d < incomeDay) {
    target = safeDate(y, m, incomeDay)
  } else {
    target = safeDate(y, m + 1, incomeDay)
  }

  const msPerDay = 24 * 60 * 60 * 1000
  const startOfToday = new Date(y, m, d).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diff = Math.round((startOfTarget - startOfToday) / msPerDay)
  return Math.max(1, diff)
}

export function categoryAmount(cat: Category): number {
  if (cat.done || cat.deletedAt) return 0
  const budget = Number(cat.budget) || 0
  const spent = Number(cat.spent) || 0
  return Math.max(0, budget - spent)
}

export function obligatoryTotal(categories: Category[]): number {
  return categories.reduce((sum, c) => sum + categoryAmount(c), 0)
}

export function currentSavingsTotal(savings: SavingsRow[]): number {
  if (!savings || savings.length === 0) return 0
  return savings.reduce((sum, row) => sum + (row.deletedAt ? 0 : Number(row.saved) || 0), 0)
}

/** Per-row cumulative balance: balance[i] = balance[i-1] + saved[i], starting from 0. */
export function computeBalances(savings: SavingsRow[]): number[] {
  let prev = 0
  return (savings || []).map(row => {
    const bank = prev + (Number(row.saved) || 0)
    prev = bank
    return bank
  })
}

export function perDayYellow(
  bank: number,
  oblig: number,
  savingsPool: number,
  daysLeft: number
): BudgetResult {
  const available = bank - oblig - savingsPool
  return budgetResult(available, daysLeft)
}

export function perDayGreen(
  bank: number,
  oblig: number,
  savingsPool: number,
  daysLeft: number,
  greenBuffer: number = 200
): BudgetResult {
  const available = bank - oblig - savingsPool - greenBuffer
  return budgetResult(available, daysLeft)
}

export function perDayAll(bank: number, oblig: number, daysLeft: number): BudgetResult {
  const available = bank - oblig
  return budgetResult(available, daysLeft)
}

/**
 * The four situational states for the single dashboard widget (CLAUDE.md
 * "Future ideas" #3), ordered best → worst:
 *  - `ahead`       — can keep the full buffer/cushion and still spend (teal);
 *  - `onTrack`     — savings stay whole, but not the full cushion (green);
 *  - `intoSavings` — fixed expenses covered, but spending dips into savings (orange);
 *  - `over`        — can't even cover fixed expenses (red, deficit).
 */
export type SituationState = 'ahead' | 'onTrack' | 'intoSavings' | 'over'

export interface Situation {
  state: SituationState
  /** The daily figure to feature for this state (perDay when ok, else deficit). */
  result: BudgetResult
}

/**
 * Pick the situational state and the single daily number that best describes it.
 * Each state features the largest daily spend that still respects its boundary,
 * so the headline figure is always actionable for where the user actually is.
 */
export function computeSituation(
  bank: number,
  oblig: number,
  savingsPool: number,
  buffer: number,
  daysLeft: number,
): Situation {
  const afterBuffer = bank - oblig - savingsPool - buffer
  const afterSavings = bank - oblig - savingsPool
  const afterFixed = bank - oblig

  if (afterBuffer >= 0) {
    return { state: 'ahead', result: perDayGreen(bank, oblig, savingsPool, daysLeft, buffer) }
  }
  if (afterSavings >= 0) {
    return { state: 'onTrack', result: perDayYellow(bank, oblig, savingsPool, daysLeft) }
  }
  // Below the savings line: feature the "spend everything" figure — it's an ok
  // perDay while fixed expenses are still covered, and a deficit once they're not.
  return { state: afterFixed >= 0 ? 'intoSavings' : 'over', result: perDayAll(bank, oblig, daysLeft) }
}

export function savedIndicator(saved: number): SavedIndicator {
  const v = Number(saved) || 0
  if (v >= 500) return 'blue'
  if (v >= 200) return 'green'
  if (v >= 1) return 'yellow'
  return 'red'
}

/** Positive available → per-day; negative → deficit with daysLeft as the no-spend window. */
function budgetResult(available: number, daysLeft: number): BudgetResult {
  if (daysLeft <= 0) {
    return { kind: 'ok', perDay: 0 }
  }
  if (available >= 0) {
    return { kind: 'ok', perDay: available / daysLeft }
  }
  return {
    kind: 'deficit',
    deficit: Math.abs(available),
    daysNoSpend: daysLeft
  }
}
