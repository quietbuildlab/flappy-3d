import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

// Deploy targets serve at different paths:
//   - GitHub Pages: https://<user>.github.io/flappy-3d/  → base = /flappy-3d/
//   - Cloudflare Pages: https://flappy-3d.pages.dev/      → base = /
// Set VITE_BASE in env to override (CI-driven). Default keeps GH Pages working.
const BASE = process.env.VITE_BASE ?? '/flappy-3d/'

export default defineConfig({
  base: BASE,
  preview: { cors: true },
  build: {
    rollupOptions: {
      input: { main: 'index.html', component: 'src/component.ts' },
      output: {
        entryFileNames: (chunk) => chunk.name === 'component' ? 'component.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,svg,ico,mp3,woff2}'],
        maximumFileSizeToCacheInBytes: 5_000_000,
        runtimeCaching: [
          {
            urlPattern: /\.mp3$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'Flappy 3D',
        short_name: 'Flappy 3D',
        description: 'A polished 3D Flappy Bird PWA.',
        theme_color: '#7ec8e3',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        // start_url + scope must match the served path. Mirror BASE so the PWA
        // installs correctly on whichever host this build targets.
        start_url: BASE,
        scope: BASE,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: false,
    }),
  ],
})
