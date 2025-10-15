import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6001,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:6005',
        changeOrigin: true,
        ws: true
      },
      '/api': {
        target: 'http://localhost:6005',
        changeOrigin: true
      }
    }
  }
})
