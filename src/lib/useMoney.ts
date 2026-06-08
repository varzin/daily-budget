import { useBudgetStore } from '../store/budgetStore'
import { money, type Money } from './currency'

/**
 * React hook: currency symbol + locale-aware formatters bound to the store's
 * selected currency. Kept separate from lib/currency.ts (which is store-free) so
 * the store/persist layer can import currency helpers without an import cycle.
 */
export function useMoney(): Money {
  const code = useBudgetStore((s) => s.currency)
  return money(code)
}
