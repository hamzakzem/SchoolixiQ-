import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.APP_URL': JSON.stringify(env.APP_URL || env.VITE_APP_URL || ''),
      // Shown in the footer so a deployed release can be identified at a glance.
      __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Firebase is very large, isolate it cleanly
              if (id.includes('firebase')) {
                return 'firebase-vendor';
              }
              // PDF utilities are massive and only loaded for printing/reports
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
                return 'pdf-vendor';
              }
              // Sentry is loaded with a dynamic import only when a DSN is configured;
              // keep it out of the eagerly-loaded vendor chunk.
              if (id.includes('@sentry')) {
                return 'sentry-vendor';
              }
              // Charts libraries can be dynamically split
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts-vendor';
              }
              // Keep other highly co-dependent core React & UI stuff together as 'vendor' to avoid WebKit evaluation loops
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true' ? { overlay: false } : false,
    },
  };
});
