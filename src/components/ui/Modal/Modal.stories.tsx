import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Modal from './Modal'
import Button from '../Button/Button'

/**
 * A focus-trapping dialog rendered via `createPortal` to `document.body`. Esc
 * and backdrop-click close it; focus returns to the trigger on close. Stories
 * render it open so you can see (and tab through) it directly.
 */
const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: false },
    onClose: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

function InteractiveModal() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ padding: 40 }}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit category"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <p>Body content goes here. Tab is trapped inside the dialog.</p>
      </Modal>
    </div>
  )
}

/** Interactive: a trigger that opens the modal, demonstrating focus return. */
export const Interactive: Story = {
  render: () => <InteractiveModal />,
}

function FooterModal() {
  const [open, setOpen] = useState(true)
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Finalize month?"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Finalize
          </Button>
        </>
      }
    >
      <p>This snapshots the current balance into your savings history.</p>
    </Modal>
  )
}

/** Open by default, with a title, body and footer. */
export const OpenWithFooter: Story = {
  render: () => <FooterModal />,
}

function NoTitleModal() {
  const [open, setOpen] = useState(true)
  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <p>A bare modal with no header and no footer — only body content.</p>
      <div style={{ marginTop: 16 }}>
        <Button onClick={() => setOpen(false)}>Got it</Button>
      </div>
    </Modal>
  )
}

/** No title — just body content. */
export const WithoutTitle: Story = {
  render: () => <NoTitleModal />,
}

function LongModal() {
  const [open, setOpen] = useState(true)
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Terms"
      footer={<Button variant="primary" onClick={() => setOpen(false)}>Close</Button>}
    >
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Paragraph {i + 1} — scroll to read the rest of this long body.</p>
      ))}
    </Modal>
  )
}

/** Long content that scrolls inside the dialog body. */
export const LongScrollingContent: Story = {
  render: () => <LongModal />,
}
