/**
 * End-to-end: the cached FX rates travel through the REAL sync engine
 * (`src/sync/dropbox.ts`) as a per-field scalar. A newer fetch on one device
 * (or in the shared file) wins the merge by its own `meta.rates` timestamp,
 * independently of the other scalars — so a rates refresh propagates without
 * clobbering an unrelated edit.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDropbox } from '../helpers/fakeDropbox'
import { doc, FILE_PATH, makeDevice, type Device, type SyncDoc } from '../helpers/syncHarness'

const T1 = '2026-07-20T09:00:00.000Z'
const T2 = '2026-07-23T10:00:00.000Z'

const localRates = { base: 'EUR', date: '2026-07-20', values: { usd: 1.05 } }
const remoteRates = { base: 'EUR', date: '2026-07-23', values: { usd: 1.11 } }

let dbx: FakeDropbox
let device: Device

beforeEach(async () => {
  dbx = new FakeDropbox()
  device = await makeDevice(dbx)
})

function remoteDoc(): SyncDoc & { rates?: unknown } {
  const d = dbx.getJson<SyncDoc & { rates?: unknown }>(FILE_PATH)
  if (!d) throw new Error('remote /budget.json missing')
  return d
}

describe('exchange-rate cache sync', () => {
  it('adopts the remote’s newer rates and keeps them in the synced doc', async () => {
    // Local cached an older table; the shared file has a newer one.
    device.seedLocal(doc({ updatedAt: T1 }))
    device.store.setState({
      rates: localRates,
      meta: { bank: T1, incomeDay: T1, rates: T1 },
    } as never)

    dbx.setFile(
      FILE_PATH,
      JSON.stringify({
        ...doc({ updatedAt: T2 }),
        rates: remoteRates,
        meta: { bank: T1, incomeDay: T1, rates: T2 },
      }),
    )

    await device.sync.syncNow()

    const local = device.store.getState() as unknown as { rates?: { values: Record<string, number> } }
    expect(local.rates?.values.usd, 'device adopts the newer remote rates').toBe(1.11)

    const remote = remoteDoc()
    expect(
      (remote.rates as { values?: Record<string, number> } | undefined)?.values?.usd,
      'newer rates retained in the synced file',
    ).toBe(1.11)
  })

  it('keeps a locally-newer rates cache when the remote copy is older', async () => {
    device.seedLocal(doc({ updatedAt: T2 }))
    device.store.setState({
      rates: remoteRates, // local now holds the newer table
      meta: { bank: T2, incomeDay: T2, rates: T2 },
    } as never)

    dbx.setFile(
      FILE_PATH,
      JSON.stringify({
        ...doc({ updatedAt: T1 }),
        rates: localRates,
        meta: { bank: T1, incomeDay: T1, rates: T1 },
      }),
    )

    await device.sync.syncNow()

    const local = device.store.getState() as unknown as { rates?: { values: Record<string, number> } }
    expect(local.rates?.values.usd, 'local newer rates survive').toBe(1.11)
  })
})
