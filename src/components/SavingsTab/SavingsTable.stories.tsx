import { useEffect } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import SavingsTable from './SavingsTable'
import { useBudgetStore } from '../../store/budgetStore'
import type { SavingsRow } from '../../types'

/**
 * The savings history table — one row per month with a saved-amount input, the
 * running end-of-month balance, and a colour-coded tier indicator (hover the
 * dot for the legend). Reads the real budgetStore, so stories seed `savings`
 * via a decorator and restore it on unmount.
 */
const meta = {
  title: 'Savings/SavingsTable',
  component: SavingsTable,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SavingsTable>

export default meta
type Story = StoryObj<typeof meta>

const SAMPLE: SavingsRow[] = [
  { id: 'a', month: '2026-01', saved: 600 },
  { id: 'b', month: '2026-02', saved: 250 },
  { id: 'c', month: '2026-03', saved: 40 },
  { id: 'd', month: '2026-04', saved: 0 },
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
