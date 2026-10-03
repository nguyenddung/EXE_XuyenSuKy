import { chunkResponse, getDataset, lessonId, normalize, searchChunks } from './dataset.mjs'
import { characterIndex, characterReply, listCharacters } from './characters.mjs'
import { augmentCharacterReply } from './openai-rag.mjs'

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
function send(res, status, data, head, cache = true) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', status === 200 && cache ? 'public, max-age=60, s-maxage=300' : 'no-store')
  res.end(head ? undefined : JSON.stringify(data))
}
async function readChatBody(req) {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.')
  if (Number(req.headers['content-length']) > 16000) { req.resume(); throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Chat payload is too large.') }
  let body = req.body
  if (body === undefined) {
    const buffers = []
    let length = 0
    for await (const chunk of req) { length += chunk.length; if (length <= 16000) buffers.push(Buffer.from(chunk)) }
    if (length > 16000) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Chat payload is too large.')
    body = Buffer.concat(buffers).toString('utf8')
  }
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 16000) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Chat payload is too large.')
    try { body = JSON.parse(body) } catch { throw new HttpError(400, 'INVALID_BODY', 'Invalid JSON body.') }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000) throw new HttpError(400, 'INVALID_BODY', 'message must contain 1–1000 characters.')
  const history = body.history ?? []
  if (!Array.isArray(history) || history.length > 8 || history.some((turn) => !turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string' || turn.content.length > 2000)) throw new HttpError(400, 'INVALID_BODY', 'Invalid conversation history.')
  return { message: body.message.trim(), history }
}

export async function handleApi(req, res, datasetProvider = getDataset) {
  const head = req.method === 'HEAD'
  try {
    const url = new URL(req.url, 'http://localhost')
    const route = (url.searchParams.get('route') || url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '')
    const parts = route.split('/')
    const chat = parts[0] === 'characters' && parts.length === 3 && parts[2] === 'chat'
    if (chat ? req.method !== 'POST' : !['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', chat ? 'POST' : 'GET, HEAD')
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', chat ? 'Use POST for character chat.' : 'This dataset endpoint is read-only.')
    }
    if (!['health', 'metadata', 'lessons', 'search', 'chunks', 'characters'].includes(parts[0]) || parts.length > 3) throw new HttpError(404, 'NOT_FOUND', 'API endpoint not found.')
    const grade = integer(url.searchParams, 'grade', undefined, 6, 12)
    const query = url.searchParams.get('q') || ''
    if (query.length > 200) badRequest('q must have at most 200 characters.')
    const data = await datasetProvider()
    let result
    if (chat) {
      if (!characterIndex(data).some((entry) => entry.profile.id === parts[1])) throw new HttpError(404, 'CHARACTER_NOT_FOUND', 'Character not found in this dataset.')
      const body = await readChatBody(req)
      const entry = characterIndex(data).find((item) => item.profile.id === parts[1])
      const retrieved = characterReply(data, parts[1], body.message, body.history)
      result = await augmentCharacterReply(retrieved, entry.profile.name, body.message, body.history)
    }
    else if (route === 'characters') { const items = listCharacters(data, grade, query); result = { items, total: items.length, datasetVersion: data.metadata.version, mode: 'textbook' } }
    else if (parts[0] === 'characters' && parts.length === 2) {
      const entry = characterIndex(data).find((item) => item.profile.id === parts[1])
      if (!entry) throw new HttpError(404, 'CHARACTER_NOT_FOUND', 'Character not found in this dataset.')
      result = { ...entry.public, lessons: entry.lessons }
    }
    else if (route === 'health') result = { status: 'ok', datasetVersion: data.metadata.version, totals: data.metadata.totals }
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
    send(res, 200, result, head, !chat)
  } catch (error) {
    if (error instanceof HttpError) send(res, error.status, { error: { code: error.code, message: error.message } }, head)
    else {
      console.error('[dataset-api]', error.code || error.name, error.message)
      send(res, 503, { error: { code: 'DATASET_UNAVAILABLE', message: 'Dataset is unavailable or did not pass integrity validation.' } }, head)
    }
  }
}
