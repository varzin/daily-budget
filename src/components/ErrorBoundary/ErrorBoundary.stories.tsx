import type { Meta, StoryObj } from '@storybook/react-vite'
import ErrorBoundary from './ErrorBoundary'

/**
 * Last-resort guard around the app. When a child throws during render it shows
 * a recoverable fallback ("Something went wrong" + Reload) instead of a blank
 * page. The fallback story renders a child that throws on mount.
 *
 * Note: React logs the caught error to the console — that is expected here.
 */
const meta: Meta<typeof ErrorBoundary> = {
  title: 'App/ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

function Boom(): never {
  throw new Error('Simulated render error')
}

/** The fallback UI shown after a child throws. */
export const Fallback: Story = {
  render: () => (
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  ),
}

/** Normal pass-through: children render when nothing throws. */
export const HappyPath: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{ padding: 40 }}>Children render normally when there's no error.</div>
    </ErrorBoundary>
  ),
}
