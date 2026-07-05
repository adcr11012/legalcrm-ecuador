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
          // PDF / document processing (heavy)
          if (id.includes('html2canvas') || id.includes('jspdf')) return 'pdf-export'
          if (id.includes('pdfium') || id.includes('pdf-parse') || id.includes('mammoth')) return 'doc-reader'
          // DOMPurify
          if (id.includes('dompurify')) return 'sanitize'
        },
      },
    },
  },
})
