import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import BottomNav from './BottomNav'
import type { TabName } from '../../types'

/**
 * The bottom tab bar — a WAI-ARIA tablist with arrow-key navigation
 * (Left/Right/Up/Down/Home/End wrap). Each story pins a different active tab;
 * the Interactive story lets you click and key through them.
 */
const meta: Meta<typeof BottomNav> = {
  title: 'Navigation/BottomNav',
  component: BottomNav,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    active: { control: 'select', options: ['dashboard', 'obligatory', 'savings', 'settings'] },
    onChange: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof BottomNav>

const fixed = (active: TabName): Story => ({
  args: { active, onChange: () => {} },
})

export const Dashboard = fixed('dashboard')
export const FixedExpenses = fixed('obligatory')
export const Savings = fixed('savings')
export const Settings = fixed('settings')

function InteractiveNav() {
  const [active, setActive] = useState<TabName>('dashboard')
  return <BottomNav active={active} onChange={setActive} />
}

/** Click or arrow-key through the tabs. */
export const Interactive: Story = {
  render: () => <InteractiveNav />,
}
