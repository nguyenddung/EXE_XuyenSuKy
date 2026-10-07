import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleApi } from './server/handler.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['DATASET_PATH', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION', 'SPEECH_RATE_PER_MINUTE', 'SPEECH_REQUESTS_PER_DAY', 'SPEECH_GLOBAL_REQUESTS_PER_DAY']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
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
