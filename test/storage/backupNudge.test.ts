/**
 * Specs for the localStorage durability layer 2 — the soft "keep an off-device
 * copy" nudge (CLAUDE.md §"Надёжность хранения", point 2). Persistent storage
 * still dies on "clear data" or a new phone; the only real insurance is a copy
 * off the device. We nudge exactly the users who have data but no Dropbox sync,
 * and only until they act or dismiss.
 *
 * Both the data-presence check and the nudge decision are pure functions.
 */
import { describe, expect, it } from 'vitest'
import { hasMeaningfulData, shouldNudgeBackup } from '../../src/lib/backupNudge'
import type { BudgetState } from '../../src/types'

function state(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 0,
    incomeDay: 26,
    categories: [],
    savings: [],
    updatedAt: null,
    meta: { bank: null, incomeDay: null },
    ...p,
  }
}

describe('hasMeaningfulData', () => {
  it('is false for an untouched / empty budget', () => {
    expect(hasMeaningfulData(state())).toBe(false)
  })
  it('is true once a balance is entered', () => {
    expect(hasMeaningfulData(state({ bank: 100 }))).toBe(true)
  })
  it('is true with a live category', () => {
    expect(
      hasMeaningfulData(
        state({ categories: [{ id: 'a', name: 'Rent', budget: 10, spent: 0, done: false }] }),
      ),
    ).toBe(true)
  })
  it('is true with a live savings row', () => {
    expect(hasMeaningfulData(state({ savings: [{ id: 's', month: '2026-06', saved: 50 }] }))).toBe(
      true,
    )
  })
  it('ignores tombstoned-only entities', () => {
    expect(
      hasMeaningfulData(
        state({
          categories: [
            { id: 'a', name: 'Rent', budget: 10, spent: 0, done: false, deletedAt: '2026-06-01T00:00:00.000Z' },
          ],
          savings: [{ id: 's', month: '2026-06', saved: 50, deletedAt: '2026-06-01T00:00:00.000Z' }],
        }),
      ),
    ).toBe(false)
  })
})

describe('shouldNudgeBackup', () => {
  it('nudges when there is data, no sync, and not dismissed', () => {
    expect(shouldNudgeBackup({ connected: false, hasData: true, dismissed: false })).toBe(true)
  })
  it('does not nudge without data', () => {
    expect(shouldNudgeBackup({ connected: false, hasData: false, dismissed: false })).toBe(false)
  })
  it('does not nudge once Dropbox is connected', () => {
    expect(shouldNudgeBackup({ connected: true, hasData: true, dismissed: false })).toBe(false)
  })
  it('does not nudge after dismissal', () => {
    expect(shouldNudgeBackup({ connected: false, hasData: true, dismissed: true })).toBe(false)
  })
})
