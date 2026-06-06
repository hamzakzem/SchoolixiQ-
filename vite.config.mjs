import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
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
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('firebase')) return 'firebase';
            if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion';
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('scheduler') ||
              /node_modules[\\/]react[\\/]/.test(id)
            ) {
              return 'react';
            }
            if (
              id.includes('jspdf') ||
              id.includes('html2canvas') ||
              id.includes('html-to-image')
            ) {
              return 'pdf';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true' ? { overlay: false } : false,
    },
  };
});
