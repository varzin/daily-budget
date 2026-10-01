/**
 * computeDashboard — every figure the dashboard widget and breakdown show, as a
 * pure function of single-currency amounts. Pins it against the underlying
 * formulas, then checks the multi-currency path: projecting mixed-currency data
 * into the display currency (lib/convert.ts) must give exactly what the
 * equivalent hand-converted single-currency data gives.
 */
import { describe, expect, it } from 'vitest'
import {
  computeDashboard,
  computeDaysLeft,
  computeCycleLength,
  computePace,
  computeSituation,
  obligatoryTotal,
  plannedObligatoryTotal,
  reservedSavingsPool,
  type DashboardInput,
} from '../../src/lib/math'
import { projectToDisplay } from '../../src/lib/convert'
import type { Category, ExchangeRates, SavingsRow } from '../../src/types'

// Mid-cycle with income on the 26th: 2026-10-06 → 20 days left of a 30-day cycle.
const TODAY = new Date(2026, 9, 6)

const RATES: ExchangeRates = { base: 'EUR', date: '2026-10-01', values: { amd: 400, usd: 1.25 } }

const cat = (id: string, budget: number, spent = 0, p: Partial<Category> = {}): Category => ({
  id,
  name: id,
  budget,
  spent,
  currency: 'EUR',
  done: false,
  ...p,
})

const row = (month: string, saved: number, currency = 'EUR'): SavingsRow => ({
  id: month,
  month,
  saved,
  currency,
})

const input = (p: Partial<DashboardInput> = {}): DashboardInput => ({
  bank: 3000,
  buffer: 200,
  monthlyIncome: 2500,
  incomeDay: 26,
  categories: [cat('rent', 800, 0), cat('food', 400, 100)],
  savings: [row('2026-08', 500), row('2026-09', 300)],
  ...p,
})

describe('computeDashboard — the underlying formulas', () => {
  it('derives every figure from bank, fixed expenses, savings and cushion', () => {
    const i = input()
    const m = computeDashboard(i, TODAY)
    const oblig = obligatoryTotal(i.categories) // 800 + 300
    const pool = reservedSavingsPool(i.savings) // 800
    const days = computeDaysLeft(26, TODAY)

    expect(days).toBe(20)
    expect(m.bank).toBe(3000)
    expect(m.buffer).toBe(200)
    expect(m.oblig).toBe(1100)
    expect(m.savingsPool).toBe(800)
    expect(m.daysLeft).toBe(20)
    expect(m.withoutSavings).toBe(3000 - pool)
    expect(m.afterObligNoSavings).toBe(3000 - oblig - pool)
    expect(m.afterObligAll).toBe(3000 - oblig)
    expect(m.greenPerDay).toBe((3000 - oblig - pool - 200) / days)
    expect(m.yellowPerDay).toBe((3000 - oblig - pool) / days)
    expect(m.allPerDay).toBe((3000 - oblig) / days)
    expect(m.situation).toEqual(computeSituation(3000, oblig, pool, 200, days))
  })

  it('measures pace against each tab goal: cushion / 0 / −savings', () => {
    const i = input()
    const m = computeDashboard(i, TODAY)
    const args = {
      bank: 3000,
      oblig: obligatoryTotal(i.categories),
      plannedOblig: plannedObligatoryTotal(i.categories),
      savingsPool: 800,
      monthlyIncome: 2500,
      daysLeft: 20,
      cycleDays: computeCycleLength(26, TODAY),
    }
    expect(m.paceGrow).toEqual(computePace({ ...args, buffer: 200 }))
    expect(m.paceKeep).toEqual(computePace({ ...args, buffer: 0 }))
    expect(m.paceSpend).toEqual(computePace({ ...args, buffer: -800 }))
  })

  it('hides pace when no monthly income is set', () => {
    const m = computeDashboard(input({ monthlyIncome: 0 }), TODAY)
    expect(m.paceGrow).toBeNull()
    expect(m.paceKeep).toBeNull()
    expect(m.paceSpend).toBeNull()
  })

  it.each([
    // bank, expected state — oblig 1100, pool 800, cushion 200.
    [2200, 'ahead'],
    [2050, 'onTrack'],
    [1500, 'intoSavings'],
    [900, 'over'],
  ] as const)('bank %d → %s', (bank, state) => {
    expect(computeDashboard(input({ bank }), TODAY).situation.state).toBe(state)
  })

  it('clamps a negative savings history to a zero reserve', () => {
    const m = computeDashboard(input({ savings: [row('2026-08', -400)] }), TODAY)
    expect(m.savingsPool).toBe(0)
    expect(m.withoutSavings).toBe(3000)
  })

  it('yields zero daily figures when no income day is set', () => {
    const m = computeDashboard(input({ incomeDay: 0 }), TODAY)
    expect(m.daysLeft).toBe(0)
    expect(m.greenPerDay).toBe(0)
    expect(m.allPerDay).toBe(0)
  })
})

describe('computeDashboard — mixed currencies via projectToDisplay', () => {
  // The EUR scenario above, with every amount stored in a different currency.
  const mixed = {
    currency: 'EUR',
    // ֏800 000 (= €2000) + $1250 (= €1000) → €3000 across two accounts.
    accounts: [
      { id: 'card', name: 'Card', balance: 800_000, currency: 'AMD' },
      { id: 'cash', name: 'Cash', balance: 1250, currency: 'USD' },
    ],
    buffer: 250, // $ → €200
    bufferCurrency: 'USD',
    monthlyIncome: 2500,
    monthlyIncomeCurrency: 'EUR',
    categories: [
      cat('rent', 320_000, 0, { currency: 'AMD' }), // €800
      cat('food', 500, 125, { currency: 'USD' }), // €400 / €100
    ],
    savings: [row('2026-08', 200_000, 'AMD'), row('2026-09', 375, 'USD')], // €500 + €300
  }

  const fromProjection = (currency: string) => {
    const d = projectToDisplay({ ...mixed, currency }, RATES)
    return computeDashboard({ ...d, incomeDay: 26 }, TODAY)
  }

  it('matches the hand-converted single-currency result', () => {
    const viaMixed = fromProjection('EUR')
    const viaEur = computeDashboard(input(), TODAY)
    expect(viaMixed.situation.state).toBe(viaEur.situation.state)
    for (const k of [
      'bank',
      'buffer',
      'oblig',
      'savingsPool',
      'withoutSavings',
      'afterObligNoSavings',
      'afterObligAll',
      'greenPerDay',
      'yellowPerDay',
      'allPerDay',
    ] as const) {
      expect(viaMixed[k], k).toBeCloseTo(viaEur[k], 6)
    }
    expect(viaMixed.paceGrow!.ahead).toBeCloseTo(viaEur.paceGrow!.ahead, 2)
    expect(viaMixed.paceSpend!.perDayPlan).toBeCloseTo(viaEur.paceSpend!.perDayPlan, 6)
  })

  it('scales every money figure by the rate when the display currency changes', () => {
    const eur = fromProjection('EUR')
    const amd = fromProjection('AMD')
    expect(amd.daysLeft).toBe(eur.daysLeft)
    expect(amd.situation.state).toBe(eur.situation.state)
    expect(amd.bank).toBeCloseTo(eur.bank * 400, 4)
    expect(amd.oblig).toBeCloseTo(eur.oblig * 400, 4)
    expect(amd.savingsPool).toBeCloseTo(eur.savingsPool * 400, 4)
    expect(amd.greenPerDay).toBeCloseTo(eur.greenPerDay * 400, 4)
    expect(amd.paceKeep!.perDayActual).toBeCloseTo(eur.paceKeep!.perDayActual * 400, 4)
  })

  it('clamps a pool that is negative only after conversion', () => {
    // +€100 and −$250 (= −€200): net −€100 → reserve 0.
    const d = projectToDisplay(
      { ...mixed, savings: [row('2026-08', 100, 'EUR'), row('2026-09', -250, 'USD')] },
      RATES,
    )
    expect(computeDashboard({ ...d, incomeDay: 26 }, TODAY).savingsPool).toBe(0)
  })
})
