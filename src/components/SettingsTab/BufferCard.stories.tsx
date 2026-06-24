import { useEffect } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import BufferCard from './BufferCard'
import { useBudgetStore } from '../../store/budgetStore'

/**
 * Settings → Budget. Currency picker + the cushion (desired month-end balance)
 * + optional monthly income for the pace indicator. All are synced scalars on
 * the budgetStore; the stories seed values and restore them on unmount.
 */
const meta = {
  title: 'Settings/BufferCard',
  component: BufferCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof BufferCard>

export default meta
type Story = StoryObj<typeof meta>

function withScalars(values: { currency: string; buffer: number; monthlyIncome: number }): Decorator {
  return function Seeded(Story) {
    useEffect(() => {
      const s = useBudgetStore.getState()
      const prev = { currency: s.currency, buffer: s.buffer, monthlyIncome: s.monthlyIncome }
      useBudgetStore.setState(values)
      return () => useBudgetStore.setState(prev)
    }, [])
    return (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    )
  }
}

/** Cushion and income both set (EUR). */
export const Filled: Story = {
  decorators: [withScalars({ currency: 'EUR', buffer: 500, monthlyIncome: 3200 })],
}

/** Defaults — empty cushion and no income (indicator hidden in the app). */
export const Empty: Story = {
  decorators: [withScalars({ currency: 'EUR', buffer: 0, monthlyIncome: 0 })],
}

/** A non-euro currency to show the symbol propagating to the prefixes. */
export const UsdCurrency: Story = {
  decorators: [withScalars({ currency: 'USD', buffer: 800, monthlyIncome: 0 })],
}
