import { useEffect } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import BackupNudge from './BackupNudge'
import { useBudgetStore } from '../../store/budgetStore'

/**
 * The header "Protect your data" chip. It shows only while the budget holds
 * meaningful data AND Dropbox sync is not connected (the default in Storybook).
 * Tapping it opens an explanation modal with Connect Dropbox / Download backup.
 * Seeds a non-empty balance so the chip is visible.
 */
const meta = {
  title: 'Header/BackupNudge',
  component: BackupNudge,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof BackupNudge>

export default meta
type Story = StoryObj<typeof meta>

const withBalance: Decorator = (Story) => {
  return (
    <SeedBalance>
      <Story />
    </SeedBalance>
  )
}

function SeedBalance({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = useBudgetStore.getState().bank
    useBudgetStore.setState({ bank: 1200 })
    return () => useBudgetStore.setState({ bank: prev })
  }, [])
  return <>{children}</>
}

/** The chip (click it to open the explanation modal). */
export const Chip: Story = {
  decorators: [withBalance],
}
