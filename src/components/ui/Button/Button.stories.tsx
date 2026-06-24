import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import Button from './Button'

/**
 * The app's primary button. Four variants × two sizes, plus `block` and
 * `disabled`. Accepts any button HTML attributes and an optional lucide icon
 * as part of its children.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Button',
    variant: 'secondary',
    size: 'md',
    block: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    block: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Primary: Story = {
  args: { variant: 'primary', children: 'Save' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Dismiss' },
}

export const SmallSize: Story = {
  args: { size: 'sm', children: 'Small' },
}

export const Block: Story = {
  args: { variant: 'primary', block: true, children: 'Full width' },
  parameters: { layout: 'padded' },
}

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Unavailable' },
}

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    children: (
      <>
        <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add category
      </>
    ),
  },
}

/** Every variant side by side for a quick visual diff. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
}
