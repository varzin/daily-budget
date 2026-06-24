import type { Meta, StoryObj } from '@storybook/react-vite'
import TextField from './TextField'

/**
 * Labelled text input with optional prefix/suffix adornments (e.g. a currency
 * symbol). Forwards every native input attribute, so `disabled`,
 * `aria-invalid`, `inputMode`, etc. all work.
 */
const meta = {
  title: 'UI/TextField',
  component: TextField,
  args: {
    placeholder: 'Type here…',
    fullWidth: false,
    alignRight: false,
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    fullWidth: { control: 'boolean' },
    alignRight: { control: 'boolean' },
    disabled: { control: 'boolean' },
    prefix: { control: false },
    suffix: { control: false },
  },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLabel: Story = {
  args: { label: 'Current balance', placeholder: '0' },
}

export const WithPrefix: Story = {
  args: { label: 'Amount', prefix: '€', placeholder: '0', inputMode: 'decimal' },
}

export const WithSuffix: Story = {
  args: { label: 'Rate', suffix: '%', placeholder: '0' },
}

export const FullWidth: Story = {
  parameters: { layout: 'padded' },
  args: { label: 'Note', fullWidth: true, placeholder: 'Spans the container' },
}

export const AlignRight: Story = {
  args: {
    label: 'Saved this month',
    prefix: '€',
    alignRight: true,
    defaultValue: '1234.56',
    inputMode: 'decimal',
  },
}

export const Placeholder: Story = {
  args: { placeholder: 'Search categories' },
}

export const Disabled: Story = {
  args: { label: 'Locked field', defaultValue: 'Read only', disabled: true },
}

export const Invalid: Story = {
  args: {
    label: 'Email',
    defaultValue: 'not-an-email',
    'aria-invalid': true,
  },
}
