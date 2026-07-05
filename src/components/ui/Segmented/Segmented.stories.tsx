import { useState } from 'react'
import { Monitor, Sun, Moon } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Segmented, { type SegmentedOption } from './Segmented'

/**
 * A segmented control — a WAI-ARIA radiogroup with a sliding highlight, roving
 * tabindex and arrow-key navigation (try Left/Right/Home/End after clicking an
 * option). Generic over the value type; controlled via `value`/`onChange`.
 */
const meta: Meta<typeof Segmented<string>> = {
  title: 'UI/Segmented',
  component: Segmented,
  argTypes: {
    value: { control: false },
    onChange: { control: false },
    options: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof Segmented<string>>

function Controlled<T extends string>({
  initial,
  options,
  ariaLabel,
}: {
  initial: T
  options: SegmentedOption<T>[]
  ariaLabel: string
}) {
  const [value, setValue] = useState<T>(initial)
  return (
    <div style={{ minWidth: 320 }}>
      <Segmented ariaLabel={ariaLabel} value={value} onChange={setValue} options={options} />
    </div>
  )
}

const TWO: SegmentedOption<'list' | 'chart'>[] = [
  { value: 'list', label: 'List' },
  { value: 'chart', label: 'Chart' },
]

const THREE: SegmentedOption<'system' | 'light' | 'dark'>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const THREE_ICONS: SegmentedOption<'system' | 'light' | 'dark'>[] = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
]

export const TwoOptions: Story = {
  render: () => <Controlled initial="list" options={TWO} ariaLabel="View" />,
}

export const ThreeOptions: Story = {
  render: () => <Controlled initial="system" options={THREE} ariaLabel="Theme" />,
}

export const WithIcons: Story = {
  render: () => <Controlled initial="dark" options={THREE_ICONS} ariaLabel="Theme" />,
}

/** A different option pre-selected, to show the highlight position. */
export const MiddleSelected: Story = {
  render: () => <Controlled initial="light" options={THREE_ICONS} ariaLabel="Theme" />,
}

const WITH_DISABLED: SegmentedOption<'grow' | 'keep' | 'spend'>[] = [
  { value: 'grow', label: 'Grow savings', disabled: true },
  { value: 'keep', label: 'Keep savings' },
  { value: 'spend', label: 'Spend savings' },
]

/**
 * Disabled options render dimmed, ignore clicks and are skipped by arrow-key
 * navigation (the dashboard widget blocks modes this way). Long labels also
 * show the measured thumb: segments may grow past an equal split, the
 * highlight still hugs the active one.
 */
export const WithDisabledOption: Story = {
  render: () => <Controlled initial="keep" options={WITH_DISABLED} ariaLabel="Daily budget mode" />,
}
