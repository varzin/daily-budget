import type { Meta, StoryObj } from '@storybook/react-vite'
import DataCard from './DataCard'

/**
 * Settings → Data. Manual JSON export / import. Export triggers a file
 * download; import opens a file picker and surfaces the outcome via a toast.
 * Purely an IO shell — the visible surface is the two buttons and the intro
 * copy.
 */
const meta = {
  title: 'Settings/DataCard',
  component: DataCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DataCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
