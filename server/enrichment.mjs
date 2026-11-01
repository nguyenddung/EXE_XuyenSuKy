import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

// Team-written data that enriches the textbook dataset without copying it: historical events linked to lessons and
// alternative names (other names, original spellings, abbreviations) that widen search queries.
export const defaultEnrichmentPath = fileURLToPath(new URL('../data/enrichment/', import.meta.url))
export const MAX_QUERY_VARIANTS = 12

export class EnrichmentError extends Error {}

const read = async (root, name) => JSON.parse(await readFile(resolve(root, name), 'utf8'))

/** Loads and validates events.json and aliases.json. `lessonIds` holds the IDs of the loaded textbook dataset. */
export async function loadEnrichment(lessonIds, normalize, root = defaultEnrichmentPath) {
  const [events, aliases, eventSchema, aliasSchema] = await Promise.all(['events.json', 'aliases.json', 'schema/event.schema.json', 'schema/alias.schema.json'].map((name) => read(root, name)))
  const ajv = new Ajv2020()
  const validateEvent = ajv.compile(eventSchema)
  const validateAlias = ajv.compile(aliasSchema)
  if (!Array.isArray(events) || !Array.isArray(aliases)) throw new EnrichmentError('Enrichment files must be arrays')
  const eventIds = new Set()
  for (const event of events) {
    if (!validateEvent(event)) throw new EnrichmentError(`Invalid event: ${event?.id}`)
    if (eventIds.has(event.id)) throw new EnrichmentError(`Duplicate event ID: ${event.id}`)
    if (event.end_year !== undefined && event.end_year < event.year) throw new EnrichmentError(`Event ends before it starts: ${event.id}`)
    if (event.date && Number(event.date.slice(0, 4)) !== event.year && Number(event.date.slice(0, 4)) !== event.end_year) throw new EnrichmentError(`Event date outside its years: ${event.id}`)
    const missing = event.lesson_ids.find((id) => !lessonIds.has(id))
    if (missing) throw new EnrichmentError(`Event ${event.id} links unknown lesson ${missing}`)
    eventIds.add(event.id)
  }
  const aliasIds = new Set()
  const owner = new Map()
  for (const group of aliases) {
    if (!validateAlias(group)) throw new EnrichmentError(`Invalid alias group: ${group?.id}`)
    if (aliasIds.has(group.id)) throw new EnrichmentError(`Duplicate alias group ID: ${group.id}`)
    aliasIds.add(group.id)
    for (const term of group.terms) {
      const key = normalize(term)
      if (owner.has(key)) throw new EnrichmentError(`Alias "${term}" appears in ${owner.get(key)} and ${group.id}`)
      owner.set(key, group.id)
    }
  }
  const sorted = [...events].sort((a, b) => a.year - b.year || (a.end_year ?? a.year) - (b.end_year ?? b.year) || a.id.localeCompare(b.id))
  return { events: sorted, aliasIndex: buildAliasIndex(aliases, normalize) }
}

/** Normalised alias terms, longest first, each with every other spelling of its group. */
export function buildAliasIndex(aliases, normalize) {
  const index = []
  for (const group of aliases) {
    const terms = group.terms.map(normalize)
    for (const term of terms) index.push({ term, group: group.id, others: terms.filter((other) => other !== term) })
  }
  return index.sort((a, b) => b.term.length - a.term.length || a.term.localeCompare(b.term))
}

const boundary = (text, start, end) => (start === 0 || text[start - 1] === ' ') && (end === text.length || text[end] === ' ')

/**
 * Returns the normalised query first, then variants where each recognised name is replaced by another spelling,
 * e.g. "quang trung danh quan thanh" also searches "nguyen hue danh quan thanh". Longest names win and matches never overlap.
 * Each variant lists the names it swapped in (`names`): search requires them as whole phrases, so "nguyen hue"
 * does not match any passage that merely contains "nguyen" and "hue" (Huế) somewhere.
 */
export function expandQuery(normalizedQuery, aliasIndex = [], max = MAX_QUERY_VARIANTS) {
  const matches = []
  for (const entry of aliasIndex) {
    for (let start = normalizedQuery.indexOf(entry.term); start >= 0; start = normalizedQuery.indexOf(entry.term, start + 1)) {
      const end = start + entry.term.length
      if (boundary(normalizedQuery, start, end) && !matches.some((match) => start < match.end && end > match.start)) matches.push({ start, end, others: entry.others })
    }
  }
  matches.sort((a, b) => a.start - b.start)
  let variants = [{ query: '', names: [] }]
  let cursor = 0
  for (const match of matches) {
    const before = normalizedQuery.slice(cursor, match.start)
    const original = normalizedQuery.slice(match.start, match.end)
    variants = variants.flatMap(({ query, names }) => [
      { query: query + before + original, names },
      ...match.others.map((name) => ({ query: query + before + name, names: [...names, name] })),
    ]).slice(0, max)
    cursor = match.end
  }
  const tail = normalizedQuery.slice(cursor)
  return variants.map(({ query, names }) => ({ query: query + tail, names }))
}

export function eventResponse(event, summaries) {
  return {
    id: event.id, year: event.year, ...(event.end_year === undefined ? {} : { endYear: event.end_year }), ...(event.date ? { date: event.date } : {}),
    title: event.title, summary: event.summary, category: event.category, scope: event.scope, people: event.people, places: event.places,
    lessons: event.lesson_ids.map((id) => { const lesson = summaries.get(id); return { id, grade: lesson.grade, title: lesson.title } }),
  }
}
