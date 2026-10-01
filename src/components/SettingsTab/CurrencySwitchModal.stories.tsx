import { useEffect } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import CurrencySwitchModal from './CurrencySwitchModal'
import { useBudgetStore } from '../../store/budgetStore'
import type { BudgetState, ExchangeRates } from '../../types'

/**
 * Confirmation shown before switching the display currency: explains that no
 * amount is rewritten and illustrates the conversion on the user's own figures
 * at today's rate. The stories seed the store and restore it on unmount.
 */
const meta = {
  title: 'Settings/CurrencySwitchModal',
  component: CurrencySwitchModal,
  parameters: { layout: 'centered' },
  args: { onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof CurrencySwitchModal>

export default meta
type Story = StoryObj<typeof meta>

// 1 EUR = 407.56 AMD, so ֏25 000 → €61.34.
const RATES: ExchangeRates = {
  base: 'EUR',
  date: '2026-10-01',
  values: { amd: 25000 / 61.34, usd: 1.1 },
}

function withState(values: Partial<BudgetState>): Decorator {
  return function Seeded(Story) {
    useEffect(() => {
      const prev = useBudgetStore.getState()
      useBudgetStore.setState(values)
      return () => useBudgetStore.setState(prev)
    }, [])
    return <Story />
  }
}

/** Display AMD → EUR with a balance in drams: "֏25 000 → €61,34". */
export const BalanceInDrams: Story = {
  args: { to: 'EUR' },
  decorators: [
    withState({
      currency: 'AMD',
      accounts: [{ id: 'main', name: '', balance: 25000, currency: 'AMD' }],
      rates: RATES,
      categories: [
        { id: 'rent', name: 'Rent', budget: 120000, spent: 0, currency: 'AMD', done: false },
      ],
      savings: [{ id: 's', month: '2026-09', saved: 40000, currency: 'AMD' }],
    }),
  ],
}

/** No figures yet — a round sample amount illustrates the conversion. */
export const NoData: Story = {
  args: { to: 'AMD' },
  decorators: [withState({ currency: 'EUR', accounts: [{ id: 'main', name: '', balance: 0, currency: 'EUR' }], rates: RATES, categories: [], savings: [] })],
}

/** No cached rates — figures hidden, warning shown. */
export const NoRates: Story = {
  args: { to: 'AMD' },
  decorators: [withState({ currency: 'EUR', accounts: [{ id: 'main', name: '', balance: 1500, currency: 'EUR' }], rates: null })],
}
