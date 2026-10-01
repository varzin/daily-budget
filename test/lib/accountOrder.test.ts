/**
 * Account ordering (Move up / Move down in the account "…" menu). The order is
 * an entity field so it syncs; a move rewrites only the moved account (its
 * `order` lands between its new neighbours), and falls back to renumbering
 * all live accounts when some lack an `order` or there's no room.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { moveAccountOrder, nextAccountOrder, sortAccounts } from '../../src/lib/accountOrder'
import { useBudgetStore } from '../../src/store/budgetStore'
import { defaultState, migrateAccounts } from '../../src/store/persist'
import { mergeBudget, sameDocument } from '../../src/sync/merge'
import type { Account, BudgetState } from '../../src/types'

const T0 = '2026-07-01T00:00:00.000Z'
const T1 = '2026-07-02T00:00:00.000Z'
const T2 = '2026-07-03T00:00:00.000Z'

const acc = (id: string, p: Partial<Account> = {}): Account => ({
  id,
  name: '',
  balance: 0,
  currency: 'EUR',
  ...p,
})
const ids = (list: Account[]) => list.map((a) => a.id)

/** Apply a move result the way the store does. */
function apply(list: Account[], id: string, dir: -1 | 1): Account[] {
  const orders = moveAccountOrder(list, id, dir)
  if (!orders) return list
  return list.map((a) => (orders.has(a.id) ? { ...a, order: orders.get(a.id)! } : a))
}

describe('sortAccounts', () => {
  it('sorts by order; accounts without one rank by array index', () => {
    expect(ids(sortAccounts([acc('a', { order: 2 }), acc('b', { order: 0 }), acc('c', { order: 1 })]))).toEqual(['b', 'c', 'a'])
    expect(ids(sortAccounts([acc('a'), acc('b'), acc('c')]))).toEqual(['a', 'b', 'c'])
    // A fractional order slots between index-ranked neighbours.
    expect(ids(sortAccounts([acc('a'), acc('b'), acc('c', { order: 0.5 })]))).toEqual(['a', 'c', 'b'])
  })

  it('keeps the array order for equal orders and does not mutate', () => {
    const list = [acc('a', { order: 1 }), acc('b', { order: 1 }), acc('c', { order: 0 })]
    expect(ids(sortAccounts(list))).toEqual(['c', 'a', 'b'])
    expect(ids(list)).toEqual(['a', 'b', 'c'])
  })
})

describe('nextAccountOrder', () => {
  it('appends after the last account (deleted ones included)', () => {
    expect(nextAccountOrder([])).toBe(0)
    expect(nextAccountOrder([acc('a'), acc('b')])).toBe(2)
    expect(nextAccountOrder([acc('a', { order: 0.5 }), acc('b', { order: -3 })])).toBe(1)
    expect(nextAccountOrder([acc('a', { order: 4, deletedAt: T1 })])).toBe(5)
  })
})

describe('moveAccountOrder', () => {
  const ordered = () => [acc('a', { order: 0 }), acc('b', { order: 1 }), acc('c', { order: 2 })]

  it('rewrites only the moved account, midway between its new neighbours', () => {
    expect(moveAccountOrder(ordered(), 'c', -1)).toEqual(new Map([['c', 0.5]]))
    expect(moveAccountOrder(ordered(), 'a', 1)).toEqual(new Map([['a', 1.5]]))
  })

  it('goes past the end when moving to the first / last place', () => {
    expect(moveAccountOrder(ordered(), 'b', -1)).toEqual(new Map([['b', -1]]))
    expect(moveAccountOrder(ordered(), 'b', 1)).toEqual(new Map([['b', 3]]))
  })

  it('refuses the first up, the last down, an unknown or deleted account', () => {
    expect(moveAccountOrder(ordered(), 'a', -1)).toBeNull()
    expect(moveAccountOrder(ordered(), 'c', 1)).toBeNull()
    expect(moveAccountOrder(ordered(), 'zzz', 1)).toBeNull()
    const list = [acc('a', { order: 0 }), acc('b', { order: 1, deletedAt: T1 })]
    expect(moveAccountOrder(list, 'b', -1)).toBeNull()
    expect(moveAccountOrder([acc('only', { order: 0 })], 'only', 1)).toBeNull()
  })

  it('steps over deleted accounts', () => {
    const list = [acc('a', { order: 0 }), acc('x', { order: 1, deletedAt: T1 }), acc('b', { order: 2 })]
    expect(ids(sortAccounts(apply(list, 'b', -1)).filter((a) => !a.deletedAt))).toEqual(['b', 'a'])
  })

  it('renumbers every live account once when some have no order', () => {
    const list = [acc('a'), acc('b'), acc('c')]
    const orders = moveAccountOrder(list, 'c', -1)!
    expect(Object.fromEntries(orders)).toEqual({ a: 0, c: 1, b: 2 })
    expect(ids(sortAccounts(apply(list, 'c', -1)))).toEqual(['a', 'c', 'b'])
  })

  it('renumbers when equal orders leave no room (e.g. after a merge)', () => {
    const list = [acc('a', { order: 0 }), acc('b', { order: 1 }), acc('c', { order: 1 })]
    const orders = moveAccountOrder(list, 'a', 1)!
    expect(Object.fromEntries(orders)).toEqual({ b: 0, a: 1, c: 2 })
  })

  it('renumbers when float precision runs out', () => {
    let list = [acc('a', { order: 0 }), acc('b', { order: 1 }), acc('c', { order: 2 })]
    // Ping-pong c between a and b until the gap can no longer be halved.
    for (let i = 0; i < 200; i++) {
      list = apply(list, 'c', -1)
      list = apply(list, 'c', 1)
      list = apply(list, 'c', -1)
      expect(ids(sortAccounts(list))).toEqual(['a', 'c', 'b'])
      list = apply(list, 'b', -1)
      expect(ids(sortAccounts(list))).toEqual(['a', 'b', 'c'])
    }
  })

  it('every sequence of moves matches moving items in a plain array', () => {
    let list = [acc('a'), acc('b'), acc('c'), acc('d')]
    let model = ['a', 'b', 'c', 'd']
    let seed = 7
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    for (let i = 0; i < 500; i++) {
      const id = model[Math.floor(rnd() * model.length)]!
      const dir = rnd() < 0.5 ? -1 : 1
      const from = model.indexOf(id)
      const to = from + dir
      if (to >= 0 && to < model.length) {
        model = model.filter((x) => x !== id)
        model.splice(to, 0, id)
      }
      list = apply(list, id, dir)
      expect(ids(sortAccounts(list))).toEqual(model)
    }
  })
})

describe('store: moveAccount', () => {
  beforeEach(() => {
    useBudgetStore.setState({ ...defaultState, categories: [], savings: [] })
  })
  const sorted = () => ids(sortAccounts(useBudgetStore.getState().accounts.filter((a) => !a.deletedAt)))

  it('new accounts are appended with an order', () => {
    const s = useBudgetStore.getState()
    const b = s.addAccount({ name: 'B' })
    const c = s.addAccount({ name: 'C' })
    expect(sorted()).toEqual(['main', b, c])
    expect(useBudgetStore.getState().accounts.find((a) => a.id === c)!.order).toBe(2)
  })

  it('moves up / down and stamps only the rewritten accounts', () => {
    useBudgetStore.setState({
      accounts: [
        acc('a', { order: 0, updatedAt: T0 }),
        acc('b', { order: 1, updatedAt: T0 }),
        acc('c', { order: 2, updatedAt: T0 }),
      ],
    })
    expect(useBudgetStore.getState().moveAccount('c', -1)).toBe(true)
    expect(sorted()).toEqual(['a', 'c', 'b'])
    const byId = (id: string) => useBudgetStore.getState().accounts.find((a) => a.id === id)!
    expect(byId('c').updatedAt).not.toBe(T0)
    expect(byId('a').updatedAt).toBe(T0)
    expect(byId('b').updatedAt).toBe(T0)
    expect(useBudgetStore.getState().moveAccount('a', 1)).toBe(true)
    expect(sorted()).toEqual(['c', 'a', 'b'])
  })

  it('refuses an impossible move without touching the state', () => {
    const before = useBudgetStore.getState()
    expect(before.moveAccount('main', -1)).toBe(false)
    expect(before.moveAccount('main', 1)).toBe(false)
    expect(useBudgetStore.getState().updatedAt).toBe(before.updatedAt)
  })
})

describe('order through sanitizing and sync', () => {
  it('keeps a finite order and drops a bad one', () => {
    const out = migrateAccounts({ accounts: [acc('a', { order: 1.5 }), { ...acc('b'), order: 'x' as never }, { ...acc('c'), order: NaN }] })
    expect(out.map((a) => a.order)).toEqual([1.5, undefined, undefined])
    expect('order' in out[1]!).toBe(false)
  })

  const doc = (accounts: Account[]): BudgetState => ({
    ...defaultState,
    accounts,
    categories: [],
    savings: [],
    updatedAt: T0,
  })

  it('a reorder is a document change (it gets pushed)', () => {
    const a = doc([acc('a', { order: 0, updatedAt: T0 }), acc('b', { order: 1, updatedAt: T0 })])
    const b = doc([acc('a', { order: 0, updatedAt: T0 }), acc('b', { order: -1, updatedAt: T1 })])
    expect(sameDocument(a, b)).toBe(false)
  })

  it('a move on one device and a balance edit on another both survive', () => {
    const base = [acc('a', { order: 0, updatedAt: T0 }), acc('b', { order: 1, updatedAt: T0 }), acc('c', { order: 2, updatedAt: T0 })]
    // Device 1 moved c to the top; device 2 edited a's balance.
    const local = doc(base.map((x) => (x.id === 'c' ? { ...x, order: -1, updatedAt: T1 } : x)))
    const remote = doc(base.map((x) => (x.id === 'a' ? { ...x, balance: 500, updatedAt: T2 } : x)))
    const { merged, conflicts } = mergeBudget(local, remote)
    expect(conflicts).toEqual([])
    expect(ids(sortAccounts(merged.accounts))).toEqual(['c', 'a', 'b'])
    expect(merged.accounts.find((x) => x.id === 'a')!.balance).toBe(500)
  })
})
