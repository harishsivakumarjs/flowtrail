import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FlowTrail',
        short_name: 'FlowTrail',
        description: 'Personal productivity — habits, tasks, journal, calendar',
        theme_color: '#0f0f11',
        background_color: '#0f0f11',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'https://api.iconify.design/twemoji:zap.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'https://api.iconify.design/twemoji:zap.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})