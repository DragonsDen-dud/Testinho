import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' (not 'autoUpdate') so the app controls registration itself
      // via virtual:pwa-register — see src/state/pwaUpdate.ts. autoUpdate's
      // injected register script has no hook for a UI prompt; it silently
      // waits for a natural navigation/reload to actually surface a new
      // build, which was the "looks unfixed until you fully close and
      // reopen" gotcha documented in README.md before this round.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'STOA',
        short_name: 'STOA',
        description: 'Personal life-tracking companion — habits, tasks, journal.',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
