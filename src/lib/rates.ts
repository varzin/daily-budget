/**
 * Currency-in-formula support (CLAUDE.md "Валюта в формулах"). Lets the user
 * write a foreign amount inside any amount field — "10 AMD", "$10", "10 ₽" — and
 * have it converted to the app's default currency when the formula is evaluated.
 *
 * Rates come from the free, keyless, no-signup fawazahmed0 currency-api served
 * over the jsdelivr CDN (200+ currencies, updated ~daily), with a pages.dev
 * fallback host. The fetched table is stored as a synced scalar (`rates` +
 * `meta.rates`), so it survives reloads, works offline after the first fetch,
 * and one device's fetch benefits the others.
 *
 * This module is intentionally split into pure, testable helpers (parse, coerce,
 * `makeRateResolver`) and thin IO/React wrappers (`fetchRates`, `refreshRates`,
 * `ensureRatesFresh`, `useRateResolver`).
 */
import { useMemo } from 'react'
import type { ExchangeRates } from '../types'
import { useBudgetStore } from '../store/budgetStore'
import { coerceRates } from '../store/persist'
import { SYMBOL_TO_CODE } from './currency'
import { daysSince } from './freshness'

/** Providers, tried in order. `{base}` is the lowercase base ISO code. */
const ENDPOINTS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.json',
  'https://latest.currency-api.pages.dev/v1/currencies/{base}.json',
] as const

/** Refetch once the cache is at least this many whole days old. */
export const RATES_MAX_AGE_DAYS = 1

/**
 * A resolver maps a currency token from a formula — an ISO code ("AMD"), a
 * lowercase code, or a symbol ("$") — to the multiplier that converts one unit
 * of it into the current default currency. Returns null when the token can't be
 * resolved (unknown code, or no rates cached yet), which makes the formula
 * invalid rather than silently wrong.
 */
export type RateResolver = (token: string) => number | null

/**
 * Build a resolver from the cached rates and the current default currency.
 *
 * The current currency always resolves (to 1) even with no rates cached — typing
 * your own currency's code is just an identity. Every other currency needs the
 * table. Because `values` expresses every listed currency in terms of `base`,
 * any pair converts via the base as a cross-rate, so the cached `base` need not
 * equal the current currency.
 */
export function makeRateResolver(
  rates: ExchangeRates | null,
  currentCurrency: string,
): RateResolver {
  const cc = (currentCurrency || '').toUpperCase()
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

/** Shape the provider's `{ date, <base>: { code: rate } }` payload. */
export function parseProviderResponse(base: string, json: unknown): ExchangeRates | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  const date = typeof o.date === 'string' ? o.date : ''
  const table = o[base.toLowerCase()]
  return coerceRates({ base, date, values: table })
}

/**
 * Fetch the rate table for `base` from the provider (with fallback host).
 * Throws if every endpoint fails or returns an unusable payload.
 */
export async function fetchRates(base: string): Promise<ExchangeRates> {
  const lower = base.toLowerCase()
  let lastErr: unknown
  for (const tpl of ENDPOINTS) {
    const url = tpl.replace('{base}', lower)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`)
        continue
      }
      const json: unknown = await res.json()
      const rates = parseProviderResponse(base, json)
      if (rates) return rates
      lastErr = new Error('Unexpected rates payload')
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Could not fetch exchange rates')
}

/** Whether the cached rates need refreshing (missing, aged, or wrong base). */
export function ratesNeedRefresh(
  rates: ExchangeRates | null,
  ratesUpdatedAt: string | null,
  currency: string,
): boolean {
  if (!rates) return true
  // Keep `base` aligned with the current currency so its side always resolves.
  if (rates.base.toUpperCase() !== currency.toUpperCase()) return true
  if (!ratesUpdatedAt) return true
  return daysSince(ratesUpdatedAt) >= RATES_MAX_AGE_DAYS
}

/**
 * Fetch and store rates for the current default currency. By default it only
 * fetches when the cache is stale (`ratesNeedRefresh`); pass `force` for the
 * manual "Refresh now" button. Never throws — the caller decides how to surface
 * failure (returns false when nothing was fetched or the fetch failed).
 */
export async function refreshRates(opts: { force?: boolean } = {}): Promise<boolean> {
  if (typeof fetch === 'undefined') return false
  const state = useBudgetStore.getState()
  const { currency, rates } = state
  if (!opts.force && !ratesNeedRefresh(rates, state.meta.rates, currency)) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false && !opts.force) return false
  try {
    const next = await fetchRates(currency)
    useBudgetStore.getState().setRates(next)
    return true
  } catch {
    return false
  }
}

/** Fire-and-forget daily refresh, called once on app start. */
export function ensureRatesFresh(): void {
  void refreshRates()
}

/**
 * React hook: a rate resolver bound to the store's cached rates and default
 * currency. Recomputed only when either changes, so formula fields re-evaluate
 * automatically once rates load.
 */
export function useRateResolver(): RateResolver {
  const rates = useBudgetStore((s) => s.rates)
  const currency = useBudgetStore((s) => s.currency)
  return useMemo(() => makeRateResolver(rates, currency), [rates, currency])
}
