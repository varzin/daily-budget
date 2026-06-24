import type { Meta, StoryObj } from '@storybook/react-vite'
import StorageCard from './StorageCard'

/**
 * Settings → Storage. Reports whether on-device storage is persistent
 * (`navigator.storage.persisted()`) and the usage/quota estimate. The reported
 * status reflects the real browser running Storybook, so it'll typically show
 * "best-effort" or "not reportable".
 */
const meta = {
  title: 'Settings/StorageCard',
  component: StorageCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof StorageCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
