import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8788',
      '/sitemap.xml': 'http://localhost:8788',
      '/robots.txt': 'http://localhost:8788'
    }
  },
  build: {
    target: 'es2022',
    sourcemap: false
  }
});
