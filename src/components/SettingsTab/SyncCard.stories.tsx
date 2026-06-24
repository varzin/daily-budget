import type { Meta, StoryObj } from '@storybook/react-vite'
import SyncCard from './SyncCard'

/**
 * Settings → Sync. Reads the live Dropbox sync state, which in Storybook is
 * always `not_connected` (no OAuth), so this renders the disconnected card.
 * Clicking "Connect Dropbox" opens the themed ConfirmModal (the OAuth redirect
 * itself doesn't run here). The connected layout requires a real Dropbox
 * session and can't be reproduced without mocking the private sync module.
 */
const meta = {
  title: 'Settings/SyncCard',
  component: SyncCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SyncCard>

export default meta
type Story = StoryObj<typeof meta>

/** Disconnected state with the Connect Dropbox confirm flow. */
export const Disconnected: Story = {}
