/**
 * Specs for the localStorage durability layer 1 — `navigator.storage.persist()`
 * wrapper (CLAUDE.md §"Надёжность хранения"). The wrapper must be safe on
 * browsers without the StorageManager API, idempotent (never re-prompt once
 * persisted), and degrade to a clear status the Settings UI can show.
 *
 * The StorageManager is injected so these run without a real browser.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  ensurePersistentStorage,
  getPersistStatus,
  getStorageEstimate,
  isPersistenceSupported,
} from '../../src/lib/storagePersistence'

function fakeStorage(opts: {
  persisted?: boolean
  grant?: boolean
  estimate?: { usage?: number; quota?: number }
  throwOn?: 'persist' | 'persisted' | 'estimate'
}) {
  return {
    persisted: vi.fn(async () => {
      if (opts.throwOn === 'persisted') throw new Error('boom')
      return !!opts.persisted
    }),
    persist: vi.fn(async () => {
      if (opts.throwOn === 'persist') throw new Error('boom')
      return !!opts.grant
    }),
    estimate: vi.fn(async () => {
      if (opts.throwOn === 'estimate') throw new Error('boom')
      return opts.estimate ?? { usage: 0, quota: 0 }
    }),
  }
}

describe('isPersistenceSupported', () => {
  it('is true when the StorageManager exposes persist + persisted', () => {
    expect(isPersistenceSupported(fakeStorage({}))).toBe(true)
  })
  it('is false when the API is absent', () => {
    expect(isPersistenceSupported(null)).toBe(false)
    expect(isPersistenceSupported({} as never)).toBe(false)
  })
})

describe('getPersistStatus', () => {
  it('reports persisted', async () => {
    expect(await getPersistStatus(fakeStorage({ persisted: true }))).toBe('persisted')
  })
  it('reports best-effort', async () => {
    expect(await getPersistStatus(fakeStorage({ persisted: false }))).toBe('best-effort')
  })
  it('reports unsupported when the API is missing', async () => {
    expect(await getPersistStatus(null)).toBe('unsupported')
  })
})

describe('ensurePersistentStorage', () => {
  it('returns unsupported and does nothing when the API is missing', async () => {
    expect(await ensurePersistentStorage(null)).toBe('unsupported')
  })

  it('does NOT re-request when storage is already persisted', async () => {
    const s = fakeStorage({ persisted: true })
    expect(await ensurePersistentStorage(s)).toBe('persisted')
    expect(s.persist).not.toHaveBeenCalled()
  })

  it('requests persistence and reports persisted when granted', async () => {
    const s = fakeStorage({ persisted: false, grant: true })
    expect(await ensurePersistentStorage(s)).toBe('persisted')
    expect(s.persist).toHaveBeenCalledTimes(1)
  })

  it('reports best-effort when the request is denied', async () => {
    const s = fakeStorage({ persisted: false, grant: false })
    expect(await ensurePersistentStorage(s)).toBe('best-effort')
    expect(s.persist).toHaveBeenCalledTimes(1)
  })

  it('degrades to unsupported if the API throws', async () => {
    expect(await ensurePersistentStorage(fakeStorage({ throwOn: 'persisted' }))).toBe('unsupported')
  })
})

describe('getStorageEstimate', () => {
  it('returns usage and quota', async () => {
    const s = fakeStorage({ estimate: { usage: 1234, quota: 5_000_000 } })
    expect(await getStorageEstimate(s)).toEqual({ usage: 1234, quota: 5_000_000 })
  })
  it('returns null when unavailable', async () => {
    expect(await getStorageEstimate(null)).toBeNull()
  })
})
