// Bump this on every deploy to force the SW to install a fresh cache.
const VERSION = '2026-05-28-1'
const CACHE = `daily-budget-${VERSION}`

// What to pre-cache for offline use. Same-origin only.
const PRECACHE = [
  './',
  'index.html',
  'styles/tokens.css',
  'styles/base.css',
  'styles/layout.css',
  'styles/components.css',
  'styles/responsive.css',
  'js/app.js',
  'js/state.js',
  'js/sync.js',
  'js/dashboard.js',
  'js/categories.js',
  'js/savings.js',
  'js/chart.js',
  'js/math.js',
  'js/utils.js'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Strategy:
//   - HTML navigations + module scripts: network-first (always try to get the
//     latest), fall back to cache if offline.
//   - Static assets (CSS, fonts, etc.): cache-first for speed, refresh in the
//     background.
// Dropbox API and other cross-origin requests are passed through untouched.
self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isHTML = req.mode === 'navigate'
    || req.destination === 'document'
    || req.destination === 'script'

  if (isHTML) {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(req, clone))
        return res
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./')))
    )
    return
  }

  // Cache-first for everything else same-origin.
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        // Background refresh — don't block the response on it.
        fetch(req).then(res => caches.open(CACHE).then(c => c.put(req, res))).catch(() => {})
        return hit
      }
      return fetch(req).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(req, clone))
        return res
      })
    })
  )
})
