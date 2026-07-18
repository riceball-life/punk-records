import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-180.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Punk Records',
        short_name: 'Punk Records',
        description: 'Punk Records — a private daily journal, one entry per day.',
        theme_color: '#a8c2e6',
        background_color: '#a8c2e6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // The app shell is tiny and fully client-side; cache it all for offline.
        navigateFallback: '/index.html',
      },
      devOptions: {
        // Keep the service worker out of `npm run dev` to avoid stale caching
        // while iterating; it's active in the production build / preview.
        enabled: false,
      },
    }),
  ],
});
