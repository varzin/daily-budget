/**
 * Exchange-rate helpers (src/lib/rates.ts): the pure resolver math, provider
 * payload parsing, untrusted-input coercion and the daily-refresh decision.
 * Network IO (fetchRates) is intentionally not exercised here.
 */
import { describe, expect, it } from 'vitest'
import {
  makeRateResolver,
  parseProviderResponse,
  ratesNeedRefresh,
  RATES_MAX_AGE_DAYS,
} from '../../src/lib/rates'
import { coerceRates } from '../../src/store/persist'
import type { ExchangeRates } from '../../src/types'

// Rates relative to EUR: "1 EUR = value units of X".
const eur: ExchangeRates = { base: 'EUR', date: '2026-07-24', values: { usd: 1.08, amd: 400 } }

describe('makeRateResolver', () => {
  it('resolves the default currency to identity (even with no rates)', () => {
    expect(makeRateResolver(eur, 'EUR')('EUR')).toBe(1)
    expect(makeRateResolver(null, 'EUR')('EUR')).toBe(1)
  })

  it('converts 1 unit of a listed currency into the default currency', () => {
    const r = makeRateResolver(eur, 'EUR')
    expect(r('USD')).toBeCloseTo(1 / 1.08, 8) // 1 USD ≈ 0.926 EUR
    expect(r('AMD')).toBeCloseTo(1 / 400, 8) // 1 AMD = 0.0025 EUR
  })

  it('maps symbols to codes ($ → USD)', () => {
    expect(makeRateResolver(eur, 'EUR')('$')).toBeCloseTo(1 / 1.08, 8)
  })

  it('computes a cross-rate when the base is not the default currency', () => {
    const r = makeRateResolver(eur, 'USD') // default USD, table based on EUR
    expect(r('USD')).toBe(1)
    expect(r('EUR')).toBeCloseTo(1.08, 8) // 1 EUR = 1.08 USD
    expect(r('AMD')).toBeCloseTo(1.08 / 400, 8) // via EUR
  })

  it('returns null for an unknown currency, or any currency when no rates cached', () => {
    expect(makeRateResolver(eur, 'EUR')('XYZ')).toBeNull()
    expect(makeRateResolver(null, 'EUR')('USD')).toBeNull()
  })
})

describe('parseProviderResponse', () => {
  it('shapes the { date, <base>: {code: rate} } payload', () => {
    const parsed = parseProviderResponse('EUR', {
      date: '2026-07-24',
      eur: { usd: 1.08, amd: 400 },
    })
    expect(parsed).toEqual({ base: 'EUR', date: '2026-07-24', values: { usd: 1.08, amd: 400 } })
  })

  it('returns null for a malformed payload', () => {
    expect(parseProviderResponse('EUR', null)).toBeNull()
    expect(parseProviderResponse('EUR', { date: '2026-07-24' })).toBeNull()
  })
})

describe('coerceRates (untrusted input)', () => {
  it('uppercases the base, lowercases codes, drops junk values', () => {
    const r = coerceRates({ base: 'eur', date: '2026-07-24', values: { USD: 1.08, bad: 'x', neg: -1, zero: 0 } })
    expect(r).toEqual({ base: 'EUR', date: '2026-07-24', values: { usd: 1.08 } })
  })

  it('returns null when base, date or values are absent/empty', () => {
    expect(coerceRates(null)).toBeNull()
    expect(coerceRates({ base: 'EUR', values: { usd: 1 } })).toBeNull()
    expect(coerceRates({ base: 'EUR', date: '2026-07-24', values: {} })).toBeNull()
    expect(coerceRates({ base: '', date: '2026-07-24', values: { usd: 1 } })).toBeNull()
  })
})

describe('ratesNeedRefresh', () => {
  const nowIso = new Date().toISOString()

  it('needs a refresh when nothing is cached', () => {
    expect(ratesNeedRefresh(null, null, 'EUR')).toBe(true)
  })

  it('needs a refresh when the cached base differs from the current currency', () => {
    expect(ratesNeedRefresh(eur, nowIso, 'USD')).toBe(true)
  })

  it('needs a refresh when the cache is missing a timestamp or is a day old', () => {
    expect(ratesNeedRefresh(eur, null, 'EUR')).toBe(true)
    expect(ratesNeedRefresh(eur, '2020-01-01T00:00:00.000Z', 'EUR')).toBe(true)
  })

  it('is fresh when same-day and same base', () => {
    expect(RATES_MAX_AGE_DAYS).toBe(1)
    expect(ratesNeedRefresh(eur, nowIso, 'EUR')).toBe(false)
  })
})
