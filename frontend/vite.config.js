import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/recipients': 'http://localhost:5000',
      '/documents': 'http://localhost:5000',
      '/leak-check': 'http://localhost:5000',
      '/ledger': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
})
