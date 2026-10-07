import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'client/public',
  resolve: { alias: { '@': path.resolve(__dirname, 'client/src') } },
  server: { host: '127.0.0.1', port: 4176, strictPort: true, watch: { usePolling: true, interval: 300 } },
  build: { outDir: 'preview-dist', rollupOptions: { input: path.resolve(__dirname, 'index.html') } },
});
