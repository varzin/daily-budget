import type { Account } from '../types'

/**
 * Account ordering (CLAUDE.md "Счета"). The list order is an entity field,
 * `order`, not the array position: merge keeps the local array order and the
 * docKey sorts by id, so a reorder by position would neither win a merge nor
 * even be pushed.
 *
 * `order` is fractional so a move rewrites ONLY the moved account (its new
 * value lands between its new neighbours) — every rewritten account is an
 * entity edit that could beat an unsynced edit of it on another device.
 * Accounts from before ordering have no `order` and rank by array index.
 */

/** Sort key: the stored `order`, else the array index. */
function rank(a: Account, index: number): number {
  return a.order ?? index
}

/** Accounts in display order (ties keep the array order). */
export function sortAccounts(accounts: Account[]): Account[] {
  return accounts
    .map((a, i) => ({ a, i, r: rank(a, i) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map(({ a }) => a)
}

/** `order` for an account appended to the end of the list. */
export function nextAccountOrder(accounts: Account[]): number {
  let max = -1
  accounts.forEach((a, i) => {
    max = Math.max(max, rank(a, i))
  })
  return Math.floor(max) + 1
}

export type MoveDirection = -1 | 1

/**
 * New `order` values for moving account `id` one place up (-1) or down (+1)
 * among the live accounts: a map of id → order for the accounts to rewrite, or
 * null when it can't move (unknown, deleted, already first/last).
 *
 * Normally that is just the moved account, placed midway between its new
 * neighbours. Every live account is renumbered 0…n-1 instead when some lack an
 * `order` (a one-off upgrade) or there's no room between the neighbours (equal
 * orders after a merge, or float precision exhausted).
 */
export function moveAccountOrder(
  accounts: Account[],
  id: string,
  dir: MoveDirection,
): Map<string, number> | null {
  const live = sortAccounts(accounts.filter((a) => !a.deletedAt))
  const from = live.findIndex((a) => a.id === id)
  const to = from + dir
  if (from < 0 || to < 0 || to >= live.length) return null

  const renumber = () => {
    const next = live.filter((_, i) => i !== from)
    next.splice(to, 0, live[from]!)
    const out = new Map<string, number>()
    next.forEach((a, i) => {
      if (a.order !== i) out.set(a.id, i)
    })
    return out
  }

  if (live.some((a) => a.order === undefined)) return renumber()

  // The two accounts the moved one will sit between (one may be missing).
  const near = live[to]!.order!
  const far = live[to + dir]?.order
  const order = far === undefined ? near + dir : (near + far) / 2
  const between = far === undefined ? true : (order - near) * dir > 0 && (far - order) * dir > 0
  if (!between || !Number.isFinite(order)) return renumber()
  return new Map([[id, order]])
}
