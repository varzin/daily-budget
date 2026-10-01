/**
 * Per-amount currencies (CLAUDE.md "Валюта у сумм / валюта отображения"): every
 * stored amount keeps the currency it was entered in, and lib/convert.ts
 * projects them into the display currency at today's cached rates. Covers the
 * conversion primitive, the never-failing converter (1:1 fallback + `missing`),
 * the per-collection converters, the full display projection, finalize in the
 * balance's currency and the threshold scale.
 */
import { describe, expect, it } from 'vitest'
import {
  computeFinalizeIn,
  convert,
  convertCategories,
  convertSavings,
  makeConverter,
  makeRateResolver,
  previewCurrencySwitch,
  projectToDisplay,
  thresholdScale,
  type AmountSource,
} from '../../src/lib/convert'
import { computeBalances, computeFinalize } from '../../src/lib/math'
import type { Account, Category, ExchangeRates, SavingsRow } from '../../src/types'

// 1 EUR = 1.1 USD = 430 AMD = 0.85 GBP.
const RATES: ExchangeRates = {
  base: 'EUR',
  date: '2026-10-01',
  values: { usd: 1.1, amd: 430, gbp: 0.85 },
}

// The same market, expressed with a different base (1 USD = …).
const RATES_USD_BASE: ExchangeRates = {
  base: 'USD',
  date: '2026-10-01',
  values: { eur: 1 / 1.1, amd: 430 / 1.1, gbp: 0.85 / 1.1 },
}

const cat = (id: string, p: Partial<Category> = {}): Category => ({
  id,
  name: id,
  budget: 0,
  spent: 0,
  currency: 'EUR',
  done: false,
  ...p,
})

const row = (month: string, saved: number, currency = 'EUR', p: Partial<SavingsRow> = {}): SavingsRow => ({
  id: month,
  month,
  saved,
  currency,
  ...p,
})

const account = (id: string, balance: number, currency = 'EUR', p: Partial<Account> = {}): Account => ({
  id,
  name: '',
  balance,
  currency,
  ...p,
})

/** `bank` / `bankCurrency` are a shorthand for a single account. */
type SourceInput = Partial<AmountSource> & { bank?: number; bankCurrency?: string }

const source = ({ bank = 0, bankCurrency = 'EUR', ...p }: SourceInput = {}): AmountSource => ({
  currency: 'EUR',
  accounts: [account('main', bank, bankCurrency)],
  buffer: 0,
  bufferCurrency: 'EUR',
  monthlyIncome: 0,
  monthlyIncomeCurrency: 'EUR',
  categories: [],
  savings: [],
  ...p,
})

describe('makeRateResolver into an arbitrary target', () => {
  it('resolves into a target other than the display currency', () => {
    // USD → AMD via the EUR base: 1 USD = 430 / 1.1 AMD.
    expect(makeRateResolver(RATES, 'AMD')('USD')).toBeCloseTo(430 / 1.1, 9)
    expect(makeRateResolver(RATES, 'USD')('AMD')).toBeCloseTo(1.1 / 430, 12)
  })

  it('the target itself is an identity even without rates', () => {
    expect(makeRateResolver(null, 'AMD')('AMD')).toBe(1)
    expect(makeRateResolver(null, 'AMD')('֏')).toBe(1)
  })
})

describe('convert', () => {
  it('is an exact identity within one currency, with or without rates', () => {
    expect(convert(1234.56, 'EUR', 'EUR', RATES)).toBe(1234.56)
    expect(convert(1234.56, 'AMD', 'AMD', null)).toBe(1234.56)
  })

  it('needs no rate for a zero amount', () => {
    expect(convert(0, 'XAF', 'EUR', null)).toBe(0)
  })

  it('converts from and into the base currency', () => {
    expect(convert(10, 'EUR', 'AMD', RATES)).toBeCloseTo(4300, 9)
    expect(convert(4300, 'AMD', 'EUR', RATES)).toBeCloseTo(10, 9)
  })

  it('cross-converts two non-base currencies via the base', () => {
    expect(convert(110, 'USD', 'AMD', RATES)).toBeCloseTo(43000, 6)
    expect(convert(85, 'GBP', 'USD', RATES)).toBeCloseTo(110, 9)
  })

  it('gives the same answer whatever the table base is', () => {
    expect(convert(110, 'USD', 'AMD', RATES_USD_BASE)).toBeCloseTo(43000, 6)
    expect(convert(10, 'EUR', 'GBP', RATES_USD_BASE)).toBeCloseTo(8.5, 9)
  })

  it('round-trips EUR → AMD → EUR back to the original', () => {
    const amd = convert(1500, 'EUR', 'AMD', RATES)!
    expect(convert(amd, 'AMD', 'EUR', RATES)).toBeCloseTo(1500, 9)
  })

  it('is null for an unknown currency or with no rates cached', () => {
    expect(convert(10, 'XAF', 'EUR', RATES)).toBeNull()
    expect(convert(10, 'EUR', 'XAF', RATES)).toBeNull()
    expect(convert(10, 'USD', 'EUR', null)).toBeNull()
  })

  it('preserves the sign of negative amounts (an overspent month)', () => {
    expect(convert(-10, 'EUR', 'AMD', RATES)).toBeCloseTo(-4300, 9)
  })
})

describe('makeConverter', () => {
  it('converts like convert() when a rate exists', () => {
    const c = makeConverter(RATES, 'AMD')
    expect(c.conv(10, 'EUR')).toBeCloseTo(4300, 9)
    expect(c.missing.size).toBe(0)
  })

  it('takes an unresolvable amount 1:1 and records its currency', () => {
    const c = makeConverter(RATES, 'EUR')
    expect(c.conv(50, 'XAF')).toBe(50)
    expect(c.conv(5, 'xaf')).toBe(5)
    expect([...c.missing]).toEqual(['XAF'])
  })

  it('does not flag a missing rate for a zero amount', () => {
    const c = makeConverter(null, 'EUR')
    expect(c.conv(0, 'USD')).toBe(0)
    expect(c.missing.size).toBe(0)
  })
})

describe('convertCategories / convertSavings', () => {
  it('converts budget and spent, re-tags, and keeps every other field', () => {
    const c = makeConverter(RATES, 'AMD')
    const src = cat('rent', {
      budget: 500,
      spent: 200,
      budgetExpr: '400+100',
      done: true,
      ongoing: true,
      note: 'n',
      updatedAt: 'T',
      deletedAt: 'D',
    })
    const [out] = convertCategories([src], c)
    expect(out!.budget).toBeCloseTo(215000, 6)
    expect(out!.spent).toBeCloseTo(86000, 6)
    expect(out!.currency).toBe('AMD')
    expect(out).toMatchObject({
      id: 'rent',
      budgetExpr: '400+100',
      done: true,
      ongoing: true,
      note: 'n',
      updatedAt: 'T',
      deletedAt: 'D',
    })
    // The stored entity itself is never mutated.
    expect(src.budget).toBe(500)
    expect(src.currency).toBe('EUR')
  })

  it('returns same-currency entities untouched', () => {
    const c = makeConverter(RATES, 'EUR')
    const src = cat('a', { budget: 10 })
    expect(convertCategories([src], c)[0]).toBe(src)
    const r = row('2026-01', 5)
    expect(convertSavings([r], c)[0]).toBe(r)
  })

  it('converts saved and keeps month / id / tombstone', () => {
    const c = makeConverter(RATES, 'EUR')
    const [out] = convertSavings([row('2026-01', 4300, 'AMD', { deletedAt: 'D' })], c)
    expect(out!.saved).toBeCloseTo(10, 9)
    expect(out).toMatchObject({ id: '2026-01', month: '2026-01', currency: 'EUR', deletedAt: 'D' })
  })
})

describe('projectToDisplay', () => {
  it('is an identity when everything is in the display currency', () => {
    const s = source({
      bank: 1500,
      buffer: 200,
      monthlyIncome: 3000,
      categories: [cat('a', { budget: 100, spent: 40 })],
      savings: [row('2026-01', 300)],
    })
    const d = projectToDisplay(s, null)
    expect(d).toEqual({
      currency: 'EUR',
      bank: 1500,
      buffer: 200,
      monthlyIncome: 3000,
      categories: s.categories,
      savings: s.savings,
      missing: [],
    })
  })

  it('converts every amount by its own tag into the display currency', () => {
    const d = projectToDisplay(
      source({
        currency: 'AMD',
        bank: 1000,
        bankCurrency: 'EUR',
        buffer: 110,
        bufferCurrency: 'USD',
        monthlyIncome: 860000,
        monthlyIncomeCurrency: 'AMD',
        categories: [cat('rent', { budget: 500, spent: 100 }), cat('food', { budget: 43000, currency: 'AMD' })],
        savings: [row('2026-01', 85, 'GBP'), row('2026-02', 1000, 'AMD')],
      }),
      RATES,
    )
    expect(d.currency).toBe('AMD')
    expect(d.bank).toBeCloseTo(430000, 6)
    expect(d.buffer).toBeCloseTo(43000, 6)
    expect(d.monthlyIncome).toBe(860000)
    expect(d.categories[0]!.budget).toBeCloseTo(215000, 6)
    expect(d.categories[0]!.spent).toBeCloseTo(43000, 6)
    expect(d.categories[1]!.budget).toBe(43000)
    expect(d.savings[0]!.saved).toBeCloseTo(43000, 6)
    expect(d.savings[1]!.saved).toBe(1000)
    expect(d.categories.every((c) => c.currency === 'AMD')).toBe(true)
    expect(d.savings.every((r) => r.currency === 'AMD')).toBe(true)
    expect(d.missing).toEqual([])
  })

  it('switching the display currency back reproduces the original figures', () => {
    const s = source({ bank: 1500, categories: [cat('rent', { budget: 500 })] })
    const there = projectToDisplay({ ...s, currency: 'AMD' }, RATES)
    const back = projectToDisplay({ ...s, currency: 'EUR' }, RATES)
    expect(there.bank).toBeCloseTo(645000, 6)
    expect(back.bank).toBe(1500)
    expect(back.categories[0]!.budget).toBe(500)
  })

  it('lists currencies without a rate (sorted, unique) and counts them 1:1', () => {
    const d = projectToDisplay(
      source({
        bank: 100,
        bankCurrency: 'XAF',
        categories: [cat('a', { budget: 7, currency: 'XOF' }), cat('b', { budget: 3, currency: 'XAF' })],
      }),
      RATES,
    )
    expect(d.bank).toBe(100)
    expect(d.categories[0]!.budget).toBe(7)
    expect(d.missing).toEqual(['XAF', 'XOF'])
  })
})

describe('projectToDisplay — several accounts', () => {
  it('sums every live account, each converted from its own currency', () => {
    const d = projectToDisplay(
      source({
        currency: 'EUR',
        accounts: [account('card', 1000), account('cash', 43000, 'AMD'), account('usd', 110, 'USD')],
      }),
      RATES,
    )
    expect(d.bank).toBeCloseTo(1000 + 100 + 100, 9)
  })

  it('leaves deleted accounts out of the balance', () => {
    const d = projectToDisplay(
      source({ accounts: [account('a', 500), account('b', 999, 'EUR', { deletedAt: 'D' })] }),
      RATES,
    )
    expect(d.bank).toBe(500)
  })

  it('is zero with no live account (both devices deleted a different one)', () => {
    expect(projectToDisplay(source({ accounts: [] }), RATES).bank).toBe(0)
    expect(
      projectToDisplay(source({ accounts: [account('a', 5, 'EUR', { deletedAt: 'D' })] }), RATES).bank,
    ).toBe(0)
  })

  it('reports an account currency without a rate and counts it 1:1', () => {
    const d = projectToDisplay(source({ accounts: [account('a', 100), account('b', 50, 'XAF')] }), RATES)
    expect(d.bank).toBe(150)
    expect(d.missing).toEqual(['XAF'])
  })

  it('a mixed-currency total converts back exactly when switching the display currency', () => {
    const s = source({ accounts: [account('a', 1000), account('b', 43000, 'AMD')] })
    const amd = projectToDisplay({ ...s, currency: 'AMD' }, RATES).bank
    const eur = projectToDisplay(s, RATES).bank
    expect(amd).toBeCloseTo(eur * 430, 6)
    expect(eur).toBeCloseTo(1100, 9)
  })
})

describe('computeFinalizeIn (finalize in the balance currency)', () => {
  it('equals computeFinalize when everything shares one currency', () => {
    const savings = [row('2026-04', 1000), row('2026-05', 500)]
    expect(computeFinalizeIn(3500, 'EUR', savings, null)).toEqual({
      ...computeFinalize(3500, savings),
      currency: 'EUR',
      missing: [],
    })
  })

  it('converts prior rows into the balance currency before subtracting', () => {
    // Balance in AMD; the prior pool is €1000 (= ֏430 000) + ֏70 000.
    const savings = [row('2026-04', 1000, 'EUR'), row('2026-05', 70000, 'AMD')]
    const r = computeFinalizeIn(1000000, 'AMD', savings, RATES)
    expect(r.prevPool).toBeCloseTo(500000, 6)
    expect(r.saved).toBe(500000)
    expect(r.currency).toBe('AMD')
  })

  it('keeps "running total = balance" exactly when rows share the bank currency', () => {
    const savings = [row('2026-04', 1234.5), row('2026-05', -100.25)]
    const { saved, currency } = computeFinalizeIn(4321.75, 'EUR', savings, RATES)
    const balances = computeBalances([...savings, row('2026-06', saved, currency)])
    expect(balances[balances.length - 1]).toBe(4321.75)
  })

  it('leaves the overwritten month out of the pool, in the bank currency', () => {
    // Re-finalizing October: the existing October row (֏999) is replaced.
    const savings = [row('2026-09', 1000, 'EUR'), row('2026-10', 999, 'AMD')]
    const r = computeFinalizeIn(1000000, 'AMD', savings, RATES, '2026-10')
    expect(r.prevPool).toBeCloseTo(430000, 6)
    expect(r.saved).toBe(570000)
  })

  it('ignores tombstoned rows and reports currencies without a rate', () => {
    const savings = [row('2026-04', 100, 'XAF'), row('2026-05', 999, 'EUR', { deletedAt: 'D' })]
    const r = computeFinalizeIn(500, 'EUR', savings, RATES)
    expect(r.prevPool).toBe(100)
    expect(r.saved).toBe(400)
    expect(r.missing).toEqual(['XAF'])
  })
})

describe('thresholdScale', () => {
  it('is 1 in the calibration currency and without rates', () => {
    expect(thresholdScale(RATES, 'EUR')).toBe(1)
    expect(thresholdScale(null, 'AMD')).toBe(1)
  })

  it('is display units per euro otherwise', () => {
    expect(thresholdScale(RATES, 'AMD')).toBeCloseTo(430, 9)
    expect(thresholdScale(RATES_USD_BASE, 'USD')).toBeCloseTo(1.1, 9)
  })
})

describe('previewCurrencySwitch', () => {
  // The rate from the request: ֏25 000 → €61.34.
  const AMD_RATES: ExchangeRates = {
    base: 'EUR',
    date: '2026-10-01',
    values: { amd: 25000 / 61.34, usd: 1.1 },
  }

  it('illustrates the balance in its own currency → the new display currency', () => {
    const p = previewCurrencySwitch(
      source({ currency: 'AMD', bank: 25000, bankCurrency: 'AMD' }),
      'EUR',
      AMD_RATES,
    )
    expect(p.from).toBe('AMD')
    expect(p.to).toBe('EUR')
    expect(p.rows).toHaveLength(1)
    expect(p.rows[0]!.key).toBe('balance')
    expect(p.rows[0]!.from).toEqual({ amount: 25000, currency: 'AMD' })
    expect(p.rows[0]!.to.currency).toBe('EUR')
    expect(p.rows[0]!.to.amount).toBeCloseTo(61.34, 9)
    expect(p.rate).toBeCloseTo(61.34 / 25000, 12)
    expect(p.missing).toEqual([])
  })

  it('shows a balance kept in a third currency as its native amount', () => {
    const p = previewCurrencySwitch(
      source({ currency: 'EUR', bank: 110, bankCurrency: 'USD' }),
      'AMD',
      RATES,
    )
    expect(p.rows[0]!.from).toEqual({ amount: 110, currency: 'USD' })
    expect(p.rows[0]!.to.amount).toBeCloseTo(43000, 6)
  })

  it('with several accounts shows the total as today → after the switch', () => {
    const p = previewCurrencySwitch(
      source({ currency: 'EUR', accounts: [account('a', 1000), account('b', 43000, 'AMD')] }),
      'AMD',
      RATES,
    )
    expect(p.rows[0]!.key).toBe('balance')
    expect(p.rows[0]!.from.currency).toBe('EUR')
    expect(p.rows[0]!.from.amount).toBeCloseTo(1100, 9)
    expect(p.rows[0]!.to.amount).toBeCloseTo(473000, 6)
  })

  it('a deleted extra account does not turn a single account into a total', () => {
    const p = previewCurrencySwitch(
      source({ currency: 'AMD', accounts: [account('a', 25000, 'AMD'), account('b', 9, 'EUR', { deletedAt: 'D' })] }),
      'EUR',
      RATES,
    )
    expect(p.rows[0]!.from).toEqual({ amount: 25000, currency: 'AMD' })
  })

  it('shows fixed expenses left and savings as today → after the switch', () => {
    const p = previewCurrencySwitch(
      source({
        categories: [cat('rent', { budget: 500, spent: 100 }), cat('paid', { budget: 50, done: true })],
        savings: [row('2026-08', 200), row('2026-09', 100)],
      }),
      'AMD',
      RATES,
    )
    expect(p.rows.map(r => r.key)).toEqual(['fixed', 'savings'])
    expect(p.rows[0]!.from).toEqual({ amount: 400, currency: 'EUR' })
    expect(p.rows[0]!.to.amount).toBeCloseTo(172000, 6)
    expect(p.rows[1]!.from).toEqual({ amount: 300, currency: 'EUR' })
    expect(p.rows[1]!.to.amount).toBeCloseTo(129000, 6)
  })

  it('a row already in the new currency converts to itself', () => {
    const p = previewCurrencySwitch(
      source({ currency: 'EUR', bank: 50000, bankCurrency: 'AMD' }),
      'AMD',
      RATES,
    )
    expect(p.rows[0]!.from).toEqual({ amount: 50000, currency: 'AMD' })
    expect(p.rows[0]!.to).toEqual({ amount: 50000, currency: 'AMD' })
  })

  it('falls back to a round ≈100 € sample when there are no figures yet', () => {
    const eurToAmd = previewCurrencySwitch(source(), 'AMD', RATES)
    expect(eurToAmd.rows).toHaveLength(1)
    expect(eurToAmd.rows[0]!.key).toBe('sample')
    expect(eurToAmd.rows[0]!.from).toEqual({ amount: 100, currency: 'EUR' })
    expect(eurToAmd.rows[0]!.to.amount).toBeCloseTo(43000, 6)

    // From drams the sample is ≈100 € worth of drams, not a meaningless ֏100.
    const amdToEur = previewCurrencySwitch(source({ currency: 'AMD' }), 'EUR', RATES)
    expect(amdToEur.rows[0]!.from).toEqual({ amount: 43000, currency: 'AMD' })
    expect(amdToEur.rows[0]!.to.amount).toBeCloseTo(100, 9)
  })

  it('without rates shows no (wrong) figures and reports what is missing', () => {
    const p = previewCurrencySwitch(source({ bank: 1500 }), 'AMD', null)
    expect(p.rate).toBeNull()
    expect(p.rows).toEqual([])
    expect(p.missing).toEqual(['EUR'])
  })

  it('hides the figures when one stored currency has no rate', () => {
    const p = previewCurrencySwitch(
      source({ bank: 100, categories: [cat('x', { budget: 5, currency: 'XAF' })] }),
      'AMD',
      RATES,
    )
    expect(p.rate).toBeCloseTo(430, 9)
    expect(p.rows).toEqual([])
    expect(p.missing).toEqual(['XAF'])
  })

  it('changes nothing in the data it previews', () => {
    const s = source({ bank: 1500, categories: [cat('rent', { budget: 500 })] })
    const snapshot = JSON.stringify(s)
    previewCurrencySwitch(s, 'AMD', RATES)
    expect(JSON.stringify(s)).toBe(snapshot)
  })
})
