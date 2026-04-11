import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        // prompt + onNeedRefresh في main.tsx يمنع إعادة تحميل مفاجئة أثناء الكتابة
        registerType: 'prompt',
        devOptions: {
          enabled: false,
        },
        workbox: {
          skipWaiting: false,
          clientsClaim: false,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cloudinary-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            }
          ],
        },
        manifest: {
          name: 'فاتورتي',
          short_name: 'فاتورتي',
          description: 'نظام إدارة الفواتير',
          theme_color: '#3b82f6',
          background_color: '#f9fafb',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split Firebase into its own chunk (~350KB) — loads in parallel
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            // Split animation library (~100KB)
            motion: ['motion/react'],
            // Split react core separately for better caching
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // Split date utilities (~30KB) — used on many pages
            datefns: ['date-fns'],
            // Split image compression (~50KB) — only needed for upload forms
            imgcompress: ['browser-image-compression'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
