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
              if (id.includes('firebase')) {
                return 'firebase-vendor';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler') || id.includes('react-is')) {
                return 'react-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts-vendor';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
                return 'pdf-vendor';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'motion-vendor';
              }
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
