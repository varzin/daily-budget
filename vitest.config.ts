import { defineConfig } from 'vitest/config'

// Standalone Vitest config — intentionally NOT importing the app's vite.config
// (the PWA plugin and injectManifest step are irrelevant to unit/e2e tests and
// only slow things down). The synced code under test (store, sync, lib) is
// plain TS with no JSX, so no React plugin is needed.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
    // Each test file gets a fresh module registry so the Dropbox sync
    // singleton (module-level status/timers) and the Zustand store start clean.
    isolate: true,
    restoreMocks: true,
  },
})
