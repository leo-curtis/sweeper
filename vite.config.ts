import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/sweeper/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/**/*'],
      manifest: {
        name: 'Sweeper',
        short_name: 'Sweeper',
        description: 'Sweeper, a mine-clearing puzzle web application',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/sweeper/',
        scope: '/sweeper/',
        icons: [
          {
            src: '/sweeper/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/sweeper/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine')
    }
  },
  server: {
    port: 5173
  }
});
