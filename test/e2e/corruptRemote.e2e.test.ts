/**
 * A corrupted or foreign /budget.json (hand-edited, truncated by a partial
 * write, written by another tool) must never reach the store: the sync fails
 * with a clear error, local data stays intact, and nothing is uploaded over
 * the remote file the user may want to inspect.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDropbox } from '../helpers/fakeDropbox'
import { cat, doc, FILE_PATH, makeDevice, type Device } from '../helpers/syncHarness'

const T1 = '2026-06-01T09:00:00.000Z'

let dbx: FakeDropbox
let device: Device

beforeEach(async () => {
  dbx = new FakeDropbox()
  device = await makeDevice(dbx)
})

function seedLocalWithCategory() {
  device.seedLocal(doc({ bank: 500, categories: [cat('a', { budget: 10, updatedAt: T1 })], updatedAt: T1 }))
}

describe('corrupted remote document', () => {
  it('reports an error and leaves local data untouched for invalid JSON', async () => {
    seedLocalWithCategory()
    dbx.setFile(FILE_PATH, 'not json {{{')

    await device.sync.syncNow()

    expect(device.sync.getSyncStatus().status).toBe('error')
    const local = device.readLocal()
    expect(local.bank).toBe(500)
    expect(local.categories.map((c) => c.id)).toEqual(['a'])
    // The broken file is preserved for inspection — nothing was uploaded.
    expect(dbx.uploads.filter((u) => u.result === 'written')).toHaveLength(0)
    expect(dbx.getFile(FILE_PATH)!.content).toBe('not json {{{')
  })

  it('rejects valid JSON that is not a budget document', async () => {
    seedLocalWithCategory()
    dbx.setFile(FILE_PATH, JSON.stringify({ hello: 'world' }))

    await device.sync.syncNow()

    expect(device.sync.getSyncStatus().status).toBe('error')
    expect(device.readLocal().bank).toBe(500)
    expect(dbx.uploads.filter((u) => u.result === 'written')).toHaveLength(0)
  })

  it('sanitizes malformed entities inside an otherwise valid document', async () => {
    device.seedLocal(doc({ bank: 500, updatedAt: T1 }))
    const remote = doc({ bank: 500, updatedAt: T1 })
    const malformed = {
      ...remote,
      categories: [
        null,
        { id: 'x', name: 42, budget: 'abc', spent: 7, done: 1, updatedAt: T1 },
      ],
    }
    dbx.setFile(FILE_PATH, JSON.stringify(malformed))

    await device.sync.syncNow()

    const local = device.readLocal()
    expect(local.categories).toHaveLength(1)
    expect(local.categories[0]).toMatchObject({
      id: 'x',
      name: '',
      budget: 0,
      spent: 7,
      done: true,
    })
  })
})
