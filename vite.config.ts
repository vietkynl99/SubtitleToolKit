import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/SubtitleToolKit/',

  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'icons-vendor': ['lucide-react'],
          'charts-vendor': ['recharts'],
          'ai-vendor': ['@google/genai']
        }
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
