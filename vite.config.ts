import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
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
