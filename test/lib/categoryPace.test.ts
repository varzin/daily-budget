/**
 * Spending-pace bar for "ongoing" fixed expenses (CLAUDE.md — ongoing-expense
 * pace indicator). computeCategoryPace compares spent/budget against how much
 * of the pay period has elapsed and picks the bar colour (strict +10% / +25%).
 */
import { describe, expect, it } from 'vitest'
import { computeCategoryPace } from '../../src/lib/math'
import type { Category } from '../../src/types'

// incomeDay = 1 → the cycle is the calendar month. June has 30 days, so on
// June 16 exactly half the period has elapsed (15 of 30 days).
const TODAY = new Date(2026, 5, 16)
const INCOME_DAY = 1

const cat = (budget: number, spent: number): Category => ({
  id: 'c1',
  name: 'Groceries',
  budget,
  spent,
  done: false,
  ongoing: true,
})

const pace = (budget: number, spent: number) =>
  computeCategoryPace(cat(budget, spent), INCOME_DAY, TODAY)

describe('computeCategoryPace', () => {
  it('marks the day position at the elapsed share of the cycle', () => {
    expect(pace(100, 0)?.elapsed).toBeCloseTo(0.5)
  })

  it('green while spend keeps pace (over ≤ +10%)', () => {
    // 55% spent at 50% elapsed → over 0.05
    expect(pace(100, 55)?.state).toBe('green')
    expect(pace(100, 50)?.state).toBe('green')
  })

  it('orange when moderately ahead (+10%…+25%)', () => {
    // 65% spent at 50% elapsed → over 0.15
    expect(pace(100, 65)?.state).toBe('orange')
  })

  it('red when well ahead (over > +25%)', () => {
    // 80% spent at 50% elapsed → over 0.30
    expect(pace(100, 80)?.state).toBe('red')
  })

  it('caps the fill at 100% but still reads red when overspent', () => {
    const p = pace(100, 130)
    expect(p?.spentRatio).toBe(1)
    expect(p?.state).toBe('red')
  })

  it('returns null when there is nothing to measure', () => {
    expect(computeCategoryPace(cat(0, 0), INCOME_DAY, TODAY)).toBeNull()
    expect(computeCategoryPace(cat(100, 20), 0, TODAY)).toBeNull()
  })
})
