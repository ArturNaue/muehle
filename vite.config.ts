// v1.0.0 | 2026-06-02 MEZ
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/apps/Muehle/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,ico}'],
      },
      manifest: {
        name: 'Mühle – Brettspiel',
        short_name: 'Mühle',
        description: 'Klassisches Mühle-Spiel für 2 oder 3 Spieler als PWA.',
        theme_color: '#4c2e17',
        background_color: '#f7e1bd',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
});
