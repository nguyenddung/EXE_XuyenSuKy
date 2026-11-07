// After a dataset rebuild, points every journey source (data/journeys/*.json) at the chunk of the new dataset that
// holds its quote, and refreshes the pages. A quote whose wording changed with the new OCR (punctuation, a fixed
// typo) is replaced by the closest passage of the same lesson, so it stays a verbatim textbook excerpt.
// Usage: npm run remap:journeys            (writes the files and prints a report)
//        npm run remap:journeys -- --check (report only)
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadDataset, lessonId } from '../server/dataset.mjs'
import { defaultJourneyPath, quoteKey } from '../server/journeys.mjs'

const check = process.argv.includes('--check')
const minSimilarity = 0.82
const dataset = await loadDataset()

const bigrams = (text) => {
  const counts = new Map()
  for (let index = 0; index < text.length - 1; index++) { const pair = text.slice(index, index + 2); counts.set(pair, (counts.get(pair) || 0) + 1) }
  return counts
}
/** Dice coefficient over character bigrams of the normalised texts (1 = same text). */
function dice(a, b) {
  const x = bigrams(a)
  const y = bigrams(b)
  let shared = 0
  for (const [pair, count] of x) shared += Math.min(count, y.get(pair) || 0)
  return (2 * shared) / Math.max(1, a.length - 1 + b.length - 1)
}

/** Best passage of the chunk for the quote: a run of whole words of about the quote's length. */
function bestWindow(chunk, quote) {
  const words = chunk.text.split(/(\s+)/)
  const tokens = []
  for (let index = 0; index < words.length; index += 2) tokens.push(index)
  const target = quoteKey(quote)
  const size = target.split(' ').length
  let best = { score: 0 }
  for (let start = 0; start < tokens.length; start++) {
    for (let length = Math.max(1, size - 4); length <= size + 4 && start + length <= tokens.length; length++) {
      const text = words.slice(tokens[start], tokens[start + length - 1] + 1).join('')
      const score = dice(target, quoteKey(text))
      if (score > best.score) best = { score, text }
    }
  }
  return best
}

const stats = { exact: 0, fuzzy: 0, failed: 0 }
const failures = []
function remap(source, grade, where) {
  const lesson = lessonId({ grade, lesson_number: source.lesson_number })
  const scope = dataset.lessonChunks.get(lesson) || []
  const others = dataset.chunks.filter((chunk) => chunk.grade === grade && lessonId(chunk) !== lesson)
  const key = quoteKey(source.quote)
  let chunk = scope.find((item) => quoteKey(item.text).includes(key)) || others.find((item) => quoteKey(item.text).includes(key))
  let quote = source.quote
  if (chunk) stats.exact++
  else {
    const ranked = scope.map((item) => ({ chunk: item, ...bestWindow(item, source.quote) })).sort((a, b) => b.score - a.score)
    if (ranked[0]?.score >= minSimilarity) {
      chunk = ranked[0].chunk
      quote = ranked[0].text.trim()
      stats.fuzzy++
    } else {
      stats.failed++
      failures.push(`${where}: ${source.chunk_id} «${source.quote.slice(0, 90)}» (best ${ranked[0]?.score.toFixed(2)}: «${ranked[0]?.text?.slice(0, 90)}»)`)
      return null
    }
  }
  const before = source.quote
  Object.assign(source, { quote, chunk_id: chunk.chunk_id, lesson_number: chunk.lesson_number, pages: [chunk.page_start, chunk.page_end] })
  return before !== quote ? [before, quote] : null
}

function walk(value, grade, where, changed) {
  if (Array.isArray(value)) { value.forEach((item, index) => walk(item, grade, `${where}[${index}]`, changed)); return }
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value.sources) && value.sources.every((source) => source && typeof source.quote === 'string' && 'chunk_id' in source)) {
    for (const source of value.sources) {
      const change = remap(source, grade, `${where}${value.id ? ` ${value.id}` : ''}`)
      if (change) changed.set(change[0], change[1])
    }
  }
  for (const [key, item] of Object.entries(value)) if (key !== 'sources') walk(item, grade, `${where}.${key}`, changed)
}

// "source_quote" mirrors one of the sources' quotes; keep it identical when that quote was refreshed.
function syncSourceQuotes(value, changed) {
  if (Array.isArray(value)) { value.forEach((item) => syncSourceQuotes(item, changed)); return }
  if (!value || typeof value !== 'object') return
  if (typeof value.source_quote === 'string' && changed.has(value.source_quote)) value.source_quote = changed.get(value.source_quote)
  for (const item of Object.values(value)) syncSourceQuotes(item, changed)
}

for (const filename of (await readdir(defaultJourneyPath)).filter((name) => name.endsWith('.json')).sort()) {
  const path = resolve(defaultJourneyPath, filename)
  const original = await readFile(path, 'utf8')
  const journey = JSON.parse(original)
  const changed = new Map()
  walk(journey.stages, journey.grade, journey.id, changed)
  walk(journey.intro, journey.grade, `${journey.id}.intro`, changed)
  syncSourceQuotes(journey, changed)
  if (journey.build) journey.build.dataset_version = dataset.metadata.version
  // Keep the file's own layout (2-space JSON, with or without a final newline) so the diff shows only real changes.
  if (!check) await writeFile(path, JSON.stringify(journey, null, 2) + (/\n$/.test(original) ? '\n' : ''))
  console.log(`${filename}: ${changed.size} quotes refreshed`)
}
console.log(`Sources: ${stats.exact} exact, ${stats.fuzzy} refreshed from the new text, ${stats.failed} not found.`)
for (const failure of failures) console.log(`! ${failure}`)
if (failures.length) process.exitCode = 1
