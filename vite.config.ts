import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Supabase client
          if (id.includes('@supabase')) return 'supabase'
          // React core
          if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor'
          // jspdf/html2canvas/pdfium/pdf-parse/mammoth NO se agrupan aquí a
          // propósito: solo se usan vía import() dinámico donde se necesitan,
          // y forzarlos a un manualChunk nombrado hace que el bundler los
          // trate como "vendor" y los precargue en index.html para toda la
          // app, anulando el lazy-load.
          // DOMPurify
          if (id.includes('dompurify')) return 'sanitize'
        },
      },
    },
  },
})
