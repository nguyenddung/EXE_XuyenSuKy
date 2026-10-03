import { chunkResponse, getDataset, lessonId, normalize, searchChunks } from './dataset.mjs'

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}
const badRequest = (message) => { throw new HttpError(400, 'INVALID_QUERY', message) }
function integer(params, key, fallback, min, max) {
  const text = params.get(key)
  if (text === null) return fallback
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) < min || Number(text) > max) badRequest(`${key} must be an integer between ${min} and ${max}.`)
  return Number(text)
}
function pagination(params, values) {
  const page = integer(params, 'page', 1, 1, 10000)
  const limit = integer(params, 'limit', 12, 1, 50)
  return { items: values.slice((page - 1) * limit, page * limit), total: values.length, page, limit, pages: Math.ceil(values.length / limit) }
}
function ids(params, key) {
  if (!params.has(key)) return undefined
  const text = params.get(key)
  if (text.length > 5000) badRequest(`${key} is too long.`)
  const values = text ? text.split(',') : []
  if (values.some((id) => !/^LS\d{1,2}_B\d{2}$/.test(id))) badRequest(`${key} contains an invalid lesson ID.`)
  return new Set(values)
}
function send(res, status, data, head) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=60, s-maxage=300' : 'no-store')
  res.end(head ? undefined : JSON.stringify(data))
}

export async function handleApi(req, res, datasetProvider = getDataset) {
  const head = req.method === 'HEAD'
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD')
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'This dataset API is read-only.')
    }
    const url = new URL(req.url, 'http://localhost')
    const route = (url.searchParams.get('route') || url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '')
    const parts = route.split('/')
    if (!['health', 'metadata', 'lessons', 'search', 'chunks'].includes(parts[0]) || parts.length > 3) throw new HttpError(404, 'NOT_FOUND', 'API endpoint not found.')
    const grade = integer(url.searchParams, 'grade', undefined, 6, 12)
    const query = url.searchParams.get('q') || ''
    if (query.length > 200) badRequest('q must have at most 200 characters.')
    const data = await datasetProvider()
    let result
    if (route === 'health') result = { status: 'ok', datasetVersion: data.metadata.version, totals: data.metadata.totals }
    else if (route === 'metadata') result = data.metadata
    else if (route === 'lessons') {
      const q = normalize(query)
      const chapter = url.searchParams.get('chapter')
      if (chapter && chapter.length > 250) badRequest('chapter must have at most 250 characters.')
      const terms = q.split(' ').filter(Boolean)
      const included = ids(url.searchParams, 'ids')
      const excluded = ids(url.searchParams, 'excludeIds')
      result = pagination(url.searchParams, data.summaries.filter((lesson) => (!grade || lesson.grade === grade) && (!chapter || lesson.chapter === chapter) && (!included || included.has(lesson.id)) && !excluded?.has(lesson.id) && terms.every((term) => data.lessonSearch.get(lesson.id).includes(term))))
    } else if (parts[0] === 'lessons' && /^LS\d{1,2}_B\d{2}$/.test(parts[1] || '')) {
      const lesson = data.byId.get(parts[1])
      if (!lesson) throw new HttpError(404, 'LESSON_NOT_FOUND', 'Lesson not found.')
      if (parts.length === 2) result = { ...data.summaries.find((item) => item.id === lessonId(lesson)), sections: lesson.sections.map((section) => ({ title: section.title, content: section.content, pageStart: section.page_start, pageEnd: section.page_end })) }
      else if (parts[2] === 'chunks') {
        const type = url.searchParams.get('type')
        if (type && !['body', 'source', 'did_you_know', 'question', 'exercise', 'objectives', 'intro', 'caption'].includes(type)) badRequest('Unknown chunk content type.')
        result = pagination(url.searchParams, data.lessonChunks.get(parts[1]).filter((chunk) => !type || chunk.content_type === type).map((chunk) => chunkResponse(chunk)))
      }
    } else if (route === 'search') {
      if (normalize(query).length < 2) badRequest('Enter a query of at least two characters.')
      result = pagination(url.searchParams, searchChunks(data, query, grade).map(({ chunk, score }) => chunkResponse(chunk, score)))
    } else if (parts[0] === 'chunks' && parts.length === 2) {
      const chunk = data.chunksById.get(parts[1])
      if (!chunk) throw new HttpError(404, 'CHUNK_NOT_FOUND', 'Chunk not found.')
      result = chunkResponse(chunk)
    }
    if (!result) throw new HttpError(404, 'NOT_FOUND', 'API endpoint not found.')
    send(res, 200, result, head)
  } catch (error) {
    if (error instanceof HttpError) send(res, error.status, { error: { code: error.code, message: error.message } }, head)
    else {
      console.error('[dataset-api]', error.code || error.name, error.message)
      send(res, 503, { error: { code: 'DATASET_UNAVAILABLE', message: 'Dataset is unavailable or did not pass integrity validation.' } }, head)
    }
  }
}
