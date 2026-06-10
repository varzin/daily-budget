/**
 * Typed handle to vite-plugin-pwa's `registerSW` updater. main.tsx stores the
 * updater here at boot; UpdateBanner applies it on "Reload". Replaces the old
 * untyped `window.__pwaUpdateSW` global.
 */

export const PWA_NEED_REFRESH_EVENT = 'pwa:need-refresh'

type UpdateSW = (reloadPage?: boolean) => Promise<void> | void

let updateSW: UpdateSW | null = null

export function setPwaUpdater(fn: UpdateSW): void {
  updateSW = fn
}

/** Activate the waiting service worker and reload; plain reload as fallback. */
export function applyPwaUpdate(): void {
  if (updateSW) {
    void updateSW(true)
  } else {
    window.location.reload()
  }
}
