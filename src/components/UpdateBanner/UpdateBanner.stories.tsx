import { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import UpdateBanner from './UpdateBanner'
import { PWA_NEED_REFRESH_EVENT } from '../../lib/pwa'

/**
 * The "new version available" banner. It's normally hidden and only appears
 * after the PWA service worker fires `PWA_NEED_REFRESH_EVENT`. The visible
 * story dispatches that event on mount to surface it (Reload is wired to the
 * real PWA updater, which is a no-op outside the app).
 */
const meta = {
  title: 'App/UpdateBanner',
  component: UpdateBanner,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof UpdateBanner>

export default meta
type Story = StoryObj<typeof meta>

function VisibleBanner() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PWA_NEED_REFRESH_EVENT))
  }, [])
  return (
    <div style={{ minHeight: 160 }}>
      <UpdateBanner />
    </div>
  )
}

export const Visible: Story = {
  render: () => <VisibleBanner />,
}
