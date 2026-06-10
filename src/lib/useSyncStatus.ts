import { useEffect, useState } from 'react'
import type { SyncInfo, SyncStatus } from '../types'
import { getSyncStatus, onSyncStatusChange } from '../sync/dropbox'

/** Human labels for each sync state — shared by the header indicator and Settings. */
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  not_connected: 'Dropbox not connected',
  connecting: 'Connecting Dropbox…',
  syncing: 'Dropbox syncing…',
  synced: 'Dropbox synced',
  offline: 'Dropbox offline',
  error: 'Dropbox sync error',
}

export function relativeTime(ts: number | null): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

/** Live sync status; subscribes on mount, unsubscribes on unmount. */
export function useSyncStatus(): SyncInfo {
  const [s, setS] = useState<SyncInfo>(getSyncStatus())
  useEffect(() => onSyncStatusChange(setS), [])
  return s
}

/** Re-render periodically so "X min ago" style labels stay fresh. */
export function useTimeTick(intervalMs = 30_000): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
}
