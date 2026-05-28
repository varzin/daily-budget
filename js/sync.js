import { state, replaceState, saveState } from './state.js'

// Public Dropbox App key (client ID). Not a secret — safe to ship.
// If you fork this project, replace with your own from
// https://www.dropbox.com/developers/apps
const DROPBOX_APP_KEY = 'c02o5hadwqgywrr'

const FILE_PATH = '/budget.json'
const TOKENS_KEY = 'budget_app_dropbox_v1'
const PUSH_DEBOUNCE_MS = 2000

// ---------- redirect URI (must match Dropbox app settings) ----------
function getRedirectUri() {
  let p = window.location.pathname
  if (!p.endsWith('/')) p = p.replace(/[^/]*$/, '')
  return window.location.origin + p
}

// ---------- token storage ----------
function loadTokens() {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveTokens(t) { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)) }
function clearTokens() { localStorage.removeItem(TOKENS_KEY) }

// ---------- status state machine ----------
const STATUSES = ['not_connected', 'connecting', 'syncing', 'synced', 'offline', 'error']
let status = 'not_connected'
let lastSyncAt = null
let lastError = null
let account = null  // { email, name }

const statusListeners = []
export function onSyncStatusChange(fn) { statusListeners.push(fn); fn(getSyncStatus()) }
export function getSyncStatus() {
  return { status, lastSyncAt, lastError, account, connected: !!loadTokens() }
}
function setStatus(next, extra = {}) {
  status = next
  if (extra.lastSyncAt !== undefined) lastSyncAt = extra.lastSyncAt
  if (extra.lastError !== undefined) lastError = extra.lastError
  if (extra.account !== undefined) account = extra.account
  statusListeners.forEach(fn => fn(getSyncStatus()))
}

// ---------- PKCE helpers ----------
function randomString(len = 64) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => ('0' + b.toString(16)).slice(-2)).join('').slice(0, len)
}
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return base64url(new Uint8Array(buf))
}
function base64url(bytes) {
  let str = ''
  bytes.forEach(b => str += String.fromCharCode(b))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ---------- OAuth: kick off ----------
export async function connectDropbox() {
  const verifier = randomString(64)
  const challenge = await sha256(verifier)
  sessionStorage.setItem('dbx_pkce_verifier', verifier)
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: getRedirectUri(),
    token_access_type: 'offline'  // needed to get a refresh_token
  })
  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params}`
}

// ---------- OAuth: handle callback (called on page load) ----------
async function handleOAuthCallback() {
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
        redirect_uri: getRedirectUri()
      })
    })
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
    const data = await res.json()
    saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    })
    sessionStorage.removeItem('dbx_pkce_verifier')
    // Fire-and-forget: get account info, then do the initial sync
    fetchAccountInfo().catch(() => {})
    return true
  } catch (err) {
    setStatus('error', { lastError: err.message })
    return true
  }
}

// ---------- token refresh ----------
async function refreshAccessToken() {
  const tokens = loadTokens()
  if (!tokens?.refresh_token) throw new Error('No refresh token')
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: DROPBOX_APP_KEY
    })
  })
  if (!res.ok) {
    clearTokens()
    throw new Error('Refresh failed — please reconnect')
  }
  const data = await res.json()
  const next = {
    ...tokens,
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000)
  }
  if (data.refresh_token) next.refresh_token = data.refresh_token
  saveTokens(next)
  return next.access_token
}

async function getAccessToken() {
  const tokens = loadTokens()
  if (!tokens) throw new Error('Not connected')
  if (Date.now() > tokens.expires_at - 60_000) {
    return await refreshAccessToken()
  }
  return tokens.access_token
}

// ---------- low-level fetch with auto-refresh on 401 ----------
async function dbxFetch(url, opts) {
  let token = await getAccessToken()
  let res = await fetch(url, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    token = await refreshAccessToken()
    res = await fetch(url, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${token}` } })
  }
  return res
}

// ---------- account info ----------
async function fetchAccountInfo() {
  const res = await dbxFetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null'
  })
  if (!res.ok) return null
  const data = await res.json()
  const info = { email: data.email, name: data.name?.display_name }
  account = info
  statusListeners.forEach(fn => fn(getSyncStatus()))
  return info
}

// ---------- pull ----------
export async function pull() {
  if (!loadTokens()) return
  setStatus('syncing')
  try {
    const res = await dbxFetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: { 'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH }) }
    })
    if (res.status === 409) {
      // path/not_found — file doesn't exist yet. First sync: push local up.
      setStatus('synced', { lastSyncAt: Date.now() })
      schedulePush(true)
      return
    }
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const remote = JSON.parse(await res.text())
    const local = state
    const remoteAt = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0
    const localAt = local.updatedAt ? new Date(local.updatedAt).getTime() : 0

    if (remoteAt > localAt) {
      replaceState(remote)
      window.dispatchEvent(new CustomEvent('state:replaced'))
    } else if (localAt > remoteAt) {
      // local is newer — push it up
      schedulePush(true)
    }
    setStatus('synced', { lastSyncAt: Date.now(), lastError: null })
  } catch (err) {
    if (err.message === 'Not connected') {
      setStatus('not_connected')
      return
    }
    setStatus(navigator.onLine ? 'error' : 'offline', { lastError: err.message })
  }
}

// ---------- push (debounced) ----------
let pushTimer = null
function schedulePush(immediate = false) {
  if (!loadTokens()) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(doPush, immediate ? 0 : PUSH_DEBOUNCE_MS)
}

async function doPush() {
  if (!loadTokens()) return
  setStatus('syncing')
  try {
    const res = await dbxFetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH, mode: 'overwrite', mute: true }),
        'Content-Type': 'application/octet-stream'
      },
      body: JSON.stringify(state)
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    setStatus('synced', { lastSyncAt: Date.now(), lastError: null })
  } catch (err) {
    setStatus(navigator.onLine ? 'error' : 'offline', { lastError: err.message })
  }
}

// ---------- public API ----------
export function notifyLocalChange() { schedulePush() }

export async function syncNow() {
  if (!loadTokens()) return
  await pull()
  // pull schedules a push if local is newer; flush immediately
  if (pushTimer) {
    clearTimeout(pushTimer)
    await doPush()
  }
}

export function disconnectDropbox() {
  clearTokens()
  account = null
  lastSyncAt = null
  lastError = null
  clearTimeout(pushTimer)
  setStatus('not_connected', { lastSyncAt: null, lastError: null, account: null })
}

// ---------- init ----------
export async function initSync() {
  const wasCallback = await handleOAuthCallback()
  if (!loadTokens()) {
    setStatus('not_connected')
    return
  }
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
