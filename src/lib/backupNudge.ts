import type { BudgetState } from '../types'

/**
 * Whether the budget holds anything worth protecting — a balance, or at least
 * one non-tombstoned category/savings row. Drives both "request persistent
 * storage" and "nudge for an off-device backup": there's no point bothering an
 * empty install.
 */
export function hasMeaningfulData(
  s: Pick<BudgetState, 'bank' | 'categories' | 'savings'>,
): boolean {
  if ((Number(s.bank) || 0) > 0) return true
  if (s.categories.some((c) => !c.deletedAt)) return true
  if (s.savings.some((r) => !r.deletedAt)) return true
  return false
}

export interface BackupNudgeInputs {
  /** Dropbox sync connected — already have an off-device copy. */
  connected: boolean
  hasData: boolean
}

/**
 * Whether to show the persistent "Protect your data" indicator. It's not a
 * one-time, dismissable nudge: the data stays unprotected for as long as it
 * lives only on this device, so the reminder stays until Dropbox sync is
 * connected. (Persistent storage doesn't resolve it — it dies on "clear data"
 * or a new phone — so this is independent of the persisted status.)
 */
export function shouldShowBackupNudge({ connected, hasData }: BackupNudgeInputs): boolean {
  return hasData && !connected
}
