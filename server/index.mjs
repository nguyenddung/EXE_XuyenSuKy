import { createServer } from 'node:http'
import { handleApi } from './handler.mjs'
import { getDataset } from './dataset.mjs'

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3001)
await getDataset()
createServer((req, res) => {
  if (req.url === '/api' || req.url?.startsWith('/api/')) return handleApi(req, res)
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Use /api/health to check this server.' } }))
}).listen(port, host, () => console.log(`History backend: http://${host}:${port}/api/health`))
