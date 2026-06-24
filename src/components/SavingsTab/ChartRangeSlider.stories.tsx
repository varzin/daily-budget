import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import ChartRangeSlider from './ChartRangeSlider'

/**
 * Dual-handle range slider (two overlaid native range inputs). Controlled via
 * a `[lo, hi]` tuple; handles can't cross. Used to pick the visible window of
 * the savings chart.
 */
const meta: Meta<typeof ChartRangeSlider> = {
  title: 'Savings/ChartRangeSlider',
  component: ChartRangeSlider,
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: false },
    onChange: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof ChartRangeSlider>

function Controlled({ min, max, initial }: { min: number; max: number; initial: [number, number] }) {
  const [value, setValue] = useState<[number, number]>(initial)
  return (
    <div style={{ minWidth: 320 }}>
      <ChartRangeSlider min={min} max={max} value={value} onChange={setValue} />
      <p style={{ marginTop: 12, font: '400 12px "JetBrains Mono", monospace', color: 'var(--text-dim)' }}>
        [{value[0]}, {value[1]}]
      </p>
    </div>
  )
}

export const FullRange: Story = {
  render: () => <Controlled min={0} max={11} initial={[0, 11]} />,
}

export const PartialWindow: Story = {
  render: () => <Controlled min={0} max={11} initial={[3, 8]} />,
}

export const Collapsed: Story = {
  render: () => <Controlled min={0} max={11} initial={[5, 5]} />,
}
