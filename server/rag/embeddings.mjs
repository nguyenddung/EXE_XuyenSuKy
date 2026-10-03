import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const embeddingModel = 'text-embedding-3-small'
export const embeddingDimensions = 512
export const defaultIndexPath = fileURLToPath(new URL('../../data/embeddings/', import.meta.url))

// Grade, lesson and section titles give short chunks enough context to land near the right questions.
export const embeddingText = (chunk) => `Lịch sử lớp ${chunk.grade} · ${chunk.lesson_title} · ${chunk.section_title}\n${chunk.text}`

const unit = (values) => {
  let norm = 0
  for (const value of values) norm += value * value
  norm = Math.sqrt(norm) || 1
  return Float32Array.from(values, (value) => value / norm)
}

/** int8 storage: cosine similarity ignores each vector's scale, so rows are re-normalised after loading. */
export function quantize(vector) {
  let max = 0
  for (const value of vector) max = Math.max(max, Math.abs(value))
  return Int8Array.from(vector, (value) => Math.round(value / (max || 1) * 127))
}

/**
 * Loads the prebuilt index (scripts/build-embeddings.mjs). Returns null when it is missing or was built from
 * different chunks, so chat keeps working on keyword retrieval alone.
 */
export async function loadEmbeddingIndex(dataset, root = defaultIndexPath) {
  try {
    const meta = JSON.parse(await readFile(resolve(root, 'meta.json'), 'utf8'))
    const bytes = await readFile(resolve(root, 'vectors.bin'))
    const { dimensions, ids } = meta
    if (meta.model !== embeddingModel || dimensions !== embeddingDimensions || meta.datasetVersion !== dataset.metadata.version) throw new Error('index was built for another model or dataset version')
    if (bytes.length !== ids.length * dimensions || ids.some((id) => !dataset.chunksById.has(id))) throw new Error('index does not match the dataset chunks')
    const raw = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length)
    const vectors = new Float32Array(raw.length)
    for (let row = 0; row < ids.length; row++) vectors.set(unit(raw.subarray(row * dimensions, (row + 1) * dimensions)), row * dimensions)
    return { model: meta.model, dimensions, ids, rows: new Map(ids.map((id, row) => [id, row])), vectors }
  } catch (error) {
    console.warn('[character-rag] Embedding index unavailable, using keyword retrieval only:', error.code || error.message)
    return null
  }
}

export async function embedQuery(openai, text) {
  const response = await openai.embeddings.create({ model: embeddingModel, input: text.slice(0, 2000), dimensions: embeddingDimensions })
  return unit(response.data[0].embedding)
}

/** Cosine similarity against the chunks in scope (all indexed chunks when scope is omitted). */
export function vectorSearch(index, query, scope, limit = 8) {
  const { dimensions, vectors, rows } = index
  const candidates = scope ? [...scope].filter((id) => rows.has(id)) : index.ids
  return candidates.map((id) => {
    const offset = rows.get(id) * dimensions
    let score = 0
    for (let i = 0; i < dimensions; i++) score += vectors[offset + i] * query[i]
    return { id, score }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}
