import { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Toasts from './Toasts'
import { showToast, useToastStore, type ShowToastOptions } from '../../../store/toastStore'

/**
 * The toast viewport. It reads the real `toastStore`, so these stories seed it
 * through the store's public API (`showToast`) on mount and clear it on
 * unmount. A long `duration` keeps each toast visible while you inspect it
 * (the app uses 6s / 9s auto-dismiss).
 */
const meta = {
  title: 'UI/Toast',
  component: Toasts,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Toasts>

export default meta
type Story = StoryObj<typeof meta>

const LONG = 1_000_000

/** Seeds the toast store on mount and resets it on unmount. */
function seed(toasts: ShowToastOptions[]) {
  return function Seeded() {
    useEffect(() => {
      useToastStore.setState({ toasts: [] })
      toasts.forEach((t) => showToast({ duration: LONG, ...t }))
      return () => useToastStore.setState({ toasts: [] })
    }, [])
    return <Toasts />
  }
}

export const SingleInfo: Story = {
  render: seed([{ message: 'Import complete' }]),
}

export const ErrorTone: Story = {
  render: seed([{ message: 'Import failed: unexpected end of JSON', tone: 'error' }]),
}

export const WithUndoAction: Story = {
  render: seed([
    { message: 'Deleted 2026-05', actionLabel: 'Undo', onAction: () => {} },
  ]),
}

/** The stack caps at three (oldest dropped). */
export const MultipleStacked: Story = {
  render: seed([
    { message: 'Saved balance' },
    { message: 'Deleted Groceries', actionLabel: 'Undo', onAction: () => {} },
    { message: 'Sync error — will retry', tone: 'error' },
  ]),
}
