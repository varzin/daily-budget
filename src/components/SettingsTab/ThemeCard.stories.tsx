import type { Meta, StoryObj } from '@storybook/react-vite'
import ThemeCard from './ThemeCard'

/**
 * Settings → Appearance. A segmented System/Light/Dark control bound to the
 * themeStore. Changing it here drives `<html data-theme>` app-wide (and will
 * fight the Storybook theme toolbar, which sets the same attribute).
 */
const meta = {
  title: 'Settings/ThemeCard',
  component: ThemeCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ThemeCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
