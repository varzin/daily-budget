/// <reference lib="webworker" />

/**
 * Service Worker, ported from the project's original sw.js to TypeScript
 * for vite-plugin-pwa's `injectManifest` strategy.
 *
 * Key differences from the original:
 *  - The hardcoded PRECACHE list is replaced by `self.__WB_MANIFEST`, the
 *    glob-driven manifest injected by vite-plugin-pwa. Each entry carries a
 *    `revision` hash so the manifest changes whenever any asset changes —
 *    that's our new versioning mechanism. We no longer need a manual VERSION.
 *  - Cache name keeps the `daily-budget` prefix and bakes the manifest hash
 *    into it so each new deploy gets a fresh cache (the original sw.js
 *    relied on a manual VERSION bump for this).
 *  - No `message` handler / SKIP_WAITING listener: vite-plugin-pwa with
 *    `registerType: 'autoUpdate'` calls skipWaiting() itself; we also keep
 *    self.skipWaiting() in the install handler for parity with the
 *    original SW's behaviour.
 *
 * Fetch strategy mirrors sw.js:
 *   - Pass-through for cross-origin (Dropbox API et al.) — never intercept.
 *   - Network-first for HTML navigation / document / script requests, with
 *     a cache fallback for offline (and a final fallback to the precached
 *     index / start URL).
 *   - Cache-first for everything else same-origin, with a background
 *     refresh that doesn't block the response.
 */

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

const MANIFEST = self.__WB_MANIFEST
const PRECACHE_ASSETS = MANIFEST.map((e) => e.url)

// Derive a cache-name suffix from the manifest so a redeploy invalidates
// the previous cache without us having to bump a const by hand.
function manifestHash(): string {
  let h = 0
  for (const e of MANIFEST) {
    const key = `${e.url}|${e.revision ?? ''}`
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) | 0
    }
  }
  // Unsigned hex for a stable, short suffix.
  return (h >>> 0).toString(16)
}

const CACHE = `daily-budget-${manifestHash()}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // Use Request objects with `cache: 'reload'` so the install fetches
      // skip the HTTP cache — same intent as the original sw.js, applied
      // to manifest URLs.
      await Promise.all(
        PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('daily-budget-') && k !== CACHE)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Cross-origin (Dropbox API, fonts CDN, etc.) — never intercept.
  if (url.origin !== self.location.origin) return

  const isHTML =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.destination === 'script'

  if (isHTML) {
    event.respondWith(networkFirst(req))
    return
  }

  event.respondWith(cacheFirst(req))
})

async function networkFirst(req: Request): Promise<Response> {
  try {
    const res = await fetch(req)
    // Stash a clone in the cache for offline use.
    const clone = res.clone()
    caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {})
    return res
  } catch {
    const hit = await caches.match(req)
    if (hit) return hit
    // Fall back to the precached start URL — index.html under base.
    const fallback =
      (await caches.match('./')) ||
      (await caches.match('index.html')) ||
      (await caches.match('/'))
    if (fallback) return fallback
    return new Response('', { status: 504, statusText: 'Gateway Timeout' })
  }
}

async function cacheFirst(req: Request): Promise<Response> {
  const hit = await caches.match(req)
  if (hit) {
    // Background refresh, fire-and-forget.
    fetch(req)
      .then((res) =>
        caches.open(CACHE).then((c) => c.put(req, res)).catch(() => {}),
      )
      .catch(() => {})
    return hit
  }
  const res = await fetch(req)
  const clone = res.clone()
  caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {})
  return res
}

// Mark this file as a module for TS isolatedModules.
export {}
