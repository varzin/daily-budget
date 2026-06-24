import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import ConfirmModal from './ConfirmModal'
import Button from '../Button/Button'

/**
 * Themed replacement for `window.confirm()`, built on Modal. A `danger` flag
 * renders the confirm button in the destructive style; labels are
 * customisable. Confirming runs `onConfirm` then closes.
 */
const meta: Meta<typeof ConfirmModal> = {
  title: 'UI/ConfirmModal',
  component: ConfirmModal,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: false },
    onClose: { control: false },
    onConfirm: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof ConfirmModal>

function DefaultConfirm() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ padding: 40 }}>
      <Button onClick={() => setOpen(true)}>Reopen</Button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {}}
        title="Connect to Dropbox?"
        confirmLabel="Connect"
      >
        <p>Your budget will be saved to a private Apps/daily-budget folder.</p>
      </ConfirmModal>
    </div>
  )
}

/** Default: a neutral primary confirm. */
export const Default: Story = {
  render: () => <DefaultConfirm />,
}

function DangerConfirm() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ padding: 40 }}>
      <Button onClick={() => setOpen(true)}>Reopen</Button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {}}
        title="Disconnect from Dropbox?"
        confirmLabel="Disconnect"
        danger
      >
        <p>Local data stays on this device. The file in Dropbox is not deleted.</p>
      </ConfirmModal>
    </div>
  )
}

/** Destructive variant — confirm button is red. */
export const Danger: Story = {
  render: () => <DangerConfirm />,
}

function CustomLabelsConfirm() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ padding: 40 }}>
      <Button onClick={() => setOpen(true)}>Reopen</Button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {}}
        title="Finalize month?"
        confirmLabel="Yes, finalize"
        cancelLabel="Not yet"
      >
        <p>(balance − fixed − savings) ÷ days left is snapshotted into history.</p>
      </ConfirmModal>
    </div>
  )
}

/** Custom cancel and confirm labels. */
export const CustomLabels: Story = {
  render: () => <CustomLabelsConfirm />,
}
