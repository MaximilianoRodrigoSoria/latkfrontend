/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'L.A TK - Latin America Transaction Kernel',
        short_name: 'L.A TK',
        description: 'Gestion de prestamos, cobranzas y comisiones',
        lang: 'es-AR',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E1621',
        theme_color: '#0E1621',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // La API nunca se cachea en el service worker: los datos de prestamos los maneja
        // TanStack Query y no deben quedar en un cache persistente del navegador.
        navigateFallbackDenylist: [/^\/latk-api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    // En desarrollo la API va por proxy: mismo origen, sin CORS.
    proxy: {
      '/latk-api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
