/**
 * End-to-end specs for the Dropbox sync reliability rework.
 *
 * These drive the REAL `src/sync/dropbox.ts` against an in-memory Dropbox
 * (`FakeDropbox`) that implements `rev` / compare-and-swap semantics. The
 * "second device" in each scenario is the shared file's contents.
 *
 * They encode the TARGET behaviour described in CLAUDE.md
 * (§"Dropbox-синхронизация — переработка надёжности") and are EXPECTED TO FAIL
 * against the current "newest whole file wins / mode:overwrite" implementation.
 * They are the red half of the TDD loop; the rework makes them green.
 *
 *   Layer 1 — Compare-and-swap via Dropbox `rev`   (kills the lost update)
 *   Layer 2 — Per-entity merge + delete tombstones (kills silent data loss)
 *   Layer 3 — Conflict-copy as a safety net        (never throw away a loser)
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDropbox } from '../helpers/fakeDropbox'
import {
  cat,
  doc,
  FILE_PATH,
  findCategory,
  liveCategories,
  makeDevice,
  saving,
  type Device,
  type SyncDoc,
} from '../helpers/syncHarness'

// Ordered timestamps used throughout. Lexical order == chronological order.
const T0 = '2026-06-01T08:00:00.000Z'
const T1 = '2026-06-01T09:00:00.000Z'
const T2 = '2026-06-01T10:00:00.000Z'
const T3 = '2026-06-01T11:00:00.000Z'

let dbx: FakeDropbox
let device: Device

beforeEach(async () => {
  dbx = new FakeDropbox()
  device = await makeDevice(dbx)
})

/** Seed the shared remote file as if another device had pushed `d`. */
function seedRemote(d: SyncDoc): string {
  return dbx.setFile(FILE_PATH, JSON.stringify(d))
}

function remoteDoc(): SyncDoc {
  const d = dbx.getJson<SyncDoc>(FILE_PATH)
  if (!d) throw new Error('remote /budget.json missing')
  return d
}

// =====================================================================
// Layer 1 — Compare-and-swap via Dropbox `rev`
// =====================================================================
describe('Layer 1 — compare-and-swap via rev', () => {
  it('creates the first file with a non-destructive "add", never "overwrite"', async () => {
    // No remote file yet; local has data to push up.
    device.seedLocal(doc({ categories: [cat('a', { budget: 10, updatedAt: T1 })], updatedAt: T1 }))

    await device.sync.syncNow()

    const create = dbx.uploads.find((u) => u.path === FILE_PATH)
    expect(create, 'an upload to /budget.json should have happened').toBeTruthy()
    expect(create!.mode).toBe('add')
    expect(dbx.getFile(FILE_PATH)).toBeTruthy()
  })

  it('writes with mode update:<lastKnownRev>, not overwrite', async () => {
    const rev = seedRemote(doc({ categories: [cat('a', { budget: 10, updatedAt: T0 })], updatedAt: T0 }))
    // Local has a newer edit that must be pushed back up.
    device.seedLocal(doc({ categories: [cat('a', { budget: 11, updatedAt: T1 })], updatedAt: T1 }))

    await device.sync.syncNow()

    const writes = dbx.uploads.filter((u) => u.path === FILE_PATH && u.result === 'written')
    expect(writes.length).toBeGreaterThan(0)
    const last = writes[writes.length - 1]!
    expect(last.mode, 'CAS upload must be a rev-checked update').toMatchObject({ '.tag': 'update' })
    // It must reference the rev the client actually pulled (here: the seed rev).
    expect((last.mode as { update: string }).update).toBe(rev)
  })

  it('never clobbers the file with mode:overwrite', async () => {
    seedRemote(doc({ categories: [cat('a', { budget: 10, updatedAt: T0 })], updatedAt: T0 }))
    device.seedLocal(doc({ categories: [cat('a', { budget: 11, updatedAt: T1 })], updatedAt: T1 }))

    await device.sync.syncNow()

    expect(dbx.uploads.some((u) => u.path === FILE_PATH && u.mode === 'overwrite')).toBe(false)
  })

  it('recovers from a stale-rev push without losing the other device’s write (lost-update fix)', async () => {
    // 1) Shared baseline; this device syncs and remembers the rev.
    const r1 = seedRemote(doc({ categories: [cat('a', { name: 'A', budget: 10, updatedAt: T0 })], updatedAt: T0 }))
    await device.sync.syncNow()

    // 2) Another device pushes a change to a DIFFERENT field/entity, bumping the rev.
    seedRemote(
      doc({
        categories: [
          cat('a', { name: 'A', budget: 10, updatedAt: T0 }),
          cat('b', { name: 'B (other device)', budget: 77, updatedAt: T2 }),
        ],
        updatedAt: T2,
      }),
    )
    expect(dbx.getFile(FILE_PATH)!.rev).not.toBe(r1)

    // 3) This device makes its own local edit and pushes against the now-stale rev.
    device.seedLocal(doc({ categories: [cat('a', { name: 'A edited here', budget: 11, updatedAt: T3 })], updatedAt: T3 }))
    expect(typeof (device.sync as { push?: unknown }).push, 'rework must expose push() for immediate CAS upload').toBe(
      'function',
    )
    await (device.sync as unknown as { push: () => Promise<void> }).push()

    // The server must have rejected the stale write at least once...
    expect(dbx.uploads.some((u) => u.path === FILE_PATH && u.result === 'conflict')).toBe(true)
    // ...but after re-pull + merge + retry, NOTHING is lost.
    const merged = liveCategories(remoteDoc())
    expect(merged.get('a')?.budget, 'this device’s edit survives').toBe(11)
    expect(merged.get('b')?.budget, 'other device’s edit survives').toBe(77)
  })
})

// =====================================================================
// Layer 2 — Per-entity merge + delete tombstones
// =====================================================================
describe('Layer 2 — per-entity merge', () => {
  it('merges concurrent edits to DIFFERENT entities (phone + laptop, nothing lost)', async () => {
    // Local advanced category A; remote advanced category C.
    device.seedLocal(
      doc({
        categories: [cat('a', { budget: 11, updatedAt: T1 }), cat('c', { budget: 30, updatedAt: T0 })],
        updatedAt: T1,
      }),
    )
    seedRemote(
      doc({
        categories: [cat('a', { budget: 10, updatedAt: T0 }), cat('c', { budget: 33, updatedAt: T2 })],
        updatedAt: T2,
      }),
    )

    await device.sync.syncNow()

    const local = liveCategories(device.readLocal())
    expect(local.get('a')?.budget, 'local’s newer A wins').toBe(11)
    expect(local.get('c')?.budget, 'remote’s newer C wins').toBe(33)

    const remote = liveCategories(remoteDoc())
    expect(remote.get('a')?.budget).toBe(11)
    expect(remote.get('c')?.budget).toBe(33)
  })

  it('resolves same-entity edits last-writer-wins by entity updatedAt', async () => {
    device.seedLocal(doc({ categories: [cat('a', { budget: 11, updatedAt: T1 })], updatedAt: T1 }))
    seedRemote(doc({ categories: [cat('a', { budget: 22, updatedAt: T2 })], updatedAt: T2 }))

    await device.sync.syncNow()

    expect(liveCategories(device.readLocal()).get('a')?.budget, 'newer (remote) edit wins').toBe(22)
  })

  it('merges the two scalars (bank, incomeDay) independently by their own timestamps', async () => {
    device.seedLocal(doc({ bank: 500, incomeDay: 26, meta: { bank: T2, incomeDay: T0 }, updatedAt: T2 }))
    seedRemote(doc({ bank: 100, incomeDay: 15, meta: { bank: T0, incomeDay: T2 }, updatedAt: T2 }))

    await device.sync.syncNow()

    const local = device.readLocal()
    expect(local.bank, 'local’s newer bank wins').toBe(500)
    expect(local.incomeDay, 'remote’s newer incomeDay wins').toBe(15)
  })

  describe('tombstones', () => {
    it('does not resurrect a locally-deleted entity from a stale remote copy', async () => {
      // Local deleted A (tombstone @T2); remote still has the old live A (@T1).
      device.seedLocal(doc({ categories: [cat('a', { budget: 10, updatedAt: T1, deletedAt: T2 })], updatedAt: T2 }))
      seedRemote(doc({ categories: [cat('a', { budget: 10, updatedAt: T1 })], updatedAt: T1 }))

      await device.sync.syncNow()

      expect(liveCategories(device.readLocal()).has('a'), 'A stays deleted').toBe(false)
      const remote = remoteDoc()
      expect(findCategory(remote, 'a')?.deletedAt, 'tombstone is retained in the synced doc').toBeTruthy()
      expect(liveCategories(remote).has('a')).toBe(false)
    })

    it('applies a remote deletion that is newer than a local edit', async () => {
      // Remote deleted A (@T2); local has an older live edit (@T1).
      device.seedLocal(doc({ categories: [cat('a', { budget: 11, updatedAt: T1 })], updatedAt: T1 }))
      seedRemote(doc({ categories: [cat('a', { budget: 10, updatedAt: T1, deletedAt: T2 })], updatedAt: T2 }))

      await device.sync.syncNow()

      expect(liveCategories(device.readLocal()).has('a'), 'remote deletion wins').toBe(false)
    })

    it('keeps savings-row tombstones through a merge', async () => {
      device.seedLocal(doc({ savings: [saving('s1', { month: '2026-05', saved: 100, updatedAt: T1, deletedAt: T2 })], updatedAt: T2 }))
      seedRemote(doc({ savings: [saving('s1', { month: '2026-05', saved: 100, updatedAt: T1 })], updatedAt: T1 }))

      await device.sync.syncNow()

      const remote = remoteDoc()
      const row = remote.savings.find((r) => r.id === 's1')
      expect(row?.deletedAt, 'savings tombstone must survive the round-trip').toBeTruthy()
    })
  })
})

// =====================================================================
// Layer 3 — Conflict-copy as a safety net
// =====================================================================
describe('Layer 3 — conflict-copy', () => {
  it('saves the losing version to a conflict copy when one entity truly collides', async () => {
    // Same entity, SAME timestamp, DIFFERENT content => no confident winner.
    device.seedLocal(doc({ categories: [cat('a', { name: 'A', budget: 100, updatedAt: T1 })], updatedAt: T1 }))
    seedRemote(doc({ categories: [cat('a', { name: 'A', budget: 200, updatedAt: T1 })], updatedAt: T1 }))

    await device.sync.syncNow()

    const copies = dbx.conflictCopies()
    expect(copies.length, 'a conflict copy must be written for the loser').toBe(1)

    // Both values must remain recoverable: one in the primary file, one in the copy.
    const primaryBudget = liveCategories(remoteDoc()).get('a')?.budget
    const copyDoc = JSON.parse(copies[0]!.content) as SyncDoc
    const copyBudget = liveCategories(copyDoc).get('a')?.budget
    expect([primaryBudget, copyBudget].sort()).toEqual([100, 200])

    // Local converges on whatever the primary file kept.
    expect(liveCategories(device.readLocal()).get('a')?.budget).toBe(primaryBudget)
  })

  it('does NOT create a conflict copy for a clean (non-colliding) merge', async () => {
    device.seedLocal(doc({ categories: [cat('a', { budget: 11, updatedAt: T1 })], updatedAt: T1 }))
    seedRemote(doc({ categories: [cat('b', { budget: 22, updatedAt: T1 })], updatedAt: T1 }))

    await device.sync.syncNow()

    expect(dbx.conflictCopies().length).toBe(0)
  })
})
