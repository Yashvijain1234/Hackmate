import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy API + websocket traffic to the Express backend during development,
// so the SPA can use same-origin relative URLs (no CORS headaches).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
