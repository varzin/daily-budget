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
  /** User dismissed the nudge before (persisted across reloads). */
  dismissed: boolean
}

/**
 * Show the "keep a copy off this device" nudge only to users who actually risk
 * losing something: they have data, haven't connected sync, and haven't waved
 * the hint away. Persistent storage doesn't help here — it dies on "clear data"
 * or a new phone — so this is independent of the persisted status.
 */
export function shouldNudgeBackup({ connected, hasData, dismissed }: BackupNudgeInputs): boolean {
  return hasData && !connected && !dismissed
}
