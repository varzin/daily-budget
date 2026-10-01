/**
 * End-to-end through the REAL sync engine (`src/sync/dropbox.ts`): switching
 * the display currency on one device is a single scalar change, so it merges
 * cleanly with unrelated edits from another device — nothing is re-labelled —
 * and a document from a pre-tag client is tagged with its own currency.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDropbox } from '../helpers/fakeDropbox'
import { FILE_PATH, makeDevice, type Device } from '../helpers/syncHarness'
import type { BudgetState } from '../../src/types'

const T0 = '2026-09-01T08:00:00.000Z'
const T1 = '2026-09-01T09:00:00.000Z'
const T2 = '2026-09-01T10:00:00.000Z'

let dbx: FakeDropbox
let device: Device

beforeEach(async () => {
  dbx = new FakeDropbox()
  device = await makeDevice(dbx)
})

const meta = (p: Partial<BudgetState['meta']> = {}): BudgetState['meta'] => ({
  bank: T0,
  incomeDay: T0,
  buffer: null,
  currency: null,
  monthlyIncome: null,
  resetSpentOnFinalize: null,
  rates: null,
  ...p,
})

function base(p: Partial<BudgetState> = {}): BudgetState {
  return {
    bank: 1500,
    bankCurrency: 'EUR',
    incomeDay: 26,
    buffer: 200,
    bufferCurrency: 'EUR',
    currency: 'EUR',
    monthlyIncome: 0,
    monthlyIncomeCurrency: 'EUR',
    resetSpentOnFinalize: true,
    rates: null,
    categories: [
      { id: 'rent', name: 'Rent', budget: 500, spent: 0, currency: 'EUR', done: false, updatedAt: T0 },
    ],
    savings: [{ id: 's1', month: '2026-08', saved: 300, currency: 'EUR', updatedAt: T0 }],
    updatedAt: T0,
    meta: meta(),
    ...p,
  }
}

function remote(): BudgetState {
  const d = dbx.getJson<BudgetState>(FILE_PATH)
  if (!d) throw new Error('remote /budget.json missing')
  return d
}

describe('display-currency switch across devices', () => {
  it('keeps both the local switch and the other device’s category edit', async () => {
    device.store.setState(base())
    // The other device edited the rent (in EUR) after our last sync.
    dbx.setFile(
      FILE_PATH,
      JSON.stringify(
        base({
          categories: [
            { id: 'rent', name: 'Rent', budget: 650, spent: 0, currency: 'EUR', done: false, updatedAt: T1 },
          ],
          updatedAt: T1,
        }),
      ),
    )
    // This device switches the display currency (later than the remote edit).
    device.store.setState({ currency: 'AMD', meta: meta({ currency: T2 }), updatedAt: T2 })

    await device.sync.syncNow()

    for (const d of [device.store.getState(), remote()]) {
      expect(d.currency).toBe('AMD')
      // The edit survived, still denominated in euros — not re-labelled to drams.
      expect(d.categories[0]).toMatchObject({ budget: 650, currency: 'EUR' })
      expect(d).toMatchObject({ bank: 1500, bankCurrency: 'EUR' })
      expect(d.savings[0]).toMatchObject({ saved: 300, currency: 'EUR' })
    }
  })

  it('tags a pre-tag client’s document with its own currency and pushes the tags', async () => {
    device.store.setState(base({ currency: 'EUR' }))
    // A not-yet-updated client wrote the file: no tags, everything in USD, newer.
    dbx.setFile(
      FILE_PATH,
      JSON.stringify({
        bank: 900,
        incomeDay: 26,
        buffer: 100,
        currency: 'USD',
        monthlyIncome: 0,
        categories: [{ id: 'gym', name: 'Gym', budget: 40, spent: 0, done: false, updatedAt: T2 }],
        savings: [],
        updatedAt: T2,
        meta: meta({ bank: T2, buffer: T2, currency: T2 }),
      }),
    )

    await device.sync.syncNow()

    const s = device.store.getState()
    expect(s.currency).toBe('USD')
    expect(s).toMatchObject({ bank: 900, bankCurrency: 'USD', buffer: 100, bufferCurrency: 'USD' })
    expect(s.categories.find((c) => c.id === 'gym')!.currency).toBe('USD')
    // Local-only data keeps its own (EUR) tags.
    expect(s.categories.find((c) => c.id === 'rent')!.currency).toBe('EUR')
    // The tagged result went back up, so other devices stop guessing.
    const r = remote()
    expect(r.bankCurrency).toBe('USD')
    expect(r.categories.find((c) => c.id === 'gym')!.currency).toBe('USD')
  })
})
