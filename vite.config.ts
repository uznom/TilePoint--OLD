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
      allowedHosts: true as const,
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
      chunkSizeWarningLimit: 3000
    }
  };
});
