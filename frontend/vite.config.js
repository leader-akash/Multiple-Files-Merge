import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist', 'pdfjs-dist/build/pdf.worker'], // Pre-bundle pdfjs-dist and worker
  },
  build: {
    rollupOptions: {
      external: [], // Ensure pdfjs-dist is bundled
    },
  },
  worker: {
    format: 'es', // Use ES modules for workers
  },
});