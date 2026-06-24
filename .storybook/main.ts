import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook 10 (react-vite) config for daily-budget.
 *
 * Deliberately does NOT reuse the app's vite.config.ts: that config sets
 * `base: '/daily-budget/'` and registers vite-plugin-pwa (injectManifest + a
 * service worker that imports `virtual:pwa-register`). Storybook's react-vite
 * builder ships its own Vite config; we keep it clean and only strip the PWA
 * plugin defensively in viteFinal in case anything pulls it in transitively.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    // Autodocs + MDX docs live in addon-docs in SB10 (no more "essentials").
    '@storybook/addon-docs',
    // This app cares about a11y (focus traps, radiogroups, touch targets).
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (viteConfig) => {
    // builder-vite merges the project's vite.config.ts, which registers
    // vite-plugin-pwa (injectManifest + a service worker importing
    // `virtual:pwa-register`). That breaks the Storybook build. Strip every
    // PWA/workbox plugin, recursing into nested plugin arrays.
    const stripPwa = (plugins: unknown[]): unknown[] =>
      plugins
        .filter((p) => {
          const name = (p as { name?: string } | null | undefined)?.name ?? ''
          return !name.toLowerCase().includes('pwa') && !name.toLowerCase().includes('workbox')
        })
        .map((p) => (Array.isArray(p) ? stripPwa(p) : p))
    viteConfig.plugins = stripPwa(viteConfig.plugins ?? [])
    // Don't inherit the app's `/daily-budget/` base.
    viteConfig.base = './'
    return viteConfig
  },
}

export default config
