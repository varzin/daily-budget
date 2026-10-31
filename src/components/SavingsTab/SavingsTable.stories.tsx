import { useEffect } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import SavingsTable from './SavingsTable'
import { useBudgetStore } from '../../store/budgetStore'
import type { SavingsRow } from '../../types'

/**
 * The savings history table — one row per month with the saved amount in its
 * own currency, the running end-of-month balance, and a colour-coded tier
 * indicator (hover the dot for the legend). Tapping a row calls `onEdit`, which
 * opens the row editor in the Savings tab. Reads the real budgetStore, so stories seed `savings`
 * via a decorator and restore it on unmount.
 */
const meta = {
  title: 'Savings/SavingsTable',
  component: SavingsTable,
  parameters: { layout: 'padded' },
  args: { onEdit: fn() },
} satisfies Meta<typeof SavingsTable>

export default meta
type Story = StoryObj<typeof meta>

const SAMPLE: SavingsRow[] = [
  { id: 'a', month: '2026-01', saved: 600, currency: 'EUR' },
  { id: 'b', month: '2026-02', saved: 250, currency: 'EUR' },
  { id: 'c', month: '2026-03', saved: 40, currency: 'EUR' },
  { id: 'd', month: '2026-04', saved: -90, currency: 'EUR' },
  { id: 'e', month: '2026-05', saved: 2876, currency: 'USD' },
]

function withSavings(rows: SavingsRow[]): Decorator {
  return function Seeded(Story) {
    useEffect(() => {
      const prev = useBudgetStore.getState().savings
      useBudgetStore.setState({ savings: rows })
      return () => useBudgetStore.setState({ savings: prev })
    }, [])
    return <Story />
  }
}

/** Several months covering every indicator tier (blue/green/yellow/red). */
export const WithData: Story = {
  decorators: [withSavings(SAMPLE)],
}

/** Empty state — the prompt to add a row. */
export const Empty: Story = {
  decorators: [withSavings([])],
}
