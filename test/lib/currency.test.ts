/**
 * Currency selection (CLAUDE.md "Выбор валюты"): coercion, symbol + locale-aware
 * formatting, and that the chosen currency merges as a synced scalar.
 */
import { describe, expect, it } from 'vitest'
import { coerceCurrency, getCurrency, money, deviceLocale, DEFAULT_CURRENCY } from '../../src/lib/currency'
import { mergeBudget } from '../../src/sync/merge'
import type { BudgetState } from '../../src/types'

describe('coerceCurrency', () => {
  it('keeps a known code', () => {
    expect(coerceCurrency('USD')).toBe('USD')
    expect(coerceCurrency('EUR')).toBe('EUR')
  })

  it('falls back to the default for unknown / absent / wrong-type input', () => {
    expect(coerceCurrency('XYZ')).toBe(DEFAULT_CURRENCY)
    expect(coerceCurrency(undefined)).toBe(DEFAULT_CURRENCY)
    expect(coerceCurrency(null)).toBe(DEFAULT_CURRENCY)
    expect(coerceCurrency(42)).toBe(DEFAULT_CURRENCY)
  })
})

describe('getCurrency', () => {
  it('resolves unknown codes to the default currency', () => {
    expect(getCurrency('nope').code).toBe(DEFAULT_CURRENCY)
    expect(getCurrency('GBP').symbol).toBe('£')
  })
})

describe('money formatting', () => {
  it('groups numbers by the given (device) locale, not the currency', () => {
    // Same currency, different device locales → different grouping.
    expect(money('USD', 'en-US').fmt(1234.5)).toBe('1,234.50')
    expect(money('USD', 'de-DE').fmt(1234.5)).toBe('1.234,50')
    // Symbol comes from the currency regardless of locale.
    expect(money('USD', 'de-DE').symbol).toBe('$')
    expect(money('EUR', 'en-US').symbol).toBe('€')
  })

  it('takes decimal count from the currency (via Intl)', () => {
    expect(money('EUR', 'en-US').decimals).toBe(2)
    expect(money('JPY', 'en-US').decimals).toBe(0)
    // Zero-decimal currency rounds to whole numbers.
    expect(money('JPY', 'en-US').fmt(1234)).toBe('1,234')
    expect(money('JPY', 'en-US').fmt(1234.6)).toBe('1,235')
  })

  it('fmtAmount drops forced decimals', () => {
    expect(money('USD', 'en-US').fmtAmount(200)).toBe('200')
    expect(money('EUR', 'de-DE').fmtAmount(12.5)).toBe('12,5')
  })

  it('defaults to the device locale when none is passed', () => {
    expect(money('USD').locale).toBe(deviceLocale())
  })
})

const T0 = '2026-05-01T00:00:00.000Z'
const T2 = '2026-05-03T00:00:00.000Z'

function doc(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 0,
    incomeDay: 26,
    buffer: 200,
    currency: 'EUR',
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: { bank: null, incomeDay: null, buffer: null, currency: null },
    ...p,
  }
}

describe('currency scalar merge', () => {
  it('takes the more recently edited currency', () => {
    const local = doc({ currency: 'EUR', meta: { bank: null, incomeDay: null, buffer: null, currency: T0 } })
    const remote = doc({ currency: 'USD', meta: { bank: null, incomeDay: null, buffer: null, currency: T2 } })
    expect(mergeBudget(local, remote).merged.currency).toBe('USD')
  })

  it('keeps local currency on an older remote edit', () => {
    const local = doc({ currency: 'GBP', meta: { bank: null, incomeDay: null, buffer: null, currency: T2 } })
    const remote = doc({ currency: 'USD', meta: { bank: null, incomeDay: null, buffer: null, currency: T0 } })
    expect(mergeBudget(local, remote).merged.currency).toBe('GBP')
  })
})
