import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('react-dom') || id.includes('react-router')) return 'react';
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
})
