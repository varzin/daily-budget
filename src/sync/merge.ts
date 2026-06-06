import type { BudgetState, BudgetMeta, Category, SavingsRow } from '../types'

/**
 * Per-entity merge for the Dropbox sync rework (CLAUDE.md §"Слияние по
 * сущностям"). Instead of "newest whole file wins", we take the newest version
 * of EACH independent entity (the two scalars, each category by id, each
 * savings row by id), so an edit on one device and an unrelated edit on another
 * both survive.
 *
 * Rules:
 *  - last-writer-wins per entity by `updatedAt` (missing == oldest);
 *  - deletes are tombstones (`deletedAt`) carried through the merge — a stale
 *    copy can never resurrect a deleted entity;
 *  - if the same entity was changed on both sides with the SAME timestamp but
 *    DIFFERENT content, neither side can confidently win: a deterministic
 *    winner is kept and the loser is reported as a conflict (the caller saves
 *    it as a Dropbox conflict-copy).
 *
 * Pure and side-effect free: takes two documents, returns the merged document
 * plus the list of losing versions.
 */

export interface Conflict {
  kind: 'category' | 'savings'
  id: string
  loser: Category | SavingsRow
}

export interface MergeResult {
  merged: BudgetState
  conflicts: Conflict[]
}

type Entity = Category | SavingsRow

const time = (ts?: string | null): number => (ts ? Date.parse(ts) : 0)

/**
 * Effective change time of an entity. A deletion is itself a change, so a
 * tombstone counts as of its `deletedAt` even if `updatedAt` wasn't bumped —
 * otherwise a delete could lose to an older edit on another device.
 */
const entityTime = (e: Entity): number => Math.max(time(e.updatedAt), time(e.deletedAt))

/** Canonical, key-order-independent serialization of an entity's content. */
function canonical(e: Entity): string {
  const { updatedAt: _u, ...content } = e as Entity & Record<string, unknown>
  const keys = Object.keys(content).sort()
  return JSON.stringify(content, keys)
}

function sameContent(a: Entity, b: Entity): boolean {
  return canonical(a) === canonical(b)
}

/**
 * Pick the surviving version of one entity present on both sides.
 * Returns the winner and, when it's a true collision, the loser.
 */
function reconcile<T extends Entity>(local: T, remote: T): { winner: T; loser?: T } {
  const lt = entityTime(local)
  const rt = entityTime(remote)
  if (lt > rt) return { winner: local }
  if (rt > lt) return { winner: remote }
  // Equal timestamps.
  if (sameContent(local, remote)) return { winner: local }
  // True collision — deterministic winner so both devices converge on the same
  // result (and therefore save the same loser as a conflict-copy).
  const localWins = canonical(local) > canonical(remote)
  return localWins ? { winner: local, loser: remote } : { winner: remote, loser: local }
}

function mergeCollection<T extends Entity>(
  localList: T[],
  remoteList: T[],
  kind: Conflict['kind'],
  conflicts: Conflict[],
): T[] {
  const localById = new Map(localList.map((e) => [e.id, e]))
  const remoteById = new Map(remoteList.map((e) => [e.id, e]))
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()])

  const out: T[] = []
  for (const id of ids) {
    const l = localById.get(id)
    const r = remoteById.get(id)
    if (l && r) {
      const { winner, loser } = reconcile(l, r)
      out.push(winner)
      if (loser) conflicts.push({ kind, id, loser })
    } else {
      out.push((l ?? r) as T)
    }
  }
  return out
}

function mergeScalars(
  local: BudgetState,
  remote: BudgetState,
): Pick<BudgetState, 'bank' | 'incomeDay' | 'buffer' | 'meta'> {
  const pick = (field: keyof BudgetMeta): { value: number; ts: string | null } => {
    const lt = time(local.meta?.[field])
    const rt = time(remote.meta?.[field])
    // Strictly-newer wins; tie keeps local (scalars don't get conflict-copies).
    const useRemote = rt > lt
    return {
      value: useRemote ? remote[field] : local[field],
      ts: useRemote ? remote.meta?.[field] ?? null : local.meta?.[field] ?? null,
    }
  }
  const bank = pick('bank')
  const incomeDay = pick('incomeDay')
  const buffer = pick('buffer')
  return {
    bank: bank.value,
    incomeDay: incomeDay.value,
    buffer: buffer.value,
    meta: { bank: bank.ts, incomeDay: incomeDay.ts, buffer: buffer.ts },
  }
}

export function mergeBudget(local: BudgetState, remote: BudgetState): MergeResult {
  // Migration safety: data written before this rework has no per-entity
  // timestamps. If BOTH sides are un-stamped, fall back to the old "newest
  // whole document wins" (by document updatedAt) — so an upgrade can never
  // spuriously conflict, resurrect a deletion, or lose the newer balance to a
  // per-entity tie. The first edit stamps entities and switches to true entity
  // merge from then on.
  if (!isStamped(local) && !isStamped(remote)) {
    const merged = time(local.updatedAt) >= time(remote.updatedAt) ? local : remote
    return { merged, conflicts: [] }
  }

  const conflicts: Conflict[] = []
  const categories = mergeCollection(local.categories, remote.categories, 'category', conflicts)
  const savings = mergeCollection(local.savings, remote.savings, 'savings', conflicts)
  const scalars = mergeScalars(local, remote)

  const updatedAt =
    time(local.updatedAt) >= time(remote.updatedAt) ? local.updatedAt : remote.updatedAt

  return {
    merged: {
      bank: scalars.bank,
      incomeDay: scalars.incomeDay,
      buffer: scalars.buffer,
      categories,
      savings,
      updatedAt: updatedAt ?? null,
      meta: scalars.meta,
    },
    conflicts,
  }
}

/** Whether a document carries any per-entity sync metadata (i.e. post-rework). */
function isStamped(d: BudgetState): boolean {
  if (d.meta && (d.meta.bank || d.meta.incomeDay || d.meta.buffer)) return true
  if (d.categories.some((e) => e.updatedAt || e.deletedAt)) return true
  if (d.savings.some((e) => e.updatedAt || e.deletedAt)) return true
  return false
}

/**
 * Whether two documents carry the same synced content (ignoring the
 * document-level `updatedAt`, which is just a coarse clock). Used to decide
 * whether a merge produced anything worth pushing back up.
 */
export function sameDocument(a: BudgetState, b: BudgetState): boolean {
  return docKey(a) === docKey(b)
}

function docKey(d: BudgetState): string {
  const cats = [...d.categories].sort((x, y) => x.id.localeCompare(y.id)).map(canonical)
  const sav = [...d.savings].sort((x, y) => x.id.localeCompare(y.id)).map(canonical)
  return JSON.stringify({
    bank: d.bank,
    incomeDay: d.incomeDay,
    buffer: d.buffer,
    meta: {
      bank: d.meta?.bank ?? null,
      incomeDay: d.meta?.incomeDay ?? null,
      buffer: d.meta?.buffer ?? null,
    },
    cats,
    sav,
  })
}

/**
 * Build a document that captures the LOSING versions of every conflict, so it
 * can be saved as a Dropbox conflict-copy. Starts from `base` (the merged/kept
 * document) and overlays each loser in place of its winner.
 */
export function conflictDocument(base: BudgetState, conflicts: Conflict[]): BudgetState {
  const catLosers = new Map(
    conflicts.filter((c) => c.kind === 'category').map((c) => [c.id, c.loser as Category]),
  )
  const savLosers = new Map(
    conflicts.filter((c) => c.kind === 'savings').map((c) => [c.id, c.loser as SavingsRow]),
  )
  return {
    ...base,
    categories: base.categories.map((c) => catLosers.get(c.id) ?? c),
    savings: base.savings.map((r) => savLosers.get(r.id) ?? r),
  }
}
