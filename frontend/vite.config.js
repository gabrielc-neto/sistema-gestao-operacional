// v3
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Libera qualquer subdomínio do Cloudflare Quick Tunnel (muda a cada reinício).
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
    proxy: {
      // Encaminha as chamadas das Cloud Functions pro emulator local.
      // Permite que o Rastreamento (dados SASCAR) funcione via Cloudflare Tunnel,
      // já que o emulator (5001) não é exposto e o front roteia pela mesma origem.
      '/pontual-logistica': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        headers: { connection: 'close' },
      },
      // API da intranet (PHP + PostgreSQL, na VPS). Em produção a SPA e a API
      // são servidas pelo mesmo host, então isto vale só para o dev local —
      // sem o proxy, seria requisição cross-origin e o navegador barraria.
      // Aponta para o ambiente de HOMOLOGAÇÃO: mexer no painel em dev altera
      // os dados de lá.
      '/intranet-api': {
        target: 'https://web-homol.pontualpetroleo.com.br',
        changeOrigin: true,
        secure: true,
      },
    },
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
