import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Toggle from './Toggle'

/**
 * A switch with an optional label + description. Controlled via
 * `checked`/`onChange`; stories use local state so the thumb actually slides.
 */
const meta: Meta<typeof Toggle> = {
  title: 'UI/Toggle',
  component: Toggle,
  argTypes: {
    checked: { control: false },
    onChange: { control: false },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Toggle>

function Controlled({ initial = false, ...props }: { initial?: boolean } & Omit<
  React.ComponentProps<typeof Toggle>,
  'checked' | 'onChange'
>) {
  const [checked, setChecked] = useState(initial)
  return (
    <div style={{ minWidth: 280 }}>
      <Toggle {...props} checked={checked} onChange={setChecked} />
    </div>
  )
}

export const Off: Story = {
  render: () => <Controlled initial={false} label="Notifications" />,
}

export const On: Story = {
  render: () => <Controlled initial label="Notifications" />,
}

export const DisabledOff: Story = {
  render: () => <Controlled initial={false} disabled label="Notifications" />,
}

export const DisabledOn: Story = {
  render: () => <Controlled initial disabled label="Notifications" />,
}

export const WithLabelAndDescription: Story = {
  render: () => (
    <Controlled
      initial
      label="Sync over cellular"
      description="Allow Dropbox to sync even when not on Wi-Fi."
    />
  ),
}

export const LabelOnly: Story = {
  render: () => <Controlled initial label="Compact mode" />,
}
