import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/daily-budget/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: null,  // we'll register manually in main.tsx for the update banner UX
      manifest: false,  // we'll ship manifest.webmanifest from public/ as-is
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2,woff,ttf}']
      },
      devOptions: { enabled: false }
    })
  ]
})
