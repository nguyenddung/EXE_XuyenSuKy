import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { defaultEnrichmentPath, expandQuery, loadEnrichment } from './enrichment.mjs'

export const defaultDatasetPath = fileURLToPath(new URL('../data/history/', import.meta.url))
export const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
export const lessonId = (lesson) => `LS${lesson.grade}_B${String(lesson.lesson_number).padStart(2, '0')}`
/** Teacher's book (SGV) part: GV7_B11 is the guide for grade 7 lesson 11 of the teacher's book, GV7_B00 its general part. */
export const guideId = (guide) => `GV${guide.grade}_B${String(guide.lesson_number).padStart(2, '0')}`
const knowledgeTypes = new Set(['body', 'source', 'did_you_know', 'caption', 'figure'])

export class DatasetError extends Error {}

export async function loadDataset(root = process.env.DATASET_PATH || defaultDatasetPath, enrichmentRoot = defaultEnrichmentPath) {
  const filenames = ['manifest.json', 'lessons/lessons_all.json', 'chunks/chunks_all.jsonl', 'lessons/teacher_guides.json', 'chunks/teacher_chunks.jsonl', 'schema/lesson.schema.json', 'schema/chunk.schema.json']
  const checksums = new Map((await readFile(resolve(root, 'SHA256SUMS.txt'), 'utf8')).trim().split(/\r?\n/).map((line) => {
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/)
    if (!match) throw new DatasetError('Invalid checksum manifest')
    return [match[2], match[1]]
  }))
  const files = Object.fromEntries(await Promise.all(filenames.map(async (filename) => {
    const bytes = await readFile(resolve(root, filename))
    if (createHash('sha256').update(bytes).digest('hex') !== checksums.get(filename)) throw new DatasetError(`Checksum mismatch: ${filename}`)
    return [filename, bytes.toString('utf8')]
  })))
  const manifest = JSON.parse(files['manifest.json'])
  const lessons = JSON.parse(files['lessons/lessons_all.json'])
  const jsonLines = (text) => text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line))
  const chunks = jsonLines(files['chunks/chunks_all.jsonl'])
  const guides = JSON.parse(files['lessons/teacher_guides.json'])
  const teacherChunks = jsonLines(files['chunks/teacher_chunks.jsonl'])
  const ajv = new Ajv2020({ strictTuples: false })
  const validateLesson = ajv.compile(JSON.parse(files['schema/lesson.schema.json']))
  const validateChunk = ajv.compile(JSON.parse(files['schema/chunk.schema.json']))
  if (!Array.isArray(lessons) || !lessons.length) throw new DatasetError('Empty lesson dataset')
  const byId = new Map()
  const chunksById = new Map()
  const lessonChunks = new Map()
  for (const lesson of lessons) {
    if (!validateLesson(lesson) || lesson.book_type !== 'sgk' || lesson.page_end < lesson.page_start) throw new DatasetError('Invalid lesson schema')
    const id = lessonId(lesson)
    if (byId.has(id)) throw new DatasetError(`Duplicate lesson ID: ${id}`)
    byId.set(id, lesson)
    lessonChunks.set(id, [])
  }
  for (const chunk of chunks) {
    if (!validateChunk(chunk) || chunk.book_type !== 'sgk' || !chunk.chunk_id.startsWith('LS') || chunk.page_end < chunk.page_start) throw new DatasetError('Invalid chunk schema')
    if (chunksById.has(chunk.chunk_id)) throw new DatasetError(`Duplicate chunk ID: ${chunk.chunk_id}`)
    const lesson = byId.get(lessonId(chunk))
    if (!lesson || !lesson.sections[chunk.section_index] || chunk.source_pdf !== lesson.source_pdf || chunk.page_start < lesson.page_start || chunk.page_end > lesson.page_end) throw new DatasetError(`Invalid chunk reference: ${chunk.chunk_id}`)
    chunksById.set(chunk.chunk_id, chunk)
    lessonChunks.get(lessonId(chunk)).push(chunk)
  }
  const guideById = new Map()
  const guideChunks = new Map()
  const guideByLesson = new Map()
  for (const guide of guides) {
    if (!validateLesson(guide) || guide.book_type !== 'sgv' || guide.page_end < guide.page_start) throw new DatasetError('Invalid teacher guide schema')
    const id = guideId(guide)
    if (guideById.has(id)) throw new DatasetError(`Duplicate teacher guide ID: ${id}`)
    if (guide.linked_lesson_id && (!byId.has(guide.linked_lesson_id) || guideByLesson.has(guide.linked_lesson_id))) throw new DatasetError(`Invalid lesson link: ${id}`)
    guideById.set(id, guide)
    guideChunks.set(id, [])
    if (guide.linked_lesson_id) guideByLesson.set(guide.linked_lesson_id, id)
  }
  for (const chunk of teacherChunks) {
    if (!validateChunk(chunk) || chunk.book_type !== 'sgv' || !chunk.chunk_id.startsWith('GV') || chunk.page_end < chunk.page_start) throw new DatasetError('Invalid teacher chunk schema')
    if (chunksById.has(chunk.chunk_id)) throw new DatasetError(`Duplicate chunk ID: ${chunk.chunk_id}`)
    const guide = guideById.get(guideId(chunk))
    if (!guide || !guide.sections[chunk.section_index] || chunk.source_pdf !== guide.source_pdf || chunk.page_start < guide.page_start || chunk.page_end > guide.page_end) throw new DatasetError(`Invalid chunk reference: ${chunk.chunk_id}`)
    chunksById.set(chunk.chunk_id, chunk)
    guideChunks.get(guideId(chunk)).push(chunk)
  }
  if (manifest.totals.lessons !== lessons.length || manifest.totals.chunks !== chunks.length || manifest.totals.teacher_guides !== guides.length || manifest.totals.teacher_chunks !== teacherChunks.length) throw new DatasetError('Dataset totals do not match manifest')
  guides.sort((a, b) => a.grade - b.grade || a.lesson_number - b.lesson_number)
  lessons.sort((a, b) => a.grade - b.grade || a.lesson_number - b.lesson_number)
  const source = (lesson) => {
    const chunk = lessonChunks.get(lessonId(lesson))[0]
    return { book: lesson.book, bookSeries: chunk?.book_series || manifest.sources.find((item) => item.grade === lesson.grade)?.book_series || '', publisher: chunk?.publisher || 'NXB Giáo dục Việt Nam', sourcePdf: lesson.source_pdf, pageStart: lesson.page_start, pageEnd: lesson.page_end, pageKind: 'pdf' }
  }
  const summaries = lessons.map((lesson) => {
    const reading = lessonChunks.get(lessonId(lesson)).filter((chunk) => knowledgeTypes.has(chunk.content_type))
    const content = lesson.sections.map((section) => section.content).join('\n')
    return { id: lessonId(lesson), grade: lesson.grade, number: lesson.lesson_number, title: lesson.lesson_title, chapter: lesson.chapter, excerpt: (reading[0]?.text || content).replace(/\s+/g, ' ').slice(0, 240), minutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 220)), sectionCount: lesson.sections.length, teacherGuideId: guideByLesson.get(lessonId(lesson)) || null, source: source(lesson) }
  })
  const guideSummaries = guides.map((guide) => ({ id: guideId(guide), grade: guide.grade, number: guide.lesson_number, title: guide.lesson_title, chapter: guide.chapter, lessonId: guide.linked_lesson_id, sectionCount: guide.sections.length, chunkCount: guideChunks.get(guideId(guide)).length,
    source: { book: guide.book, bookSeries: guideChunks.get(guideId(guide))[0]?.book_series || '', publisher: guideChunks.get(guideId(guide))[0]?.publisher || 'NXB Giáo dục Việt Nam', sourcePdf: guide.source_pdf, pageStart: guide.page_start, pageEnd: guide.page_end, pageKind: 'pdf' } }))
  const lessonSearch = new Map(lessons.map((lesson) => [lessonId(lesson), normalize(`${lesson.lesson_title} ${lesson.chapter} ${lesson.sections.map((section) => section.content).join(' ')}`)]))
  const searchableChunks = chunks.filter((chunk) => knowledgeTypes.has(chunk.content_type)).map((chunk) => ({ chunk, text: normalize(chunk.text), title: normalize(`${chunk.lesson_title} ${chunk.section_title}`) }))
  const metadata = {
    name: manifest.name, version: manifest.version, created: manifest.created,
    totals: { lessons: lessons.length, chunks: chunks.length, sections: lessons.reduce((count, lesson) => count + lesson.sections.length, 0), books: new Set(lessons.map((lesson) => lesson.source_pdf)).size, teacherGuides: guides.length, teacherChunks: teacherChunks.length },
    grades: [...new Set(lessons.map((lesson) => lesson.grade))].map((grade) => {
      const gradeLessons = summaries.filter((lesson) => lesson.grade === grade)
      const recommendation = gradeLessons.find((lesson) => lesson.number > 0) || gradeLessons[0]
      return { grade, lessonCount: gradeLessons.length, chunkCount: chunks.filter((chunk) => chunk.grade === grade).length, chapters: [...new Set(gradeLessons.map((lesson) => lesson.chapter))], book: recommendation.source.book, bookSeries: recommendation.source.bookSeries, recommendation }
    }),
    pageKind: 'pdf',
  }
  const { events, aliasIndex, timeline } = await loadEnrichment(new Set(byId.keys()), normalize, enrichmentRoot)
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]))
  return { manifest, metadata, lessons, chunks, byId, chunksById, lessonChunks, summaries, summaryById, lessonSearch, searchableChunks, source, events, aliasIndex, timeline, guides, guideById, guideChunks, guideSummaries }
}

let cached
export function getDataset() {
  if (!cached) cached = loadDataset().catch((error) => { cached = undefined; throw error })
  return cached
}

export function searchChunks(dataset, query, grade) {
  const phrase = normalize(query)
  if (!phrase) return []
  // Alternative names ("Quang Trung" / "Nguyễn Huệ", "Columbus" / "Cô-lôm-bô") widen the query; each chunk keeps its best variant.
  const variants = expandQuery(phrase, dataset.aliasIndex).map(({ query: variant, names }) => ({ phrase: variant, names, terms: [...new Set(variant.split(' ').filter(Boolean))] }))
  return dataset.searchableChunks.filter(({ chunk }) => !grade || chunk.grade === grade).map(({ chunk, text, title }) => {
    let score = 0
    for (const { phrase: wanted, names, terms } of variants) {
      if (!names.every((name) => text.includes(name) || title.includes(name))) continue
      const matches = terms.filter((term) => text.includes(term) || title.includes(term)).length
      // Require every query term; unrelated requests return no source instead of a guess.
      if (matches === terms.length) score = Math.max(score, matches + (text.includes(wanted) ? 8 : 0) + (title.includes(wanted) ? 5 : 0) + (chunk.open_flags === 0 ? 0.5 : 0))
    }
    return { chunk, score }
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.chunk.chunk_id.localeCompare(b.chunk.chunk_id))
}

export function chunkResponse(chunk, score) {
  return { id: chunk.chunk_id, lessonId: chunk.book_type === 'sgv' ? null : lessonId(chunk), ...(chunk.book_type === 'sgv' ? { guideId: guideId(chunk) } : {}), grade: chunk.grade, lessonTitle: chunk.lesson_title, sectionTitle: chunk.section_title, sectionIndex: chunk.section_index, contentType: chunk.content_type, bookType: chunk.book_type, text: chunk.text, openFlags: chunk.open_flags, textSource: chunk.text_source, ...(score === undefined ? {} : { score }), source: { book: chunk.book, bookSeries: chunk.book_series, publisher: chunk.publisher, sourcePdf: chunk.source_pdf, pageStart: chunk.page_start, pageEnd: chunk.page_end, pageKind: 'pdf' } }
}
