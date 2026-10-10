import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      // three.js (3D lab) and livekit-client (live class) are ~550 kB libraries loaded only on demand
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        // The app, plus the page LiveKit Egress renders when recording a class
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          recording: path.resolve(import.meta.dirname, 'recording-layout.html'),
        },
        output: {
          // Long-lived vendor chunks stay cached across app deploys
          manualChunks(id: string) {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
            if (id.includes('node_modules/lucide-react/')) return 'icons';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
