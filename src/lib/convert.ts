/**
 * Per-amount currencies (CLAUDE.md "Валюта у сумм / валюта отображения"). Every
 * stored amount carries the currency it was entered in; the store's `currency`
 * is only the DISPLAY currency. This module converts between them at today's
 * cached rates — pure and store-free, so the store, the math and the UI can all
 * use it without an import cycle (lib/rates.ts holds the IO/React side).
 *
 * The math in lib/math.ts stays currency-agnostic: callers project the data
 * into one currency here first, then run the usual formulas on plain numbers.
 */
import type { BudgetState, Category, ExchangeRates, SavingsRow } from '../types'
import { SYMBOL_TO_CODE } from './currency'
import { computeFinalize, obligatoryTotal, reservedSavingsPool, roundThreshold } from './math'

/**
 * A resolver maps a currency token — an ISO code ("AMD"), a lowercase code, or
 * a symbol ("$") — to the multiplier that converts one unit of it into the
 * resolver's target currency. Returns null when the token can't be resolved
 * (unknown code, or no rates cached yet), which makes a formula invalid rather
 * than silently wrong.
 */
export type RateResolver = (token: string) => number | null

/**
 * Build a resolver from the cached rates into `target`.
 *
 * The target currency always resolves (to 1) even with no rates cached — an
 * amount already in it is an identity. Every other currency needs the table.
 * Because `values` expresses every listed currency in terms of `base`, any pair
 * converts via the base as a cross-rate, so `base` need not equal the target.
 */
export function makeRateResolver(rates: ExchangeRates | null, target: string): RateResolver {
  const cc = (target || '').toUpperCase()
  return (token: string): number | null => {
    const sym = SYMBOL_TO_CODE.get(token)
    const code = (sym ?? token).toUpperCase()
    if (code === cc) return 1
    if (!rates) return null
    const base = rates.base.toUpperCase()
    // Value of 1 unit of X expressed in `base` units (null if X is unknown).
    const inBase = (x: string): number | null => {
      if (x === base) return 1
      const v = rates.values[x.toLowerCase()]
      return typeof v === 'number' && v > 0 ? 1 / v : null
    }
    const a = inBase(code)
    const b = inBase(cc)
    if (a === null || b === null) return null
    return a / b
  }
}

/**
 * Convert `amount` from one currency to another. Same currency is an exact
 * identity; a zero amount needs no rate. Null when no rate is available.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates | null,
): number | null {
  const n = Number(amount) || 0
  if (n === 0) return 0
  const r = makeRateResolver(rates, to)(from)
  return r === null ? null : n * r
}

/**
 * A converter into one target currency that never fails: an amount whose
 * currency has no rate is taken 1:1 and its code is recorded in `missing`, so
 * the UI can warn instead of silently showing a wrong total.
 */
export interface Converter {
  to: string
  conv: (amount: number, from: string) => number
  missing: Set<string>
}

export function makeConverter(rates: ExchangeRates | null, to: string): Converter {
  const resolve = makeRateResolver(rates, to)
  const missing = new Set<string>()
  return {
    to,
    missing,
    conv: (amount, from) => {
      const n = Number(amount) || 0
      if (n === 0) return 0
      const r = resolve(from)
      if (r === null) {
        missing.add(from.toUpperCase())
        return n
      }
      return n * r
    },
  }
}

/** Categories with budget/spent converted into the converter's currency. */
export function convertCategories(categories: Category[], c: Converter): Category[] {
  return categories.map((cat) =>
    cat.currency === c.to
      ? cat
      : {
          ...cat,
          budget: c.conv(cat.budget, cat.currency),
          spent: c.conv(cat.spent, cat.currency),
          currency: c.to,
        },
  )
}

/** Savings rows with `saved` converted into the converter's currency. */
export function convertSavings(savings: SavingsRow[], c: Converter): SavingsRow[] {
  return savings.map((row) =>
    row.currency === c.to ? row : { ...row, saved: c.conv(row.saved, row.currency), currency: c.to },
  )
}

/** Every amount the dashboard / tables need, expressed in the display currency. */
export interface DisplayBudget {
  currency: string
  bank: number
  buffer: number
  monthlyIncome: number
  categories: Category[]
  savings: SavingsRow[]
  /** Currencies that had no rate — their amounts were taken 1:1 (see Converter). */
  missing: string[]
}

export type AmountSource = Pick<
  BudgetState,
  | 'currency'
  | 'bank'
  | 'bankCurrency'
  | 'buffer'
  | 'bufferCurrency'
  | 'monthlyIncome'
  | 'monthlyIncomeCurrency'
  | 'categories'
  | 'savings'
>

/**
 * Project every stored amount into the display currency at today's cached
 * rates. With a single currency everywhere this is an exact identity, so the
 * single-currency app behaves exactly as before.
 */
export function projectToDisplay(s: AmountSource, rates: ExchangeRates | null): DisplayBudget {
  const c = makeConverter(rates, s.currency)
  return {
    currency: s.currency,
    bank: c.conv(s.bank, s.bankCurrency),
    buffer: c.conv(s.buffer, s.bufferCurrency),
    monthlyIncome: c.conv(s.monthlyIncome, s.monthlyIncomeCurrency),
    categories: convertCategories(s.categories, c),
    savings: convertSavings(s.savings, c),
    missing: [...c.missing].sort(),
  }
}

/**
 * "Finalize month" in the BALANCE's currency: saved = bank − the prior pool,
 * with every prior row converted into the bank's currency. The new row is
 * tagged with that currency, so while the rows share the bank's currency the
 * running total still equals the bank balance exactly, free of FX noise.
 * `month` excludes the row being overwritten (see computeFinalize).
 */
export function computeFinalizeIn(
  bank: number,
  bankCurrency: string,
  savings: SavingsRow[],
  rates: ExchangeRates | null,
  month?: string,
): { prevPool: number; saved: number; currency: string; missing: string[] } {
  const c = makeConverter(rates, bankCurrency)
  // convertSavings keeps order and length, so the overwritten row is the same.
  const { prevPool, saved } = computeFinalize(bank, convertSavings(savings, c), month)
  return { prevPool, saved, currency: bankCurrency, missing: [...c.missing].sort() }
}

/**
 * The currency the app's fixed thresholds were calibrated in (savings tiers
 * 500/200/1, the ±1 "on plan" band). They are scaled into the display currency
 * so "500" keeps meaning "a good month" in drams too.
 */
export const THRESHOLD_CURRENCY = 'EUR'

/** Display-currency units per 1 THRESHOLD_CURRENCY unit (1 when no rate). */
export function thresholdScale(rates: ExchangeRates | null, to: string): number {
  return convert(1, THRESHOLD_CURRENCY, to, rates) ?? 1
}

/** One illustrated line of the display-currency switch preview. */
export interface SwitchPreviewRow {
  key: 'balance' | 'fixed' | 'savings' | 'sample'
  /** What the amount is shown as today (its own currency for the balance). */
  from: { amount: number; currency: string }
  /** What it will be shown as after the switch, in the new display currency. */
  to: { amount: number; currency: string }
}

export interface SwitchPreview {
  from: string
  to: string
  /** 1 `from` = `rate` `to`; null when the rates can't convert the pair. */
  rate: number | null
  rows: SwitchPreviewRow[]
  /** Currencies that couldn't be converted into `to` — counted 1:1 after the switch. */
  missing: string[]
}

/**
 * What switching the display currency to `to` will look like, illustrated on
 * the user's own figures (CLAUDE.md "Валюта у сумм"): the balance in its own
 * currency, and the fixed-expense and savings totals as shown today, each next
 * to the value it will be shown as afterwards. Nothing here changes data — the
 * switch itself only re-labels the display. With no figures to show yet, a
 * round sample amount (≈ 100 € worth) illustrates the conversion instead.
 */
export function previewCurrencySwitch(
  s: AmountSource,
  to: string,
  rates: ExchangeRates | null,
): SwitchPreview {
  const from = s.currency
  const before = projectToDisplay(s, rates)
  const after = projectToDisplay({ ...s, currency: to }, rates)
  const rate = convert(1, from, to, rates)
  const rows: SwitchPreviewRow[] = []

  if (s.bank !== 0) {
    rows.push({
      key: 'balance',
      from: { amount: s.bank, currency: s.bankCurrency },
      to: { amount: after.bank, currency: to },
    })
  }
  const fixedBefore = obligatoryTotal(before.categories)
  if (fixedBefore !== 0) {
    rows.push({
      key: 'fixed',
      from: { amount: fixedBefore, currency: from },
      to: { amount: obligatoryTotal(after.categories), currency: to },
    })
  }
  const poolBefore = reservedSavingsPool(before.savings)
  if (poolBefore !== 0) {
    rows.push({
      key: 'savings',
      from: { amount: poolBefore, currency: from },
      to: { amount: reservedSavingsPool(after.savings), currency: to },
    })
  }
  if (rows.length === 0 && rate !== null) {
    const sample = roundThreshold(100 * thresholdScale(rates, from))
    rows.push({
      key: 'sample',
      from: { amount: sample, currency: from },
      to: { amount: sample * rate, currency: to },
    })
  }

  const missing = new Set(after.missing)
  if (rate === null) missing.add(from.toUpperCase())
  return {
    from,
    to,
    rate,
    // A row converted 1:1 for want of a rate would illustrate a wrong figure —
    // show none until every rate is there (the caller warns via `missing`).
    rows: missing.size > 0 ? [] : rows,
    missing: [...missing].sort(),
  }
}
