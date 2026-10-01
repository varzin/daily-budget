/**
 * The app's fixed thresholds are calibrated in EUR — savings tiers 500/200/1
 * and the ±1 "on plan" band — and scaled into the display currency so they
 * keep their meaning in, say, drams (lib/convert.ts thresholdScale).
 */
import { describe, expect, it } from 'vitest'
import {
  BASE_SAVED_THRESHOLDS,
  isOnPlan,
  savedIndicator,
  savedThresholds,
} from '../../src/lib/math'

describe('savedThresholds', () => {
  it('returns the calibrated tiers unchanged at scale 1 (and for bad scales)', () => {
    expect(savedThresholds(1)).toEqual({ blue: 500, green: 200, yellow: 1 })
    expect(savedThresholds()).toBe(BASE_SAVED_THRESHOLDS)
    expect(savedThresholds(0)).toBe(BASE_SAVED_THRESHOLDS)
    expect(savedThresholds(NaN)).toBe(BASE_SAVED_THRESHOLDS)
  })

  it('scales and rounds to two significant digits', () => {
    // 1 EUR ≈ 430.86 AMD.
    expect(savedThresholds(430.86)).toEqual({ blue: 220000, green: 86000, yellow: 430 })
    // 1 EUR = 1.08 USD.
    const usd = savedThresholds(1.08)
    expect(usd.blue).toBe(540)
    expect(usd.green).toBe(220)
    expect(usd.yellow).toBeCloseTo(1.1, 12)
  })
})

describe('savedIndicator with thresholds', () => {
  it('keeps the calibrated EUR tiers by default', () => {
    expect(savedIndicator(500)).toBe('blue')
    expect(savedIndicator(499.99)).toBe('green')
    expect(savedIndicator(200)).toBe('green')
    expect(savedIndicator(1)).toBe('yellow')
    expect(savedIndicator(0.99)).toBe('red')
    expect(savedIndicator(-50)).toBe('red')
  })

  it('applies scaled tiers, so ֏500 is no longer a "great" month', () => {
    const amd = savedThresholds(430)
    expect(savedIndicator(500, amd)).toBe('yellow')
    expect(savedIndicator(86000, amd)).toBe('green')
    expect(savedIndicator(220000, amd)).toBe('blue')
    expect(savedIndicator(100, amd)).toBe('red')
  })
})

describe('isOnPlan', () => {
  it('uses a ±1 band at scale 1', () => {
    expect(isOnPlan(0.99)).toBe(true)
    expect(isOnPlan(-0.99)).toBe(true)
    expect(isOnPlan(1)).toBe(false)
    expect(isOnPlan(-1)).toBe(false)
  })

  it('scales the band into the display currency', () => {
    expect(isOnPlan(300, 430)).toBe(true)
    expect(isOnPlan(-429, 430)).toBe(true)
    expect(isOnPlan(431, 430)).toBe(false)
  })

  it('falls back to ±1 for a non-positive scale', () => {
    expect(isOnPlan(0.5, 0)).toBe(true)
    expect(isOnPlan(2, -5)).toBe(false)
  })
})
