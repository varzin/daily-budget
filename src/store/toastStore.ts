import { create } from 'zustand'
import { uid } from '../lib/utils'

/**
 * Lightweight toast notifications (CLAUDE.md §"Замена нативных диалогов").
 * Deletions show a toast with Undo instead of a blocking confirm(); import
 * errors show an error toast instead of alert(). Rendered by
 * `components/ui/Toast/Toasts.tsx`, mounted once in App.
 */

export type ToastTone = 'default' | 'error'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
  actionLabel?: string
  onAction?: () => void
}

interface ToastStore {
  toasts: Toast[]
}

/** How long a toast lingers. Undo-able toasts use the default; errors longer. */
export const TOAST_DURATION = 6000
export const ERROR_TOAST_DURATION = 9000

/** Keep the stack shallow — older toasts are dropped, not queued. */
const MAX_TOASTS = 3

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastStore>()(() => ({ toasts: [] }))

export interface ShowToastOptions {
  message: string
  tone?: ToastTone
  actionLabel?: string
  onAction?: () => void
  /** Auto-dismiss delay in ms; defaults by tone. */
  duration?: number
}

export function showToast(opts: ShowToastOptions): string {
  const toast: Toast = {
    id: uid(),
    message: opts.message,
    tone: opts.tone ?? 'default',
    actionLabel: opts.actionLabel,
    onAction: opts.onAction,
  }
  useToastStore.setState((s) => {
    const next = [...s.toasts, toast]
    for (const dropped of next.slice(0, Math.max(0, next.length - MAX_TOASTS))) {
      clearTimer(dropped.id)
    }
    return { toasts: next.slice(-MAX_TOASTS) }
  })

  const duration =
    opts.duration ?? (toast.tone === 'error' ? ERROR_TOAST_DURATION : TOAST_DURATION)
  timers.set(
    toast.id,
    setTimeout(() => dismissToast(toast.id), duration),
  )
  return toast.id
}

export function dismissToast(id: string): void {
  clearTimer(id)
  useToastStore.setState((s) =>
    s.toasts.some((t) => t.id === id)
      ? { toasts: s.toasts.filter((t) => t.id !== id) }
      : s,
  )
}

/** Run a toast's action (e.g. Undo) and dismiss it. */
export function actToast(id: string): void {
  const toast = useToastStore.getState().toasts.find((t) => t.id === id)
  toast?.onAction?.()
  dismissToast(id)
}

function clearTimer(id: string): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
}
