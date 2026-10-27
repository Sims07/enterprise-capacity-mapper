import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        app: resolve(process.cwd(), 'index.html'),
        sw: resolve(process.cwd(), 'src/sw.ts'),
      },
      output: {
        entryFileNames: chunk => chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.app.github.dev'],
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
  },
});
