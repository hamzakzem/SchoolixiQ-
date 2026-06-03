import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.APP_URL': JSON.stringify(env.APP_URL || env.VITE_APP_URL || ''),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('firebase')) return 'firebase-vendor';
            if (id.includes('@sentry')) return 'sentry-vendor';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
              return 'pdf-vendor';
            }
            if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
            if (id.includes('motion') || id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            return 'vendor';
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true' ? { overlay: false } : false,
    },
  };
});
