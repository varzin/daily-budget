import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import MathField from './MathField'

/**
 * A money input that doubles as a calculator. The *formula* is the source of
 * truth (`value`). While focused it shows the raw expression; on blur, if the
 * expression contains math operators and evaluates cleanly, it shows the
 * rounded result. An unparseable expression sets `aria-invalid`.
 *
 * It's controlled, so each story wires up local state via `render`.
 */
const meta: Meta<typeof MathField> = {
  title: 'UI/MathField',
  component: MathField,
  argTypes: {
    value: { control: false },
    onChange: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof MathField>

function Controlled({ initial, ...props }: { initial: string } & Omit<
  React.ComponentProps<typeof MathField>,
  'value' | 'onChange'
>) {
  const [value, setValue] = useState(initial)
  return (
    <div style={{ minWidth: 260 }}>
      <MathField {...props} value={value} onChange={setValue} />
      <p style={{ marginTop: 8, font: '400 12px "JetBrains Mono", monospace', color: 'var(--text-dim)' }}>
        stored formula: <code>{value || '(empty)'}</code>
      </p>
    </div>
  )
}

/** Empty field showing only its placeholder. */
export const EmptyPlaceholder: Story = {
  render: () => <Controlled initial="" label="Budget" prefix="€" placeholder="0" />,
}

/** A plain number — no math, shown as-is. */
export const PlainNumber: Story = {
  render: () => <Controlled initial="42" label="Budget" prefix="€" />,
}

/**
 * A math expression. Focus the field to see the raw `100 + 50 * 2` formula;
 * blur it (click elsewhere) and it collapses to the evaluated result.
 */
export const MathExpressionFocused: Story = {
  name: 'Math expression (focus to edit)',
  render: () => <Controlled initial="100 + 50 * 2" label="Budget" prefix="€" autoFocus />,
}

/** Same expression rendered blurred — shows the evaluated result (200). */
export const MathExpressionEvaluated: Story = {
  render: () => <Controlled initial="100 + 50 * 2" label="Budget" prefix="€" />,
}

/** An invalid expression — sets aria-invalid and keeps the raw text. */
export const Invalid: Story = {
  render: () => <Controlled initial="10 + * 5" label="Budget" prefix="€" />,
}
