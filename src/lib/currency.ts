import { fmt, fmtAmount } from './utils'

/**
 * Currency selection (CLAUDE.md "Выбор валюты"). We keep a short curated list of
 * ISO 4217 *codes*; everything else (symbol, fraction digits, display name) is
 * derived from the platform `Intl` data so it's always correct and needs no
 * hand-maintenance. Adding a currency = adding its code below.
 *
 * Number grouping follows the *device* locale (navigator.language), not the
 * currency — the currency only decides the symbol and how many decimals. The app
 * renders the symbol as a prefix separate from the number (a stylistic choice),
 * so the formatters here return just the grouped number.
 */
export const CURRENCY_CODES = [
  'EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CAD', 'AUD', 'JPY',
  'AMD', 'RUB', 'GEL', 'UAH', 'TRY', 'KZT', 'CZK', 'SEK',
  'NOK', 'DKK', 'HUF', 'CNY', 'ILS', 'INR', 'AED',
] as const

export const DEFAULT_CURRENCY = 'EUR'

export interface Currency {
  code: string
  symbol: string
  decimals: number
  /** Localized display name, e.g. "US Dollar". */
  name: string
}

function intlSymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? code
  } catch {
    return code
  }
}

function intlDecimals(code: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

function intlName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

function buildCurrency(code: string): Currency {
  return { code, symbol: intlSymbol(code), decimals: intlDecimals(code), name: intlName(code) }
}

/** The curated set, with Intl-derived display data — used to render the picker. */
export const CURRENCIES: Currency[] = CURRENCY_CODES.map(buildCurrency)

const CODE_SET = new Set<string>(CURRENCY_CODES)
const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]))

/** A well-formed ISO 4217 code (three uppercase letters). */
export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value)
}

/**
 * Look up a currency by code. A well-formed code outside the curated picker set
 * (e.g. an amount tagged on another device) is built from Intl on demand rather
 * than shown with the default's symbol; anything malformed falls back to the
 * default.
 */
export function getCurrency(code: string | null | undefined): Currency {
  if (code) {
    const known = BY_CODE.get(code)
    if (known) return known
    if (isCurrencyCode(code)) {
      const built = buildCurrency(code)
      BY_CODE.set(code, built)
      return built
    }
  }
  return BY_CODE.get(DEFAULT_CURRENCY)!
}

/**
 * Coerce a persisted/imported *display* currency code (the picker in Settings),
 * defaulting when absent/unknown.
 */
export function coerceCurrency(value: unknown): string {
  return typeof value === 'string' && CODE_SET.has(value) ? value : DEFAULT_CURRENCY
}

/**
 * Coerce the currency an amount is denominated in (CLAUDE.md "Валюта у сумм").
 * Any well-formed ISO code is honoured — the rates table covers far more than
 * the picker — and anything absent or malformed takes `fallback`. For legacy
 * data the fallback is the document's own currency: before per-amount tags
 * every amount was implicitly in it, so that is exactly what a missing tag means.
 */
export function coerceCurrencyTag(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const code = value.toUpperCase()
    if (isCurrencyCode(code)) return code
  }
  return fallback
}

/**
 * Curated map of currency *symbols* → ISO code, for writing amounts inside a
 * formula (e.g. "10 ₽"). Only unambiguous single-character symbols are listed —
 * ISO codes ("10 RUB") remain the primary, unambiguous path. Deliberate
 * compromises: `$` → USD (the most common of many dollar currencies) and `¥` →
 * JPY (over CNY). For anything else, type the three-letter code.
 */
export const SYMBOL_TO_CODE = new Map<string, string>([
  ['€', 'EUR'],
  ['$', 'USD'],
  ['£', 'GBP'],
  ['¥', 'JPY'],
  ['₽', 'RUB'],
  ['₴', 'UAH'],
  ['₺', 'TRY'],
  ['₹', 'INR'],
  ['₩', 'KRW'],
  ['₪', 'ILS'],
  ['฿', 'THB'],
  ['₫', 'VND'],
  ['₦', 'NGN'],
  ['₱', 'PHP'],
  ['₸', 'KZT'],
  ['₾', 'GEL'],
  ['֏', 'AMD'],
])

/** The device's locale, used for number grouping (independent of currency). */
export function deviceLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
  return 'en'
}

export interface Money {
  code: string
  symbol: string
  decimals: number
  locale: string
  /** Grouped number with the currency's decimals (no symbol). */
  fmt: (n: number) => string
  /** Grouped number without forced decimals (no symbol). */
  fmtAmount: (n: number) => string
}

/**
 * Build symbol + formatters for a currency code (non-React contexts). Number
 * grouping uses `locale` (the device locale by default); the currency supplies
 * the symbol and decimal count.
 */
export function money(code: string | null | undefined, locale: string = deviceLocale()): Money {
  const c = getCurrency(code)
  return {
    code: c.code,
    symbol: c.symbol,
    decimals: c.decimals,
    locale,
    fmt: (n: number) => fmt(n, locale, c.decimals),
    fmtAmount: (n: number) => fmtAmount(n, locale, c.decimals),
  }
}
