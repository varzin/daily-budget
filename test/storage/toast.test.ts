/**
 * Toast store (CLAUDE.md §"Замена нативных диалогов"): the queue holds at most
 * a few toasts, auto-dismisses them after their duration, and an action (Undo)
 * runs once and dismisses its toast.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useToastStore,
  showToast,
  dismissToast,
  actToast,
  TOAST_DURATION,
  ERROR_TOAST_DURATION,
} from '../../src/store/toastStore'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  // Drain pending auto-dismiss timers so state doesn't leak across tests.
  vi.runAllTimers()
  vi.useRealTimers()
})

const toasts = () => useToastStore.getState().toasts

describe('toast store', () => {
  it('shows and auto-dismisses after the default duration', () => {
    showToast({ message: 'Deleted' })
    expect(toasts()).toHaveLength(1)
    vi.advanceTimersByTime(TOAST_DURATION - 1)
    expect(toasts()).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts()).toHaveLength(0)
  })

  it('keeps error toasts around longer', () => {
    showToast({ message: 'Import failed', tone: 'error' })
    vi.advanceTimersByTime(TOAST_DURATION)
    expect(toasts()).toHaveLength(1)
    vi.advanceTimersByTime(ERROR_TOAST_DURATION - TOAST_DURATION)
    expect(toasts()).toHaveLength(0)
  })

  it('dismisses on demand', () => {
    const id = showToast({ message: 'Deleted' })
    dismissToast(id)
    expect(toasts()).toHaveLength(0)
  })

  it('runs the action once and dismisses (Undo)', () => {
    const onAction = vi.fn()
    const id = showToast({ message: 'Deleted', actionLabel: 'Undo', onAction })
    actToast(id)
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(toasts()).toHaveLength(0)
    // A second act on the gone toast is a no-op.
    actToast(id)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('caps the stack, dropping the oldest toast', () => {
    showToast({ message: '1' })
    showToast({ message: '2' })
    showToast({ message: '3' })
    showToast({ message: '4' })
    expect(toasts().map((t) => t.message)).toEqual(['2', '3', '4'])
  })
})
