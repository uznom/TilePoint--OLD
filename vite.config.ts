import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@heroui/react': path.resolve(__dirname, 'src/components/common/ui/heroui-adapter.tsx'),
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Ignore database files and temporary files to prevent server/Vite reloads during checkout writes
      watch: {
        ignored: [
          '**/server-db.json',
          '**/server-db.json.tmp',
          '**/server-db.json.bak',
          '**/backups/**'
        ]
      },
    },
    optimizeDeps: {
      include: ['react-router-dom', 'xlsx', 'papaparse']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@tanstack')) {
                return 'vendor-query';
              }
              if (id.includes('zod')) {
                return 'vendor-zod';
              }
              if (id.includes('papaparse')) {
                return 'vendor-papaparse';
              }
              if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
                return 'vendor-socket';
              }
              if (id.includes('bcryptjs')) {
                return 'vendor-auth';
              }
              if (id.includes('@fontsource')) {
                return 'vendor-fonts';
              }
              if (
                id.includes('/react/') ||
                id.includes('\\react\\') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('scheduler')
              ) {
                return 'vendor-react';
              }
              return 'vendor-libs';
            }
          },
        },
      },
    },
  };
});
