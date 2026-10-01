/**
 * End-to-end through the REAL sync engine (`src/sync/dropbox.ts`): accounts
 * merge per entity across devices (CLAUDE.md "Счета") — accounts added on two
 * devices both survive, a newer balance wins per account, a delete beats a
 * stale copy, and a legacy single-balance file migrates without doubling.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeDropbox } from '../helpers/fakeDropbox'
import { FILE_PATH, makeDevice, type Device } from '../helpers/syncHarness'
import type { Account, BudgetState } from '../../src/types'

const T0 = '2026-09-01T08:00:00.000Z'
const T1 = '2026-09-01T09:00:00.000Z'
const T2 = '2026-09-01T10:00:00.000Z'

let dbx: FakeDropbox
let device: Device

beforeEach(async () => {
  dbx = new FakeDropbox()
  device = await makeDevice(dbx)
})

const acc = (id: string, p: Partial<Account> = {}): Account => ({
  id,
  name: '',
  balance: 0,
  currency: 'EUR',
  updatedAt: T0,
  ...p,
})

function base(p: Partial<BudgetState> = {}): BudgetState {
  return {
    accounts: [acc('main', { balance: 1000 })],
    incomeDay: 26,
    buffer: 200,
    bufferCurrency: 'EUR',
    currency: 'EUR',
    monthlyIncome: 0,
    monthlyIncomeCurrency: 'EUR',
    resetSpentOnFinalize: true,
    rates: null,
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: {
      incomeDay: T0,
      buffer: null,
      currency: null,
      monthlyIncome: null,
      resetSpentOnFinalize: null,
      rates: null,
    },
    ...p,
  }
}

function remote(): BudgetState {
  const d = dbx.getJson<BudgetState>(FILE_PATH)
  if (!d) throw new Error('remote /budget.json missing')
  return d
}

const ids = (d: BudgetState) =>
  d.accounts.filter((a) => !a.deletedAt).map((a) => a.id).sort()

describe('accounts across devices', () => {
  it('keeps an account added on each device', async () => {
    device.store.setState(base({ accounts: [acc('main', { balance: 1000 }), acc('card', { balance: 50, updatedAt: T1 })] }))
    dbx.setFile(
      FILE_PATH,
      JSON.stringify(base({ accounts: [acc('main', { balance: 1000 }), acc('cash', { balance: 20000, currency: 'AMD', updatedAt: T1 })], updatedAt: T1 })),
    )

    await device.sync.syncNow()

    expect(ids(device.store.getState())).toEqual(['card', 'cash', 'main'])
    expect(ids(remote())).toEqual(['card', 'cash', 'main'])
    expect(remote().accounts.find((a) => a.id === 'cash')).toMatchObject({ balance: 20000, currency: 'AMD' })
  })

  it('takes the newer balance per account, independently', async () => {
    device.store.setState(
      base({ accounts: [acc('main', { balance: 111, updatedAt: T2 }), acc('card', { balance: 1, updatedAt: T0 })] }),
    )
    dbx.setFile(
      FILE_PATH,
      JSON.stringify(
        base({ accounts: [acc('main', { balance: 999, updatedAt: T1 }), acc('card', { balance: 2, balanceExpr: '1+1', updatedAt: T1 })] }),
      ),
    )

    await device.sync.syncNow()

    const s = device.store.getState()
    expect(s.accounts.find((a) => a.id === 'main')!.balance).toBe(111) // local newer
    expect(s.accounts.find((a) => a.id === 'card')).toMatchObject({ balance: 2, balanceExpr: '1+1' }) // remote newer
  })

  it('a delete on one device beats an older copy on the other', async () => {
    device.store.setState(
      base({ accounts: [acc('main', { balance: 10 }), acc('old', { balance: 5, deletedAt: T2, updatedAt: T2 })] }),
    )
    dbx.setFile(
      FILE_PATH,
      JSON.stringify(base({ accounts: [acc('main', { balance: 10 }), acc('old', { balance: 7, updatedAt: T1 })] })),
    )

    await device.sync.syncNow()

    expect(ids(device.store.getState())).toEqual(['main'])
    expect(ids(remote())).toEqual(['main'])
  })

  it('migrates a legacy single-balance file into the same main account — no doubling', async () => {
    // This device already migrated (main account from its legacy balance).
    device.store.setState(base({ accounts: [acc('main', { balance: 1000, updatedAt: T0 })] }))
    // The shared file is still the legacy shape, with a newer balance.
    const legacy = { ...base(), bank: 1200, meta: { ...base().meta, bank: T1 } } as Record<string, unknown>
    delete legacy.accounts
    dbx.setFile(FILE_PATH, JSON.stringify(legacy))

    await device.sync.syncNow()

    const s = device.store.getState()
    expect(s.accounts).toHaveLength(1)
    expect(s.accounts[0]).toMatchObject({ id: 'main', balance: 1200, updatedAt: T1 })
    // Nothing new to contribute → no echo push; the file stays legacy for now.
    expect(dbx.getJson<Record<string, unknown>>(FILE_PATH)!.bank).toBe(1200)

    // The first real edit writes the accounts shape — with no legacy balance,
    // so a pre-accounts client refuses the file instead of rewriting it.
    device.store.getState().addAccount({ name: 'Cash' })
    await device.sync.push()
    expect(ids(remote())).toHaveLength(2)
    expect(remote().accounts.find((a) => a.id === 'main')!.balance).toBe(1200)
    expect('bank' in remote()).toBe(false)
  })
})
