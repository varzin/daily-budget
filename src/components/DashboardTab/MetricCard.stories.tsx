import type { Meta, StoryObj } from '@storybook/react-vite'
import MetricCard from './MetricCard'

/**
 * The dashboard metric tile. A `tone` paints the accent (the situation widget
 * picks teal/green/orange/deficit), `featured` gives the hero treatment (large
 * serif italic, full width). Symbol + value + optional subtitle.
 */
const meta = {
  title: 'Dashboard/MetricCard',
  component: MetricCard,
  parameters: { layout: 'padded' },
  args: {
    label: 'Daily budget',
    symbol: '€',
    value: '42.50',
    featured: false,
  },
  argTypes: {
    tone: {
      control: 'select',
      options: [undefined, 'green', 'teal', 'yellow', 'orange', 'blue', 'deficit'],
    },
    featured: { control: 'boolean' },
    label: { control: 'text' },
    value: { control: 'text' },
    symbol: { control: 'text' },
    subtitle: { control: 'text' },
  },
} satisfies Meta<typeof MetricCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Featured: Story = {
  args: { featured: true, label: 'You can spend today', value: '38.00', subtitle: 'until your next income day' },
}

export const ToneGreen: Story = {
  args: { tone: 'green', label: 'On track', value: '42.50' },
}

export const ToneTeal: Story = {
  args: { tone: 'teal', featured: true, label: 'Ahead of plan', value: '55.00', subtitle: 'keeping the full cushion' },
}

export const ToneOrange: Story = {
  args: { tone: 'orange', featured: true, label: 'Dipping into savings', value: '28.00' },
}

export const Deficit: Story = {
  args: { tone: 'deficit', featured: true, label: 'Over budget', value: '-12.00', subtitle: 'spending exceeds plan + cushion' },
}

export const WithSubtitle: Story = {
  args: { label: 'Per day (green)', value: '40.00', subtitle: 'keeps your cushion intact' },
}

/** Every tone in a grid for a quick palette check. */
export const AllTones: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {(['green', 'teal', 'yellow', 'orange', 'blue', 'deficit'] as const).map((tone) => (
        <MetricCard key={tone} tone={tone} label={tone} symbol="€" value="42.50" />
      ))}
    </div>
  ),
}
