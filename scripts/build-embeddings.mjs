// Builds data/embeddings/ from the knowledge chunks (body, source, did_you_know, caption).
// Run after the dataset changes: npm run build:embeddings (needs OPENAI_API_KEY in .env.local).
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import OpenAI from 'openai'
import { loadDataset } from '../server/dataset.mjs'
import { defaultIndexPath, embeddingDimensions, embeddingModel, embeddingText, quantize } from '../server/rag/embeddings.mjs'

if (!process.env.OPENAI_API_KEY?.trim()) { console.error('OPENAI_API_KEY is required (add it to .env.local).'); process.exit(1) }
const dataset = await loadDataset()
const chunks = dataset.searchableChunks.map(({ chunk }) => chunk)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })
const vectors = new Int8Array(chunks.length * embeddingDimensions)
let tokens = 0
for (let start = 0; start < chunks.length; start += 100) {
  const batch = chunks.slice(start, start + 100)
  const response = await openai.embeddings.create({ model: embeddingModel, dimensions: embeddingDimensions, input: batch.map(embeddingText) })
  response.data.forEach(({ embedding }, offset) => vectors.set(quantize(embedding), (start + offset) * embeddingDimensions))
  tokens += response.usage?.total_tokens || 0
  console.log(`Embedded ${Math.min(start + 100, chunks.length)}/${chunks.length}`)
}
await mkdir(defaultIndexPath, { recursive: true })
await writeFile(resolve(defaultIndexPath, 'vectors.bin'), vectors)
await writeFile(resolve(defaultIndexPath, 'meta.json'), JSON.stringify({ model: embeddingModel, dimensions: embeddingDimensions, quantization: 'int8', datasetVersion: dataset.metadata.version, created: new Date().toISOString(), ids: chunks.map((chunk) => chunk.chunk_id) }) + '\n')
console.log(`Done: ${chunks.length} chunks, ${tokens} tokens.`)
