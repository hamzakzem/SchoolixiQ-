import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true' ? { overlay: false } : false,
    },
  };
});
