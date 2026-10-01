/**
 * Accounts (CLAUDE.md "Счета"): the balance is a list of accounts, each with
 * its own balance (formula-capable), currency and name; the dashboard shows
 * their sum in the display currency. Covers the legacy migration (which must be
 * deterministic across devices), sanitizing, the store actions — including the
 * "always at least one account" rule — and the per-entity merge.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useBudgetStore } from '../../src/store/budgetStore'
import {
  MAIN_ACCOUNT_ID,
  STORAGE_KEY,
  coerceBudgetState,
  defaultState,
  migrateAccounts,
  normalizeBudgetState,
  selectBudgetState,
} from '../../src/store/persist'
import { conflictDocument, mergeBudget, sameDocument } from '../../src/sync/merge'
import { balancesUpdatedAt } from '../../src/lib/freshness'
import type { Account, BudgetState, ExchangeRates } from '../../src/types'

const T0 = '2026-07-01T00:00:00.000Z'
const T1 = '2026-07-02T00:00:00.000Z'
const T2 = '2026-07-03T00:00:00.000Z'

const RATES: ExchangeRates = { base: 'EUR', date: '2026-10-01', values: { usd: 1.25, amd: 400 } }

const acc = (id: string, p: Partial<Account> = {}): Account => ({
  id,
  name: '',
  balance: 0,
  currency: 'EUR',
  ...p,
})

function doc(p: Partial<BudgetState> = {}): BudgetState {
  return { ...defaultState, categories: [], savings: [], updatedAt: T0, ...p }
}

const live = () => useBudgetStore.getState().accounts.filter((a) => !a.deletedAt)
const byId = (id: string) => useBudgetStore.getState().accounts.find((a) => a.id === id)!

function reset(p: Partial<BudgetState> = {}): void {
  useBudgetStore.setState({ ...defaultState, categories: [], savings: [], ...p })
}

// ---------------------------------------------------------------------------
describe('legacy single balance → one account', () => {
  const legacy = {
    bank: 1230,
    bankExpr: '1200+30',
    bankCurrency: 'USD',
    currency: 'EUR',
    categories: [],
    savings: [],
    updatedAt: T0,
    meta: { bank: T1, incomeDay: T0 },
  }

  it('becomes the deterministic main account, keeping number, formula, currency and timestamp', () => {
    const s = normalizeBudgetState(legacy as unknown as Partial<BudgetState>)
    expect(s.accounts).toEqual([
      { id: MAIN_ACCOUNT_ID, name: '', balance: 1230, balanceExpr: '1200+30', currency: 'USD', updatedAt: T1 },
    ])
    expect('bank' in s).toBe(false)
    expect('bankExpr' in s).toBe(false)
  })

  it('falls back to the document currency for an untagged legacy balance', () => {
    const s = normalizeBudgetState({ bank: 5, currency: 'AMD' } as unknown as Partial<BudgetState>)
    expect(s.accounts[0]).toMatchObject({ balance: 5, currency: 'AMD' })
    expect(s.accounts[0]!.updatedAt).toBeUndefined()
  })

  it('two devices migrating independently produce the same account — merged, not doubled', () => {
    const a = normalizeBudgetState(legacy as unknown as Partial<BudgetState>)
    const b = normalizeBudgetState(JSON.parse(JSON.stringify(legacy)))
    expect(a.accounts).toEqual(b.accounts)
    const { merged, conflicts } = mergeBudget(a, b)
    expect(merged.accounts).toHaveLength(1)
    expect(merged.accounts[0]!.balance).toBe(1230)
    expect(conflicts).toEqual([])
  })

  it('migrates a legacy import and a legacy localStorage rehydrate the same way', async () => {
    expect(coerceBudgetState(legacy).accounts[0]!.balance).toBe(1230)

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: legacy, version: 0 }))
    await useBudgetStore.persist.rehydrate()
    const s = useBudgetStore.getState()
    expect(s.accounts).toEqual([
      { id: MAIN_ACCOUNT_ID, name: '', balance: 1230, balanceExpr: '1200+30', currency: 'USD', updatedAt: T1 },
    ])
    expect(s.updatedAt).toBe(T0) // a shape migration, not an edit
    localStorage.clear()
  })
})

describe('sanitizing accounts', () => {
  it('takes an accounts array as is, coercing every field', () => {
    const out = migrateAccounts(
      {
        accounts: [
          { id: 'a', name: 'Cash', balance: '12.5', currency: 'amd', balanceExpr: '10+2.5', updatedAt: T1 },
          { id: 'b', name: 7, balance: Infinity, currency: 'nope', deletedAt: T2 },
          null,
          'junk',
        ],
      } as never,
      'USD',
    )
    expect(out).toEqual([
      { id: 'a', name: 'Cash', balance: 12.5, balanceExpr: '10+2.5', currency: 'AMD', updatedAt: T1 },
      { id: 'b', name: '', balance: 0, currency: 'USD', deletedAt: T2 },
    ])
  })

  it('generates an id when missing', () => {
    const [a] = migrateAccounts({ accounts: [{ balance: 1 }] } as never)
    expect(typeof a!.id).toBe('string')
    expect(a!.id.length).toBeGreaterThan(0)
  })

  it('keeps an empty accounts array empty (no account invented on one device)', () => {
    expect(migrateAccounts({ accounts: [] } as never)).toEqual([])
  })

  it('prefers accounts over a stray legacy balance', () => {
    const out = migrateAccounts({ accounts: [acc('x', { balance: 3 })], bank: 999 } as never)
    expect(out).toEqual([acc('x', { balance: 3 })])
  })

  it('the default state has exactly one empty main account', () => {
    expect(defaultState.accounts).toEqual([acc(MAIN_ACCOUNT_ID)])
  })

  it('accounts are in the synced slice; the legacy fields are not', () => {
    const slice = selectBudgetState(doc({ accounts: [acc('a', { balance: 5 })] }))
    expect(slice.accounts).toEqual([acc('a', { balance: 5 })])
    expect('bank' in slice).toBe(false)
  })

  it('round-trips through export → import unchanged', () => {
    const s = normalizeBudgetState(
      doc({ accounts: [acc('a', { balance: 5, balanceExpr: '2+3', name: 'Card', updatedAt: T1 }), acc('b', { currency: 'AMD' })] }),
    )
    expect(coerceBudgetState(JSON.parse(JSON.stringify(selectBudgetState(s))))).toEqual(s)
  })
})

// ---------------------------------------------------------------------------
describe('account actions', () => {
  beforeEach(() => reset({ currency: 'AMD', rates: RATES }))

  it('addAccount creates an empty, stamped account in the display currency', () => {
    const id = useBudgetStore.getState().addAccount()
    expect(byId(id)).toMatchObject({ name: '', balance: 0, currency: 'AMD' })
    expect(byId(id).updatedAt).toBeTruthy()
    expect(live()).toHaveLength(2)
  })

  it('addAccount honours an explicit currency and trims the name', () => {
    const id = useBudgetStore.getState().addAccount({ name: '  Cash ', currency: 'USD' })
    expect(byId(id)).toMatchObject({ name: 'Cash', currency: 'USD' })
  })

  it('setAccountBalance stores the formula next to the number and stamps the account', () => {
    useBudgetStore.getState().setAccountBalance(MAIN_ACCOUNT_ID, 1230, '1200+30')
    expect(byId(MAIN_ACCOUNT_ID)).toMatchObject({ balance: 1230, balanceExpr: '1200+30' })
    expect(byId(MAIN_ACCOUNT_ID).updatedAt).toBeTruthy()
  })

  it('setAccountBalance drops the formula when retyped as a plain number', () => {
    useBudgetStore.getState().setAccountBalance(MAIN_ACCOUNT_ID, 1230, '1200+30')
    useBudgetStore.getState().setAccountBalance(MAIN_ACCOUNT_ID, 900)
    expect(byId(MAIN_ACCOUNT_ID).balance).toBe(900)
    expect('balanceExpr' in byId(MAIN_ACCOUNT_ID)).toBe(false)
  })

  it('setAccountBalance touches only its own account', () => {
    const id = useBudgetStore.getState().addAccount()
    useBudgetStore.getState().setAccountBalance(id, 50)
    expect(byId(MAIN_ACCOUNT_ID).balance).toBe(0)
    expect(byId(MAIN_ACCOUNT_ID).updatedAt).toBeUndefined()
  })

  it('renameAccount trims and stamps', () => {
    useBudgetStore.getState().renameAccount(MAIN_ACCOUNT_ID, '  Debit card  ')
    expect(byId(MAIN_ACCOUNT_ID).name).toBe('Debit card')
    expect(byId(MAIN_ACCOUNT_ID).updatedAt).toBeTruthy()
  })

  describe('setAccountCurrency (a relabel, not a conversion)', () => {
    it('keeps a plain number as typed', () => {
      useBudgetStore.getState().setAccountBalance(MAIN_ACCOUNT_ID, 1500)
      useBudgetStore.getState().setAccountCurrency(MAIN_ACCOUNT_ID, 'AMD')
      expect(byId(MAIN_ACCOUNT_ID)).toMatchObject({ balance: 1500, currency: 'AMD' })
    })

    it('re-evaluates a stored formula into the new currency', () => {
      useBudgetStore.getState().setAccountBalance(MAIN_ACCOUNT_ID, 40, '50 USD') // 50 USD = €40
      useBudgetStore.getState().setAccountCurrency(MAIN_ACCOUNT_ID, 'AMD')
      expect(byId(MAIN_ACCOUNT_ID)).toMatchObject({ balance: 16000, balanceExpr: '50 USD', currency: 'AMD' })
    })

    it('keeps the number when the formula can no longer be resolved', () => {
      useBudgetStore.setState({ rates: null })
      useBudgetStore.getState().setAccountBalance(MAIN_ACCOUNT_ID, 40, '50 USD')
      useBudgetStore.getState().setAccountCurrency(MAIN_ACCOUNT_ID, 'AMD')
      expect(byId(MAIN_ACCOUNT_ID)).toMatchObject({ balance: 40, currency: 'AMD' })
    })

    it('is a no-op for the same or a malformed currency, or an unknown account', () => {
      const before = JSON.stringify(useBudgetStore.getState().accounts)
      useBudgetStore.getState().setAccountCurrency(MAIN_ACCOUNT_ID, 'EUR')
      useBudgetStore.getState().setAccountCurrency(MAIN_ACCOUNT_ID, 'nope')
      useBudgetStore.getState().setAccountCurrency('ghost', 'USD')
      expect(JSON.stringify(useBudgetStore.getState().accounts)).toBe(before)
    })

    it('stamps the account so the relabel wins the merge', () => {
      useBudgetStore.getState().setAccountCurrency(MAIN_ACCOUNT_ID, 'USD')
      expect(byId(MAIN_ACCOUNT_ID).updatedAt).toBeTruthy()
    })
  })

  describe('always at least one account', () => {
    it('refuses to delete the last live account', () => {
      expect(useBudgetStore.getState().deleteAccount(MAIN_ACCOUNT_ID)).toBe(false)
      expect(live()).toHaveLength(1)
      expect(byId(MAIN_ACCOUNT_ID).deletedAt).toBeUndefined()
    })

    it('deletes (tombstones) any account while another remains', () => {
      const id = useBudgetStore.getState().addAccount()
      expect(useBudgetStore.getState().deleteAccount(MAIN_ACCOUNT_ID)).toBe(true)
      expect(byId(MAIN_ACCOUNT_ID).deletedAt).toBeTruthy()
      expect(live().map((a) => a.id)).toEqual([id])
      // …and now the survivor is the last one.
      expect(useBudgetStore.getState().deleteAccount(id)).toBe(false)
    })

    it('refuses an unknown or already-deleted account', () => {
      useBudgetStore.getState().addAccount()
      expect(useBudgetStore.getState().deleteAccount('ghost')).toBe(false)
      useBudgetStore.getState().deleteAccount(MAIN_ACCOUNT_ID)
      expect(useBudgetStore.getState().deleteAccount(MAIN_ACCOUNT_ID)).toBe(false)
    })

    it('restoreAccount undoes a delete and bumps updatedAt', () => {
      useBudgetStore.getState().addAccount()
      useBudgetStore.getState().deleteAccount(MAIN_ACCOUNT_ID)
      const deletedAt = byId(MAIN_ACCOUNT_ID).updatedAt
      useBudgetStore.getState().restoreAccount(MAIN_ACCOUNT_ID)
      expect(byId(MAIN_ACCOUNT_ID).deletedAt).toBeUndefined()
      expect(byId(MAIN_ACCOUNT_ID).updatedAt! >= deletedAt!).toBe(true)
      expect(live()).toHaveLength(2)
    })
  })
})

describe('finalizeMonth with several accounts', () => {
  it('records the total in the display currency and tags the row with it', () => {
    reset({
      currency: 'EUR',
      rates: RATES,
      accounts: [acc('a', { balance: 1000 }), acc('b', { balance: 400000, currency: 'AMD' })],
      savings: [{ id: 'old', month: '2026-01', saved: 500, currency: 'EUR', updatedAt: T0 }],
    })
    // The caller passes the display-currency total: €1000 + ֏400 000 (= €1000).
    useBudgetStore.getState().finalizeMonth(2000)
    const row = useBudgetStore.getState().savings.find((r) => r.id !== 'old')!
    expect(row).toMatchObject({ saved: 1500, currency: 'EUR' })
  })
})

// ---------------------------------------------------------------------------
describe('account merge', () => {
  it('the newer version of an account wins with its formula and currency — never a mismatched pair', () => {
    const local = doc({ accounts: [acc('a', { balance: 1230, balanceExpr: '1200+30', updatedAt: T0 })] })
    const remote = doc({ accounts: [acc('a', { balance: 50000, currency: 'AMD', updatedAt: T2 })] })
    const { merged } = mergeBudget(local, remote)
    expect(merged.accounts).toEqual([acc('a', { balance: 50000, currency: 'AMD', updatedAt: T2 })])
  })

  it('keeps unrelated accounts from both devices', () => {
    const local = doc({ accounts: [acc('main', { updatedAt: T0 }), acc('card', { balance: 10, updatedAt: T1 })] })
    const remote = doc({ accounts: [acc('main', { updatedAt: T0 }), acc('cash', { balance: 20, updatedAt: T1 })] })
    const ids = mergeBudget(local, remote).merged.accounts.map((a) => a.id).sort()
    expect(ids).toEqual(['card', 'cash', 'main'])
  })

  it('a delete survives a merge with an older edit (tombstone)', () => {
    const local = doc({ accounts: [acc('a', { deletedAt: T2, updatedAt: T2 }), acc('b', { updatedAt: T0 })] })
    const remote = doc({ accounts: [acc('a', { balance: 99, updatedAt: T1 }), acc('b', { updatedAt: T0 })] })
    expect(mergeBudget(local, remote).merged.accounts.find((a) => a.id === 'a')!.deletedAt).toBe(T2)
  })

  it('a same-timestamp collision keeps a conflict-copy of the losing account', () => {
    const local = doc({ accounts: [acc('a', { balance: 1, updatedAt: T1 })] })
    const remote = doc({ accounts: [acc('a', { balance: 2, updatedAt: T1 })] })
    const { merged, conflicts } = mergeBudget(local, remote)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.kind).toBe('account')
    const copy = conflictDocument(merged, conflicts)
    expect(copy.accounts[0]!.balance).not.toBe(merged.accounts[0]!.balance)
  })

  it('sameDocument sees an account change', () => {
    const a = doc({ accounts: [acc('a', { balance: 1 })] })
    expect(sameDocument(a, doc({ accounts: [acc('a', { balance: 1 })] }))).toBe(true)
    expect(sameDocument(a, doc({ accounts: [acc('a', { balance: 2 })] }))).toBe(false)
    expect(sameDocument(a, doc({ accounts: [acc('a', { balance: 1, currency: 'AMD' })] }))).toBe(false)
  })

  it('a stamped account switches the merge to per-entity mode', () => {
    // Remote's document clock is newer, but local's account edit is newer.
    const local = doc({ updatedAt: T0, accounts: [acc('a', { balance: 7, updatedAt: T2 })] })
    const remote = doc({ updatedAt: T2, accounts: [acc('a', { balance: 3, updatedAt: T1 })], incomeDay: 10 })
    expect(mergeBudget(local, remote).merged.accounts[0]!.balance).toBe(7)
  })
})

describe('balancesUpdatedAt — one shared freshness line', () => {
  it('is the newest change among live accounts', () => {
    expect(balancesUpdatedAt([acc('a', { updatedAt: T0 }), acc('b', { updatedAt: T2 }), acc('c', { updatedAt: T1 })])).toBe(T2)
  })

  it('ignores deleted accounts and missing timestamps', () => {
    expect(balancesUpdatedAt([acc('a', { updatedAt: T0 }), acc('b', { updatedAt: T2, deletedAt: T2 }), acc('c')])).toBe(T0)
    expect(balancesUpdatedAt([acc('a')])).toBeNull()
    expect(balancesUpdatedAt([])).toBeNull()
  })
})
