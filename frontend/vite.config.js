import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(),  tailwindcss(),],
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