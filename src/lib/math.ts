import type { Category, SavingsRow } from '../types'
import { round2 } from './utils'

export type BudgetResult =
  | { kind: 'ok'; perDay: number }
  | { kind: 'deficit'; deficit: number; daysNoSpend: number }

export type SavedIndicator = 'blue' | 'green' | 'yellow' | 'red'

function safeDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

/**
 * The day income actually arrives this month: day 29–31 clamps to the last day
 * of shorter months (matching safeDate). Comparisons of "has income come yet"
 * must use this, not the raw incomeDay — otherwise the last day of a short
 * month reads as "income still ahead" and the cycle maths collapses to 1 day.
 */
function effectiveIncomeDay(incomeDay: number, y: number, m: number): number {
  return Math.min(incomeDay, new Date(y, m + 1, 0).getDate())
}

/** Days until next income day; if today is on/after it, count to next month. */
export function computeDaysLeft(incomeDay: number, today: Date = new Date()): number {
  if (!incomeDay || incomeDay < 1 || incomeDay > 31) return 0

  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  let target: Date
  if (d < effectiveIncomeDay(incomeDay, y, m)) {
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

/**
 * Length of the current income cycle in days: from the previous income day to
 * the next one (28–31 depending on the months involved). Companion to
 * computeDaysLeft, which counts the remaining part of the same cycle.
 */
export function computeCycleLength(incomeDay: number, today: Date = new Date()): number {
  if (!incomeDay || incomeDay < 1 || incomeDay > 31) return 0

  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  const upcoming = d < effectiveIncomeDay(incomeDay, y, m)
  const prev = upcoming ? safeDate(y, m - 1, incomeDay) : safeDate(y, m, incomeDay)
  const next = upcoming ? safeDate(y, m, incomeDay) : safeDate(y, m + 1, incomeDay)

  const msPerDay = 24 * 60 * 60 * 1000
  const startOfPrev = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()).getTime()
  const startOfNext = new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime()
  return Math.max(1, Math.round((startOfNext - startOfPrev) / msPerDay))
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

export type PaceState = 'green' | 'orange' | 'red'

export interface CategoryPace {
  /** Bar fill: share of the budget already spent, clamped to 0..1. */
  spentRatio: number
  /** Day marker: share of the pay period elapsed, clamped to 0..1. */
  elapsed: number
  /**
   * Colour of the fill. Compares actual spend against the elapsed pace:
   * green while spending keeps up with (or under) the calendar, orange when
   * it runs moderately ahead, red when it runs well ahead — so a full bar in
   * mid-cycle reads as "you've burned the whole month's budget already".
   */
  state: PaceState
}

/**
 * Spending pace for an "ongoing" fixed expense — the money for it is meant to
 * be spread across the whole pay period, so we compare spent/budget against how
 * much of the cycle has elapsed. Returns null when there's nothing to measure
 * (no budget, or no income day set). The over-pace comparison uses the *raw*
 * (uncapped) spent ratio so overspending past 100% still reads red.
 */
export function computeCategoryPace(
  cat: Category,
  incomeDay: number,
  today: Date = new Date(),
): CategoryPace | null {
  const budget = Number(cat.budget) || 0
  if (budget <= 0) return null
  const cycle = computeCycleLength(incomeDay, today)
  if (cycle <= 0) return null

  // daysLeft is in [1, cycle] (== cycle on payday), so cycle − daysLeft is
  // naturally in [0, cycle); the single [0,1] clamp is just cheap insurance for
  // the CSS marker position, not a real branch.
  const daysLeft = computeDaysLeft(incomeDay, today)
  const elapsed = Math.max(0, Math.min(1, (cycle - daysLeft) / cycle))

  const rawSpentRatio = (Number(cat.spent) || 0) / budget
  const spentRatio = Math.max(0, Math.min(1, rawSpentRatio))

  const over = rawSpentRatio - elapsed
  const state: PaceState = over <= 0.1 ? 'green' : over <= 0.25 ? 'orange' : 'red'

  return { spentRatio, elapsed, state }
}

/**
 * The full fixed-expense plan for the cycle: the sum of category budgets,
 * regardless of what's been spent or marked paid (a paid bill is still part of
 * the month's plan). Tombstoned categories are excluded. This is the baseline
 * the pace indicator measures against, unlike obligatoryTotal which is the
 * remaining-to-pay amount.
 */
export function plannedObligatoryTotal(categories: Category[]): number {
  return categories.reduce(
    (sum, c) => sum + (c.deletedAt ? 0 : Math.max(0, Number(c.budget) || 0)),
    0,
  )
}

export function currentSavingsTotal(savings: SavingsRow[]): number {
  if (!savings || savings.length === 0) return 0
  return savings.reduce((sum, row) => sum + (row.deletedAt ? 0 : Number(row.saved) || 0), 0)
}

/**
 * The savings pool as the dashboard reserves it: the cumulative total clamped
 * at zero. History may be net negative (overspent months are recorded
 * honestly), but a negative reserve would tell the daily budget to spend more
 * than the bank holds and break the situation ordering (bank − oblig − pool
 * would exceed bank − oblig). Finalize keeps using the signed total
 * (computeFinalize) so the ledger itself stays truthful.
 */
export function reservedSavingsPool(savings: SavingsRow[]): number {
  return Math.max(0, currentSavingsTotal(savings))
}

/**
 * The row "Finalize month" overwrites for `month`: the first live row of that
 * month, or -1 when there is none (a new row is appended). Single source for
 * the store action and computeFinalize, so both agree on which row it is.
 */
export function finalizeTargetIndex(savings: SavingsRow[], month: string): number {
  return savings.findIndex((r) => r.month === month && !r.deletedAt)
}

/**
 * What "Finalize month" will record: this month's savings as the current
 * balance minus what was already set aside in prior months. Fixed expenses are
 * deliberately NOT subtracted — the recorded figure is what actually remained,
 * not what would remain after hypothetical unpaid bills. This makes the running
 * "balance at end" equal the real bank balance at each finalize, so "saved this
 * month" reads as the genuine month-over-month change (≈ income − all spending).
 * Single source for both the store action and the confirmation preview.
 *
 * With `month`, the row that finalize will overwrite (finalizeTargetIndex) is
 * left out of the prior pool — it is being replaced, not carried over —
 * so re-finalizing a month still lands the running total on the bank balance
 * and finalizing twice records the same figure.
 */
export function computeFinalize(
  bank: number,
  savings: SavingsRow[],
  month?: string,
): { prevPool: number; saved: number } {
  const target = month === undefined ? -1 : finalizeTargetIndex(savings, month)
  const prior = target >= 0 ? savings.filter((_, i) => i !== target) : savings
  const prevPool = currentSavingsTotal(prior)
  const saved = round2((Number(bank) || 0) - prevPool)
  return { prevPool, saved }
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

/**
 * The three spending modes the dashboard widget can feature as tabs, ordered
 * strictest → loosest. Each successive mode stops reserving one more thing
 * (cushion, then savings), so its daily figure is always ≥ the previous one.
 */
export const WIDGET_MODES = ['ahead', 'onTrack', 'intoSavings'] as const
export type WidgetMode = (typeof WIDGET_MODES)[number]

/**
 * Which widget modes are selectable for a situation: a mode is available when
 * its daily figure is ≥ 0, which — since the figures only grow down the list —
 * is exactly the current situation's mode and everything looser. Empty when
 * even fixed expenses aren't covered (deficit: the widget shows the fourth,
 * tab-less "over" card instead).
 */
export function availableWidgetModes(state: SituationState): WidgetMode[] {
  if (state === 'over') return []
  return WIDGET_MODES.slice(WIDGET_MODES.indexOf(state))
}

export interface Pace {
  /** The planned daily rate: (income − planned fixed − cushion) / cycle length. */
  perDayPlan: number
  /** The actual allowable daily rate today — same formula as the green zone. */
  perDayActual: number
  /**
   * Money ahead (+) / behind (−) of plan: (actual − plan) × days left, i.e.
   * how much extra can be spent before the next income while staying on plan.
   */
  ahead: number
}

/**
 * Pace indicator (CLAUDE.md "Future ideas" #2): compare the actual allowable
 * daily rate against the planned one derived from the optional monthly income.
 * Stateless on purpose — no snapshots or anchors, so a corrected balance or a
 * mid-day re-entry instantly re-derives the result like everything else.
 * Returns null when the income isn't set (0) or the cycle maths is degenerate.
 */
export function computePace(args: {
  bank: number
  /** Remaining fixed expenses (obligatoryTotal). */
  oblig: number
  /** Full fixed-expense plan for the cycle (plannedObligatoryTotal). */
  plannedOblig: number
  savingsPool: number
  buffer: number
  monthlyIncome: number
  daysLeft: number
  cycleDays: number
}): Pace | null {
  const { bank, oblig, plannedOblig, savingsPool, buffer, monthlyIncome, daysLeft, cycleDays } = args
  if (!(monthlyIncome > 0) || daysLeft <= 0 || cycleDays <= 0) return null

  const perDayPlan = (monthlyIncome - plannedOblig - buffer) / cycleDays
  const perDayActual = (bank - oblig - savingsPool - buffer) / daysLeft
  return {
    perDayPlan,
    perDayActual,
    ahead: round2((perDayActual - perDayPlan) * daysLeft),
  }
}

/** Lower bounds of the savings tiers (blue ≥ green ≥ yellow; below → red). */
export interface SavedThresholds {
  blue: number
  green: number
  yellow: number
}

/** The tiers as calibrated, in THRESHOLD_CURRENCY (lib/convert.ts). */
export const BASE_SAVED_THRESHOLDS: SavedThresholds = { blue: 500, green: 200, yellow: 1 }

/**
 * Round a scaled threshold to two significant digits, so a converted tier reads
 * as a round figure in the legend (֏220 000, not ֏215 431.87) and the logic
 * uses exactly what the legend shows. Also picks round sample amounts.
 */
export function roundThreshold(n: number): number {
  if (!(n > 0)) return 0
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1)
  return Math.round(n / mag) * mag
}

/**
 * The savings tiers in the display currency: `scale` is display units per one
 * calibration unit (thresholdScale in lib/convert.ts). Scale 1 returns the
 * calibrated values unchanged.
 */
export function savedThresholds(scale: number = 1): SavedThresholds {
  if (scale === 1 || !(scale > 0)) return BASE_SAVED_THRESHOLDS
  return {
    blue: roundThreshold(BASE_SAVED_THRESHOLDS.blue * scale),
    green: roundThreshold(BASE_SAVED_THRESHOLDS.green * scale),
    yellow: roundThreshold(BASE_SAVED_THRESHOLDS.yellow * scale),
  }
}

export function savedIndicator(
  saved: number,
  thresholds: SavedThresholds = BASE_SAVED_THRESHOLDS,
): SavedIndicator {
  const v = Number(saved) || 0
  if (v >= thresholds.blue) return 'blue'
  if (v >= thresholds.green) return 'green'
  if (v >= thresholds.yellow) return 'yellow'
  return 'red'
}

/**
 * Whether a pace result is close enough to the plan to read "on plan": within
 * one calibration unit (±1 € by default), scaled into the display currency.
 */
export function isOnPlan(ahead: number, scale: number = 1): boolean {
  const band = scale > 0 ? scale : 1
  return Math.abs(Number(ahead) || 0) < band
}

/** Inputs of the dashboard, every amount already in ONE currency (lib/convert.ts). */
export interface DashboardInput {
  bank: number
  buffer: number
  monthlyIncome: number
  incomeDay: number
  categories: Category[]
  savings: SavingsRow[]
}

export interface DashboardFigures {
  bank: number
  buffer: number
  oblig: number
  savingsPool: number
  daysLeft: number
  withoutSavings: number
  afterObligNoSavings: number
  afterObligAll: number
  greenPerDay: number
  yellowPerDay: number
  allPerDay: number
  situation: Situation
  paceGrow: Pace | null
  paceKeep: Pace | null
  paceSpend: Pace | null
}

/**
 * Every figure the dashboard shows, from amounts in a single currency. Pure, so
 * the whole widget/breakdown maths is unit-testable.
 */
export function computeDashboard(input: DashboardInput, today: Date = new Date()): DashboardFigures {
  const b = Number(input.bank) || 0
  const buffer = Number(input.buffer) || 0
  const oblig = obligatoryTotal(input.categories)
  const savingsPool = reservedSavingsPool(input.savings)
  const daysLeft = computeDaysLeft(Number(input.incomeDay), today)
  const perDay = (available: number) => (daysLeft > 0 ? available / daysLeft : 0)

  // Pace is measured against the selected tab's goal, i.e. the free balance
  // it aims to land on by the next income day: savings + cushion (grow),
  // savings (keep), or zero — savings spent too (spend). computePace's
  // buffer term is exactly `target − savingsPool`, so the three goals map to
  // buffer / 0 / −savingsPool.
  const paceArgs = {
    bank: b,
    oblig,
    plannedOblig: plannedObligatoryTotal(input.categories),
    savingsPool,
    monthlyIncome: Number(input.monthlyIncome) || 0,
    daysLeft,
    cycleDays: computeCycleLength(Number(input.incomeDay), today),
  }

  return {
    bank: b,
    buffer,
    oblig,
    savingsPool,
    daysLeft,
    withoutSavings: b - savingsPool,
    afterObligNoSavings: b - oblig - savingsPool,
    afterObligAll: b - oblig,
    greenPerDay: perDay(b - oblig - savingsPool - buffer),
    yellowPerDay: perDay(b - oblig - savingsPool),
    allPerDay: perDay(b - oblig),
    situation: computeSituation(b, oblig, savingsPool, buffer, daysLeft),
    paceGrow: computePace({ ...paceArgs, buffer }),
    paceKeep: computePace({ ...paceArgs, buffer: 0 }),
    paceSpend: computePace({ ...paceArgs, buffer: -savingsPool }),
  }
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
