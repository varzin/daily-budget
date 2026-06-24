import { useEffect } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import SavingsChart from './SavingsChart'
import { useBudgetStore } from '../../store/budgetStore'
import type { SavingsRow } from '../../types'

/**
 * The savings balance chart (chart.js line chart with per-point tier colours
 * and value labels). Theme-aware: it reads colours live from the CSS tokens,
 * so flipping the toolbar theme repaints it. Seeds `savings` via a decorator.
 */
const meta = {
  title: 'Savings/SavingsChart',
  component: SavingsChart,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SavingsChart>

export default meta
type Story = StoryObj<typeof meta>

const SAMPLE: SavingsRow[] = [
  { id: 'a', month: '2026-01', saved: 600 },
  { id: 'b', month: '2026-02', saved: 300 },
  { id: 'c', month: '2026-03', saved: 450 },
  { id: 'd', month: '2026-04', saved: 120 },
  { id: 'e', month: '2026-05', saved: 700 },
  { id: 'f', month: '2026-06', saved: 250 },
]

function withSavings(rows: SavingsRow[]): Decorator {
  return function Seeded(Story) {
    useEffect(() => {
      const prev = useBudgetStore.getState().savings
      useBudgetStore.setState({ savings: rows })
      return () => useBudgetStore.setState({ savings: prev })
    }, [])
    return (
      <div style={{ width: 520, height: 320 }}>
        <Story />
      </div>
    )
  }
}

/** Six months of data — the range slider appears at 3+ points. */
export const WithData: Story = {
  decorators: [withSavings(SAMPLE)],
}

/** A short two-point series (no range slider). */
export const FewPoints: Story = {
  decorators: [withSavings(SAMPLE.slice(0, 2))],
}

/** Empty state. */
export const Empty: Story = {
  decorators: [withSavings([])],
}
