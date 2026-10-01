/**
 * explainPace — the term-by-term breakdown the pace pill's (i) modal shows.
 * The key property: for every goal, the listed terms, summed with their signs
 * and divided by the listed days, reproduce exactly the per-day figures (and
 * the ahead amount) computePace produced for the pill — the modal can never
 * show a calculation that disagrees with the number it explains.
 */
import { describe, expect, it } from 'vitest'
import {
  computeDashboard,
  explainPace,
  paceGoalFor,
  type DashboardInput,
  type PaceGoal,
  type PaceSide,
} from '../../src/lib/math'
import { round2 } from '../../src/lib/utils'
import type { Category, SavingsRow } from '../../src/types'

// 2026-10-06, income on the 26th: 20 days left of a 30-day cycle.
const TODAY = new Date(2026, 9, 6)

const cat = (id: string, budget: number, spent = 0): Category => ({
  id,
  name: id,
  budget,
  spent,
  currency: 'EUR',
  done: false,
})
const row = (month: string, saved: number): SavingsRow => ({ id: month, month, saved, currency: 'EUR' })

const input = (p: Partial<DashboardInput> = {}): DashboardInput => ({
  bank: 3000,
  buffer: 200,
  monthlyIncome: 2500,
  incomeDay: 26,
  categories: [cat('rent', 800), cat('food', 400, 100)], // planned 1200, left 1100
  savings: [row('2026-08', 500), row('2026-09', 300)], // pool 800
  ...p,
})

const sum = (side: PaceSide) => side.terms.reduce((s, t) => s + t.sign * t.amount, 0)
const keys = (side: PaceSide) => side.terms.map((t) => `${t.sign > 0 ? '+' : '-'}${t.key}`)

const GOALS: PaceGoal[] = ['grow', 'keep', 'spend']

describe('explainPace reproduces the pill exactly', () => {
  it.each(GOALS)('%s: terms ÷ days = per-day figures, gap × days = ahead', (goal) => {
    const m = computeDashboard(input(), TODAY)
    const e = explainPace(m, goal)!
    expect(e.goal).toBe(goal)
    expect(sum(e.plan) / e.plan.days).toBeCloseTo(e.plan.perDay, 9)
    expect(sum(e.actual) / e.actual.days).toBeCloseTo(e.actual.perDay, 9)
    expect(round2((e.actual.perDay - e.plan.perDay) * e.actual.days)).toBe(e.ahead)
    const pace = goal === 'grow' ? m.paceGrow : goal === 'keep' ? m.paceKeep : m.paceSpend
    expect(e.plan.perDay).toBe(pace!.perDayPlan)
    expect(e.actual.perDay).toBe(pace!.perDayActual)
    expect(e.ahead).toBe(pace!.ahead)
  })

  it.each([
    [500, 0, 0],
    [3000, 0, 800],
    [9000, 1500, 2000],
    [100, 350, -400],
  ])('holds for bank %d, cushion %d, savings %d', (bank, buffer, saved) => {
    const m = computeDashboard(input({ bank, buffer, savings: saved ? [row('2026-09', saved)] : [] }), TODAY)
    for (const goal of GOALS) {
      const e = explainPace(m, goal)!
      expect(sum(e.plan) / e.plan.days, `${goal} plan`).toBeCloseTo(e.plan.perDay, 9)
      expect(sum(e.actual) / e.actual.days, `${goal} actual`).toBeCloseTo(e.actual.perDay, 9)
    }
  })
})

describe('explainPace terms per goal', () => {
  const m = computeDashboard(input(), TODAY)

  it('grow: plan − cushion; actual − savings − cushion', () => {
    const e = explainPace(m, 'grow')!
    expect(keys(e.plan)).toEqual(['+income', '-plannedFixed', '-cushion'])
    expect(keys(e.actual)).toEqual(['+balance', '-fixedLeft', '-savings', '-cushion'])
  })

  it('keep: plan has no goal term; actual − savings', () => {
    const e = explainPace(m, 'keep')!
    expect(keys(e.plan)).toEqual(['+income', '-plannedFixed'])
    expect(keys(e.actual)).toEqual(['+balance', '-fixedLeft', '-savings'])
  })

  it('spend: plan + savings; actual has no savings term', () => {
    const e = explainPace(m, 'spend')!
    expect(keys(e.plan)).toEqual(['+income', '-plannedFixed', '+savings'])
    expect(keys(e.actual)).toEqual(['+balance', '-fixedLeft'])
  })

  it('carries the figures and the two day counts', () => {
    const e = explainPace(m, 'grow')!
    expect(e.plan.terms.map((t) => t.amount)).toEqual([2500, 1200, 200])
    expect(e.actual.terms.map((t) => t.amount)).toEqual([3000, 1100, 800, 200])
    expect(e.plan.days).toBe(30)
    expect(e.actual.days).toBe(20)
  })

  it('leaves out a zero cushion and zero savings', () => {
    const z = computeDashboard(input({ buffer: 0, savings: [] }), TODAY)
    expect(keys(explainPace(z, 'grow')!.plan)).toEqual(['+income', '-plannedFixed'])
    expect(keys(explainPace(z, 'grow')!.actual)).toEqual(['+balance', '-fixedLeft'])
    expect(keys(explainPace(z, 'spend')!.plan)).toEqual(['+income', '-plannedFixed'])
  })

  it('a negative savings history counts as a zero reserve (no term)', () => {
    const n = computeDashboard(input({ savings: [row('2026-09', -300)] }), TODAY)
    expect(keys(explainPace(n, 'keep')!.actual)).toEqual(['+balance', '-fixedLeft'])
  })
})

describe('explainPace when pace is off / goal mapping', () => {
  it('is null without a monthly income', () => {
    const m = computeDashboard(input({ monthlyIncome: 0 }), TODAY)
    for (const goal of GOALS) expect(explainPace(m, goal)).toBeNull()
  })

  it('maps widget tabs to goals; the deficit card uses "spend"', () => {
    expect(paceGoalFor('ahead')).toBe('grow')
    expect(paceGoalFor('onTrack')).toBe('keep')
    expect(paceGoalFor('intoSavings')).toBe('spend')
    expect(paceGoalFor(null)).toBe('spend')
  })
})
