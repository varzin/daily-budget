import { fmt, fmtAmount } from './utils'

/**
 * Currency selection (CLAUDE.md "Выбор валюты"). The chosen currency is a synced
 * scalar on the budget store; this module is the single source of truth for the
 * supported set and for turning a code into a symbol + locale-aware formatters.
 *
 * The app renders the symbol as a *prefix* separate from the number (a stylistic
 * choice predating this feature), so the formatters here return only the grouped
 * number — components prepend `symbol`.
 */
export interface Currency {
  code: string
  symbol: string
  /** Locale used for number grouping/decimals (e.g. "1.234,56" vs "1,234.56"). */
  locale: string
  decimals: number
  label: string
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', locale: 'de-DE', decimals: 2, label: 'Euro' },
  { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2, label: 'US Dollar' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', decimals: 2, label: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', locale: 'de-CH', decimals: 2, label: 'Swiss Franc' },
  { code: 'PLN', symbol: 'zł', locale: 'pl-PL', decimals: 2, label: 'Polish Złoty' },
  { code: 'CAD', symbol: 'C$', locale: 'en-CA', decimals: 2, label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU', decimals: 2, label: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0, label: 'Japanese Yen' },
]

export const DEFAULT_CURRENCY = 'EUR'

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]))

/** Look up a currency by code, falling back to the default for unknown codes. */
export function getCurrency(code: string | null | undefined): Currency {
  return (code && BY_CODE.get(code)) || BY_CODE.get(DEFAULT_CURRENCY)!
}

/** Coerce a persisted/imported currency code, defaulting when absent/unknown. */
export function coerceCurrency(value: unknown): string {
  return typeof value === 'string' && BY_CODE.has(value) ? value : DEFAULT_CURRENCY
}

export interface Money {
  code: string
  symbol: string
  locale: string
  decimals: number
  /** Grouped number with fixed decimals (no symbol). */
  fmt: (n: number) => string
  /** Grouped number without forced decimals (no symbol). */
  fmtAmount: (n: number) => string
}

/** Build symbol + formatters for a currency code (non-React contexts). */
export function money(code: string | null | undefined): Money {
  const c = getCurrency(code)
  return {
    code: c.code,
    symbol: c.symbol,
    locale: c.locale,
    decimals: c.decimals,
    fmt: (n: number) => fmt(n, c.locale, c.decimals),
    fmtAmount: (n: number) => fmtAmount(n, c.locale, c.decimals),
  }
}
