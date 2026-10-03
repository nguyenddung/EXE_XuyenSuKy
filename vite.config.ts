import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleApi } from './server/handler.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.DATASET_PATH && !process.env.DATASET_PATH) process.env.DATASET_PATH = env.DATASET_PATH
  return { plugins: [react(), {
    name: 'history-backend',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api' || req.url?.startsWith('/api/')) void handleApi(req, res)
        else next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api' || req.url?.startsWith('/api/')) void handleApi(req, res)
        else next()
      })
    },
  }] }
})
