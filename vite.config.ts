import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      // La app avisa cuando hay una versión nueva y el usuario decide cuándo actualizar.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        // `id` estable: el paquete Android (PWABuilder/TWA) y la instalación PWA identifican la app con él.
        id: '/',
        name: 'Mis Touch',
        short_name: 'Mis Touch',
        description: 'Tu colección de marcadores TOUCH: marcá cuáles tenés y cuáles te faltan.',
        lang: 'es',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F6F2',
        theme_color: '#F7F6F2',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
