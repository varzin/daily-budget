import { useMemo } from 'react'
import { useBudgetStore } from '../store/budgetStore'
import { projectToDisplay, thresholdScale, type DisplayBudget } from './convert'

/**
 * React hook: every stored amount projected into the display currency at the
 * cached rates (lib/convert.ts `projectToDisplay`). Totals, the forecast and
 * the savings ledger read from this; editors keep working on the raw, tagged
 * amounts. Recomputed only when an input changes.
 */
export function useDisplayBudget(): DisplayBudget {
  const currency = useBudgetStore((s) => s.currency)
  const accounts = useBudgetStore((s) => s.accounts)
  const buffer = useBudgetStore((s) => s.buffer)
  const bufferCurrency = useBudgetStore((s) => s.bufferCurrency)
  const monthlyIncome = useBudgetStore((s) => s.monthlyIncome)
  const monthlyIncomeCurrency = useBudgetStore((s) => s.monthlyIncomeCurrency)
  const categories = useBudgetStore((s) => s.categories)
  const savings = useBudgetStore((s) => s.savings)
  const rates = useBudgetStore((s) => s.rates)
  return useMemo(
    () =>
      projectToDisplay(
        {
          currency,
          accounts,
          buffer,
          bufferCurrency,
          monthlyIncome,
          monthlyIncomeCurrency,
          categories,
          savings,
        },
        rates,
      ),
    [
      currency,
      accounts,
      buffer,
      bufferCurrency,
      monthlyIncome,
      monthlyIncomeCurrency,
      categories,
      savings,
      rates,
    ],
  )
}

/** Display units per one threshold-calibration unit (see thresholdScale). */
export function useThresholdScale(): number {
  const currency = useBudgetStore((s) => s.currency)
  const rates = useBudgetStore((s) => s.rates)
  return useMemo(() => thresholdScale(rates, currency), [rates, currency])
}
