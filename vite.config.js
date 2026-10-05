import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': {
        target: loadEnv(mode, process.cwd(), '').BACKEND_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '^/api/diagnostic$': {
        target: 'https://osc-sch.app.n8n.cloud',
        changeOrigin: true,
        rewrite: () => '/webhook-test/crear_actividades',
      },
      '^/api/test-correction$': {
        target: 'https://osc-sch.app.n8n.cloud',
        changeOrigin: true,
        rewrite: () => '/webhook-test/corregir_test',
      },
    },
  },
}))
