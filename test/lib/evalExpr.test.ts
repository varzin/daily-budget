/**
 * The expression evaluator (src/lib/evalExpr.ts). Locks the pre-existing
 * arithmetic behavior and covers the currency-in-formula extension: a currency
 * token ("10 AMD", "$10", "10 ₽") is converted via an injected rate resolver,
 * and is recognized ONLY when such a resolver is supplied.
 */
import { describe, expect, it } from 'vitest'
import {
  evaluateExpr,
  evaluateLenient,
  hasMathOps,
  hasCurrencyToken,
  type Rate,
} from '../../src/lib/evalExpr'

// Stub resolver: multiplier that converts 1 unit of the token → default currency.
const RATES: Record<string, number> = { EUR: 1, USD: 1.08, AMD: 0.0025, '$': 1.08, '₽': 0.011 }
const rate: Rate = (token) => {
  if (token in RATES) return RATES[token]!
  const up = token.toUpperCase()
  return up in RATES ? RATES[up]! : null
}

describe('arithmetic (unchanged, no resolver)', () => {
  it('evaluates the four operators with precedence and parens', () => {
    expect(evaluateExpr('2+3')).toEqual({ ok: true, value: 5 })
    expect(evaluateExpr('2+3*4')).toEqual({ ok: true, value: 14 })
    expect(evaluateExpr('(2+3)*4')).toEqual({ ok: true, value: 20 })
    expect(evaluateExpr('10/4')).toEqual({ ok: true, value: 2.5 })
  })

  it('treats an empty string as 0 and rejects garbage / divide-by-zero', () => {
    expect(evaluateExpr('')).toEqual({ ok: true, value: 0 })
    expect(evaluateExpr('abc').ok).toBe(false)
    expect(evaluateExpr('5 5').ok).toBe(false)
    expect(evaluateExpr('1/0').ok).toBe(false)
  })

  it('does NOT recognize a currency token without a resolver', () => {
    expect(evaluateExpr('10 AMD').ok).toBe(false)
    expect(evaluateExpr('$10').ok).toBe(false)
  })
})

describe('currency tokens (with resolver)', () => {
  it('converts a suffix ISO code, with or without a space, case-insensitively', () => {
    expect(evaluateExpr('10 AMD', { rate }).value).toBeCloseTo(0.025, 6)
    expect(evaluateExpr('10AMD', { rate }).value).toBeCloseTo(0.025, 6)
    expect(evaluateExpr('10 amd', { rate }).value).toBeCloseTo(0.025, 6)
  })

  it('converts a prefix or suffix symbol', () => {
    expect(evaluateExpr('$10', { rate }).value).toBeCloseTo(10.8, 6)
    expect(evaluateExpr('10 ₽', { rate }).value).toBeCloseTo(0.11, 6)
  })

  it('the default currency code resolves to identity', () => {
    expect(evaluateExpr('10 EUR', { rate }).value).toBeCloseTo(10, 6)
  })

  it('mixes currencies and arithmetic; currency binds tighter than * and +', () => {
    expect(evaluateExpr('10 USD + 5 EUR', { rate }).value).toBeCloseTo(15.8, 6)
    expect(evaluateExpr('2 * 3 USD', { rate }).value).toBeCloseTo(6.48, 6)
    expect(evaluateExpr('(10+5) USD', { rate }).value).toBeCloseTo(16.2, 6)
    expect(evaluateExpr('-10 USD', { rate }).value).toBeCloseTo(-10.8, 6)
  })

  it('fails when the currency is unknown to the resolver (no silent zero)', () => {
    expect(evaluateExpr('10 XYZ', { rate }).ok).toBe(false)
    expect(evaluateExpr('10 USD + 5 XYZ', { rate }).ok).toBe(false)
  })
})

describe('evaluateLenient with currency', () => {
  it('drops a trailing operator then converts', () => {
    expect(evaluateLenient('10 USD +', { rate }).value).toBeCloseTo(10.8, 6)
  })

  it('still passes currency tokens through', () => {
    expect(evaluateLenient('10 AMD', { rate }).value).toBeCloseTo(0.025, 6)
  })
})

describe('hasMathOps / hasCurrencyToken', () => {
  it('hasMathOps detects operators but not a lone negative', () => {
    expect(hasMathOps('1200+30')).toBe(true)
    expect(hasMathOps('-5')).toBe(false)
    expect(hasMathOps('1000')).toBe(false)
  })

  it('hasCurrencyToken detects codes and symbols, not plain numbers/arithmetic', () => {
    expect(hasCurrencyToken('10 AMD')).toBe(true)
    expect(hasCurrencyToken('$10')).toBe(true)
    expect(hasCurrencyToken('10 ₽')).toBe(true)
    expect(hasCurrencyToken('1000')).toBe(false)
    expect(hasCurrencyToken('1200+30')).toBe(false)
    expect(hasCurrencyToken('1000.50')).toBe(false)
  })
})
