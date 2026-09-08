import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/predict-crop': 'http://127.0.0.1:5000',
      '/predict-disease': 'http://127.0.0.1:5000',
      '/predict': 'http://127.0.0.1:5000',
      '/weather': 'http://127.0.0.1:5000',
      '/sensor': 'http://127.0.0.1:5000',
      '/get_sensor': 'http://127.0.0.1:5000',
      '/api': 'http://127.0.0.1:5000',
    }
  }
})
