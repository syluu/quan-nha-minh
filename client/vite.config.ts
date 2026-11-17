import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:2567' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
