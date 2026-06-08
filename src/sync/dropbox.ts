import type { BudgetState, SyncInfo, SyncStatus } from '../types'
import { useBudgetStore, wasLastChangeRemote } from '../store/budgetStore'
import {
  mergeBudget,
  sameDocument,
  conflictDocument,
  type Conflict,
} from './merge'

// Public Dropbox App key (client ID). Not a secret — safe to ship.
// If you fork this project, replace with your own from
// https://www.dropbox.com/developers/apps
const DROPBOX_APP_KEY = 'c02o5hadwqgywrr'

const FILE_PATH = '/budget.json'
const TOKENS_KEY = 'budget_app_dropbox_v1'
const PUSH_DEBOUNCE_MS = 2000
const MAX_CAS_RETRIES = 4

// ---------- store access helpers ----------
const getLocalState = () => useBudgetStore.getState()
const replaceLocalState = (s: BudgetState) =>
  useBudgetStore.getState().replaceState(s, { fromRemote: true })

function snapshotPayload(): BudgetState {
  const s = getLocalState()
  return {
    bank: s.bank,
    incomeDay: s.incomeDay,
    buffer: s.buffer,
    currency: s.currency,
    categories: s.categories,
    savings: s.savings,
    updatedAt: s.updatedAt,
    meta: s.meta,
  }
}

// ---------- compare-and-swap state ----------
// The Dropbox `rev` of /budget.json as we last saw it. Every write is a
// rev-checked `update` (never a blind `overwrite`), so a change that landed
// since our last pull makes Dropbox reject the write instead of silently
// clobbering it. `null` means "we've never seen the file" → create with `add`.
let lastRev: string | null = null
// Losing entity versions from the most recent merge, awaiting a conflict-copy.
let pendingConflicts: Conflict[] = []

// ---------- token storage ----------
interface DropboxTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

function loadTokens(): DropboxTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? (JSON.parse(raw) as DropboxTokens) : null
  } catch {
    return null
  }
}
function saveTokens(t: DropboxTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(t))
}
function clearTokens(): void {
  localStorage.removeItem(TOKENS_KEY)
}

// ---------- redirect URI (must match Dropbox app settings) ----------
function getRedirectUri(): string {
  let p = window.location.pathname
  if (!p.endsWith('/')) p = p.replace(/[^/]*$/, '')
  return window.location.origin + p
}

// ---------- status state machine ----------
let status: SyncStatus = 'not_connected'
let lastSyncAt: number | null = null
let lastError: string | null = null
let account: { email?: string; name?: string } | null = null

const statusListeners: Array<(s: SyncInfo) => void> = []

export function onSyncStatusChange(fn: (s: SyncInfo) => void): void {
  statusListeners.push(fn)
  fn(getSyncStatus())
}

export function getSyncStatus(): SyncInfo {
  return { status, lastSyncAt, lastError, account, connected: !!loadTokens() }
}

interface SetStatusExtra {
  lastSyncAt?: number | null
  lastError?: string | null
  account?: { email?: string; name?: string } | null
}

function setStatus(next: SyncStatus, extra: SetStatusExtra = {}): void {
  status = next
  if (extra.lastSyncAt !== undefined) lastSyncAt = extra.lastSyncAt
  if (extra.lastError !== undefined) lastError = extra.lastError
  if (extra.account !== undefined) account = extra.account
  statusListeners.forEach((fn) => fn(getSyncStatus()))
}

// ---------- PKCE helpers ----------
function randomString(len = 64): string {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => ('0' + b.toString(16)).slice(-2))
    .join('')
    .slice(0, len)
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return base64url(new Uint8Array(buf))
}
function base64url(bytes: Uint8Array): string {
  let str = ''
  bytes.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ---------- OAuth: kick off ----------
export async function connectDropbox(): Promise<void> {
  const verifier = randomString(64)
  const challenge = await sha256(verifier)
  sessionStorage.setItem('dbx_pkce_verifier', verifier)
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: getRedirectUri(),
    token_access_type: 'offline', // needed to get a refresh_token
  })
  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params}`
}

// ---------- OAuth: handle callback (called on page load) ----------
async function handleOAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return false

  const verifier = sessionStorage.getItem('dbx_pkce_verifier')
  // Clear URL params immediately so a reload doesn't try to re-redeem the code
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.toString())

  if (!verifier) {
    setStatus('error', { lastError: 'OAuth state lost. Try connecting again.' })
    return true
  }

  setStatus('connecting')
  try {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        code_verifier: verifier,
        redirect_uri: getRedirectUri(),
      }),
    })
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
    const data = await res.json()
    saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    })
    sessionStorage.removeItem('dbx_pkce_verifier')
    // Fire-and-forget: get account info, then do the initial sync
    fetchAccountInfo().catch(() => {})
    return true
  } catch (err) {
    setStatus('error', { lastError: errorMessage(err) })
    return true
  }
}

// ---------- token refresh ----------
async function refreshAccessToken(): Promise<string> {
  const tokens = loadTokens()
  if (!tokens?.refresh_token) throw new Error('No refresh token')
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: DROPBOX_APP_KEY,
    }),
  })
  if (!res.ok) {
    clearTokens()
    throw new Error('Refresh failed — please reconnect')
  }
  const data = await res.json()
  const next: DropboxTokens = {
    ...tokens,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  if (data.refresh_token) next.refresh_token = data.refresh_token
  saveTokens(next)
  return next.access_token
}

async function getAccessToken(): Promise<string> {
  const tokens = loadTokens()
  if (!tokens) throw new Error('Not connected')
  if (Date.now() > tokens.expires_at - 60_000) {
    return await refreshAccessToken()
  }
  return tokens.access_token
}

// ---------- low-level fetch with auto-refresh on 401 ----------
async function dbxFetch(url: string, opts: RequestInit): Promise<Response> {
  let token = await getAccessToken()
  let res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    token = await refreshAccessToken()
    res = await fetch(url, {
      ...opts,
      headers: { ...opts.headers, Authorization: `Bearer ${token}` },
    })
  }
  return res
}

// ---------- account info ----------
async function fetchAccountInfo(): Promise<{ email?: string; name?: string } | null> {
  const res = await dbxFetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null',
  })
  if (!res.ok) return null
  const data = await res.json()
  const info = { email: data.email, name: data.name?.display_name }
  account = info
  statusListeners.forEach((fn) => fn(getSyncStatus()))
  return info
}

// ---------- remote download + entity merge ----------
//
// Downloads /budget.json, merges it into the local store per-entity, remembers
// its rev, and stashes any conflicts. Returns whether the merge produced
// something worth pushing back up (local had changes the remote lacks, or a
// conflict needs its copy written). `path/not_found` means the file doesn't
// exist yet → caller should create it.
async function mergeFromRemote(): Promise<{ needsPush: boolean }> {
  const res = await dbxFetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { 'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH }) },
  })
  if (res.status === 409) {
    // path/not_found — first sync. Create the file from local data.
    lastRev = null
    return { needsPush: true }
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)

  const remote = JSON.parse(await res.text()) as BudgetState
  lastRev = readRev(res)

  const local = snapshotPayload()
  const { merged, conflicts } = mergeBudget(local, remote)
  pendingConflicts.push(...conflicts)
  replaceLocalState(merged)

  // Push back only if we actually contribute something (avoid echo loops).
  const needsPush = conflicts.length > 0 || !sameDocument(merged, remote)
  return { needsPush }
}

function readRev(res: Response): string | null {
  const raw = res.headers.get('Dropbox-API-Result')
  if (!raw) return null
  try {
    return (JSON.parse(raw) as { rev?: string }).rev ?? null
  } catch {
    return null
  }
}

// ---------- pull ----------
export async function pull(): Promise<void> {
  if (!loadTokens()) return
  setStatus('syncing')
  try {
    const { needsPush } = await mergeFromRemote()
    if (needsPush) {
      await pushNow()
    } else {
      setStatus('synced', { lastSyncAt: Date.now(), lastError: null })
    }
  } catch (err) {
    reportError(err)
  }
}

// ---------- push (compare-and-swap) ----------
let pushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePush(immediate = false): void {
  if (!loadTokens()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushNow()
  }, immediate ? 0 : PUSH_DEBOUNCE_MS)
}

/**
 * Write local state up with a rev-checked compare-and-swap. If Dropbox rejects
 * the write because the file moved on (a concurrent push from another device),
 * re-pull + merge to fold in that change, then retry against the new rev — so
 * the other device's write is never lost (CLAUDE.md layer 1 + 2).
 */
export async function push(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  await pushNow()
}

async function pushNow(): Promise<void> {
  if (!loadTokens()) return
  setStatus('syncing')
  try {
    for (let attempt = 0; attempt <= MAX_CAS_RETRIES; attempt++) {
      // Save any losing versions beside the primary file before overwriting it.
      await flushConflictCopies()

      const mode = lastRev
        ? { '.tag': 'update', update: lastRev }
        : 'add'
      const res = await dbxFetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH, mode, mute: true }),
          'Content-Type': 'application/octet-stream',
        },
        body: JSON.stringify(snapshotPayload()),
      })

      if (res.ok) {
        const meta = JSON.parse(await res.text()) as { rev?: string }
        lastRev = meta.rev ?? lastRev
        setStatus('synced', { lastSyncAt: Date.now(), lastError: null })
        return
      }

      if (res.status === 409) {
        // Stale rev (or a file appeared under us) — merge what's there and retry.
        await mergeFromRemote()
        continue
      }

      throw new Error(`Upload failed: ${res.status}`)
    }
    throw new Error('Upload kept conflicting — please try again')
  } catch (err) {
    reportError(err)
  }
}

// ---------- conflict copies ----------
// When entity merge couldn't confidently pick a winner, the loser is saved
// next to the primary file so no edit is ever thrown away (CLAUDE.md layer 3).
async function flushConflictCopies(): Promise<void> {
  if (pendingConflicts.length === 0) return
  const conflicts = pendingConflicts
  pendingConflicts = []
  const copy = conflictDocument(snapshotPayload(), conflicts)
  const path = conflictCopyPath()
  await dbxFetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: true }),
      'Content-Type': 'application/octet-stream',
    },
    body: JSON.stringify(copy),
  })
}

function conflictCopyPath(): string {
  const device = account?.name || account?.email || 'device'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `/budget (conflict ${device} ${stamp}).json`
}

function reportError(err: unknown): void {
  const msg = errorMessage(err)
  if (msg === 'Not connected') {
    setStatus('not_connected')
    return
  }
  setStatus(navigator.onLine ? 'error' : 'offline', { lastError: msg })
}

// ---------- auto-push subscription ----------
let autoPushStarted = false
let unsubscribeAutoPush: (() => void) | null = null

export function startAutoPush(): void {
  if (autoPushStarted) return
  autoPushStarted = true
  unsubscribeAutoPush = useBudgetStore.subscribe((s, prev) => {
    // Skip changes that originated from a remote pull — otherwise we'd
    // immediately echo them back as a push.
    if (wasLastChangeRemote()) return
    // Skip noise (selector subscriptions notifying us with identical updatedAt).
    if (s.updatedAt === prev.updatedAt) return
    schedulePush()
  })
}

function stopAutoPush(): void {
  if (unsubscribeAutoPush) {
    unsubscribeAutoPush()
    unsubscribeAutoPush = null
  }
  autoPushStarted = false
}

// ---------- public API ----------
export async function syncNow(): Promise<void> {
  if (!loadTokens()) return
  await pull()
  // Flush any debounced local push that piled up during/just before the pull.
  if (pushTimer) await push()
}

export function disconnectDropbox(): void {
  clearTokens()
  account = null
  lastSyncAt = null
  lastError = null
  lastRev = null
  pendingConflicts = []
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  stopAutoPush()
  setStatus('not_connected', { lastSyncAt: null, lastError: null, account: null })
}

// ---------- init ----------
export async function initSync(): Promise<void> {
  const wasCallback = await handleOAuthCallback()
  if (!loadTokens()) {
    setStatus('not_connected')
    return
  }
  // Start watching the store for local mutations so we push them up.
  startAutoPush()
  // Restore stale account info from a previous session if we have it
  if (!account) {
    fetchAccountInfo().catch(() => {})
  }
  if (wasCallback) {
    // Initial sync right after OAuth — push if local has data, else pull
    await syncNow()
  } else {
    await pull()
  }
}

// ---------- helpers ----------
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
