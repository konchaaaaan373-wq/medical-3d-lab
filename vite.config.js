import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // three.js is ~550 kB minified on its own; the default 500 kB warning is noise here.
    chunkSizeWarningLimit: 900,
  },
});
