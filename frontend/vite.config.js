import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/login': 'http://localhost:5000',
      '/github': 'http://localhost:5000',
      '/analyze': 'http://localhost:5000',
      '/run-tests': 'http://localhost:5000',
      '/agent-run': 'http://localhost:5000',
      '/upload-project': 'http://localhost:5000',
      '/load-repo': 'http://localhost:5000',
      '/prompts': 'http://localhost:5000',
    }
  }
})
