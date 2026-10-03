import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { defaultDatasetPath, loadDataset, normalize } from '../server/dataset.mjs'
import { handleApi } from '../server/handler.mjs'
import { characterIndex, characterReply } from '../server/characters.mjs'
import { augmentCharacterReply } from '../server/openai-rag.mjs'

let dataset, server, base
before(async () => {
  dataset = await loadDataset()
  server = createServer((req, res) => handleApi(req, res, async () => dataset))
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${server.address().port}/api/`
})
after(async () => { await new Promise((done) => server.close(done)) })
const get = async (path) => { const response = await fetch(`${base}${path}`); return { response, body: await response.json() } }
const chat = async (id, body) => {
  const response = await fetch(`${base}characters/${id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { response, body: await response.json() }
}

test('12 character profiles have real references, aliases, grade filters and lesson links', async () => {
  const { body } = await get('characters')
  assert.equal(body.total, 12)
  for (const profile of body.items) {
    assert.ok(profile.lessonCount > 0 && profile.chunkCount > 0)
    assert.ok(profile.grades.every((grade) => grade >= 6 && grade <= 12))
    const detail = (await get(`characters/${profile.id}`)).body
    assert.equal(detail.lessons.length, profile.lessonCount)
    assert.ok(detail.lessons.every((lesson) => dataset.byId.has(lesson.id)))
    assert.ok(profile.aliases.includes(profile.name))
  }
  assert.equal((await get('characters?q=ly%20thai%20to')).body.items[0].id, 'ly-cong-uan')
  assert.ok((await get('characters?grade=6')).body.items.every((profile) => profile.grades.includes(6)))
  assert.equal((await get('characters?grade=13')).response.status, 400)
  assert.equal((await get('characters/unknown')).response.status, 404)
})

test('popular character questions retrieve correct dates and distinguish the two Bach Dang battles', () => {
  const expectations = ['1288', '1075', '1789', 'nam 40', '938', '1010', '1418', 'lanh dao', '1911', '1954', 'truc lam', '248']
  characterIndex(dataset).forEach(({ profile }, index) => {
    const reply = characterReply(dataset, profile.id, profile.suggestions[0])
    assert.equal(reply.kind, 'grounded', profile.id)
    assert.ok(normalize(reply.sources[0].quote).includes(expectations[index]), `${profile.id}: ${reply.sources[0].quote}`)
    if (profile.id === 'tran-hung-dao') assert.ok(!reply.sources[0].quote.includes('938'))
    if (profile.id === 'ngo-quyen') assert.ok(!reply.sources[0].quote.includes('1288'))
  })
})

test('every suggested question cites an exact source passage and the original PDF page', () => {
  for (const { profile } of characterIndex(dataset)) {
    for (const question of profile.suggestions) {
      const reply = characterReply(dataset, profile.id, question)
      assert.equal(reply.kind, 'grounded', `${profile.id}: ${question}`)
      assert.ok(reply.sources.length > 0)
      for (const source of reply.sources) {
        const original = dataset.chunksById.get(source.id)
        assert.ok(original.text.includes(source.quote.replace(/…$/, '')), source.id)
        assert.equal(source.source.pageStart, original.page_start)
        assert.ok(dataset.byId.has(source.lessonId))
        assert.ok(!['question', 'exercise', 'objectives', 'intro'].includes(source.contentType))
      }
    }
  }
})

test('RAG sends only retrieved textbook evidence and keeps the source when OpenAI fails', async () => {
  const originalKey = process.env.OPENAI_API_KEY
  const question = 'Ngô Quyền thắng trận Bạch Đằng năm nào?'
  const retrieved = characterReply(dataset, 'ngo-quyen', question)
  let request
  const client = { responses: { create: async (body) => { request = body; return { output_text: 'Ngô Quyền chiến thắng trên sông Bạch Đằng năm 938 [1].' } } } }
  try {
    delete process.env.OPENAI_API_KEY
    assert.equal((await augmentCharacterReply(retrieved, 'Ngô Quyền', question, [], client)).mode, 'textbook')
    process.env.OPENAI_API_KEY = 'test-key-never-sent'
    const reply = await augmentCharacterReply(retrieved, 'Ngô Quyền', question, [], client)
    assert.equal(reply.mode, 'rag')
    assert.deepEqual(reply.sources, retrieved.sources)
    assert.equal(request.store, false)
    assert.ok(request.input.includes(retrieved.sources[0].quote))
    assert.ok(!request.input.includes('test-key-never-sent'))
    assert.equal((await augmentCharacterReply(retrieved, 'Ngô Quyền', question, [], { responses: { create: async () => ({ output_text: 'Không có nguồn.' }) } })).mode, 'textbook')
    assert.equal((await augmentCharacterReply(retrieved, 'Ngô Quyền', question, [], { responses: { create: async () => { throw new Error('mock offline') } } })).mode, 'textbook')
    const unknown = characterReply(dataset, 'ngo-quyen', 'Hôm nay thời tiết thế nào?')
    assert.equal((await augmentCharacterReply(unknown, 'Ngô Quyền', question, [], client)).kind, 'not_found')
  } finally {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  }
})

test('follow-up uses the prior topic; unknown facts and out-of-scope questions do not invent answers', async () => {
  const first = (await chat('ly-cong-uan', { message: 'Lý Công Uẩn dời đô năm nào?' })).body
  const followup = (await chat('ly-cong-uan', { message: 'Vì sao?', history: [{ role: 'user', content: 'Lý Công Uẩn dời đô năm nào?' }, { role: 'assistant', content: first.answer }] })).body
  assert.equal(followup.kind, 'grounded')
  assert.match(followup.answer, /rồng cuộn hổ ngồi/)
  assert.notEqual(first.answer, followup.answer)
  for (const question of ['Hôm nay thời tiết thế nào?', 'Bạn thích ăn pizza không?', '2 + 2 bằng mấy?', 'Ngô Quyền thắng Bạch Đằng năm 2026?', 'Vì sao?']) {
    const reply = characterReply(dataset, 'ngo-quyen', question)
    assert.equal(reply.kind, 'not_found', question)
    assert.deepEqual(reply.sources, [])
  }
  assert.equal(characterReply(dataset, 'ngo-quyen', 'Xin chào').kind, 'greeting')
})

test('chat HTTP validation, payload bounds and cache policy work in direct and Vercel routes', async () => {
  const valid = await chat('ngo-quyen', { message: 'Bạch Đằng diễn ra năm nào?' })
  assert.equal(valid.response.status, 200)
  assert.equal(valid.response.headers.get('cache-control'), 'no-store')
  const rewrite = await fetch(`${base}dataset?route=characters/ngo-quyen/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Bạch Đằng diễn ra năm nào?' }) })
  assert.deepEqual(await rewrite.json(), valid.body)
  for (const body of [{}, { message: '' }, { message: 'x'.repeat(1001) }, { message: 'x', history: [{ role: 'system', content: 'x' }] }, { message: 'x', history: Array(9).fill({ role: 'user', content: 'x' }) }, { message: 'x', history: [{ role: 'user', content: 'x'.repeat(2001) }] }]) assert.equal((await chat('ngo-quyen', body)).response.status, 400)
  assert.equal((await chat('missing', { message: 'x' })).response.status, 404)
  assert.equal((await get('characters/ngo-quyen/chat')).response.status, 405)
  for (const [headers, body, expected] of [[{}, 'hello', 415], [{ 'Content-Type': 'application/json' }, '{bad', 400], [{ 'Content-Type': 'application/json' }, JSON.stringify({ message: 'x'.repeat(17000) }), 413]]) {
    const response = await fetch(`${base}characters/ngo-quyen/chat`, { method: 'POST', headers, body })
    assert.equal(response.status, expected)
  }
})

test('real dataset passes integrity, schema, totals and grade references', () => {
  assert.equal(dataset.metadata.totals.lessons, 130)
  assert.equal(dataset.metadata.totals.chunks, 2708)
  assert.equal(dataset.metadata.totals.sections, 752)
  assert.deepEqual(dataset.metadata.grades.map((item) => item.grade), [6, 7, 8, 9, 10, 11, 12])
  assert.equal(dataset.byId.size, dataset.metadata.totals.lessons)
})
test('metadata and paginated lesson list omit full lesson text', async () => {
  const { body } = await get('lessons?grade=12&limit=4&page=2')
  assert.equal(body.total, 17)
  assert.equal(body.items.length, 4)
  assert.ok(body.items.every((item) => item.grade === 12 && !item.sections))
  assert.equal(body.items[0].source.pageKind, 'pdf')
})
test('lesson reader keeps sections and original book citation', async () => {
  const { response, body } = await get('lessons/LS7_B01')
  assert.equal(response.status, 200)
  assert.ok(body.sections.length > 1)
  assert.equal(body.source.bookSeries, 'Chân trời sáng tạo')
  assert.equal(body.source.publisher, 'NXB Giáo dục Việt Nam')
  assert.ok(body.sections.every((section) => section.content && section.pageStart >= body.source.pageStart))
})
test('accent insensitive search excludes exercises and cites the exact chunk page', async () => {
  const accented = (await get('search?q=B%E1%BA%A1ch%20%C4%90%E1%BA%B1ng&limit=5')).body
  const plain = (await get('search?q=bach%20dang&limit=5')).body
  assert.ok(plain.total > 0)
  assert.deepEqual(plain, accented)
  for (const hit of plain.items) {
    assert.ok(['body', 'source', 'did_you_know', 'caption'].includes(hit.contentType))
    const original = dataset.chunksById.get(hit.id)
    assert.equal(hit.source.pageStart, original.page_start)
    assert.equal(hit.text, original.text)
  }
  assert.equal((await get('search?q=zzzkhongcotrongdataset')).body.total, 0)
})
test('lesson search, chapter, saved and unread filters run on the backend', async () => {
  const found = (await get('lessons?q=bach%20dang&grade=7')).body
  assert.ok(found.total > 0)
  const chapter = dataset.byId.get('LS7_B01').chapter
  assert.ok((await get(`lessons?grade=7&chapter=${encodeURIComponent(chapter)}`)).body.items.every((item) => item.chapter === chapter))
  assert.deepEqual((await get('lessons?ids=LS7_B01,LS12_B01')).body.items.map((item) => item.id), ['LS7_B01', 'LS12_B01'])
  assert.equal((await get('lessons?ids=')).body.total, 0)
  assert.equal((await get('lessons?excludeIds=LS7_B01')).body.total, 129)
})
test('chunk detail and content type filters preserve stable IDs', async () => {
  const { body } = await get('lessons/LS7_B01/chunks?type=body')
  assert.ok(body.items.length > 0)
  assert.ok(body.items.every((item) => item.contentType === 'body' && item.lessonId === 'LS7_B01'))
  const hit = (await get(`chunks/${body.items[0].id}`)).body
  assert.equal(hit.id, body.items[0].id)
  assert.equal(normalize(hit.text), normalize(body.items[0].text))
})
test('invalid filters and missing records return typed 400/404 responses', async () => {
  for (const path of ['lessons?grade=13', 'lessons?page=0', 'lessons?limit=999', 'lessons?grade=7x', 'search?q=x', 'lessons?ids=../../secret', 'lessons/LS7_B01/chunks?type=unknown']) assert.equal((await get(path)).response.status, 400, path)
  for (const path of ['lessons/LS7_B99', 'chunks/unknown', 'unknown', 'lessons/LS7_B01/private', '../data/history/manifest.json']) assert.equal((await get(path)).response.status, 404, path)
})
test('API supports HEAD and rejects writes; Vercel rewrite selects the same handler', async () => {
  const head = await fetch(`${base}health`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.equal((await fetch(`${base}lessons`, { method: 'POST' })).status, 405)
  assert.equal((await get('dataset?route=lessons/LS7_B01')).body.id, 'LS7_B01')
})
test('unavailable dataset returns 503 without leaking filesystem paths', async () => {
  const unavailable = createServer((req, res) => handleApi(req, res, async () => { throw new Error('Private filesystem path') }))
  await new Promise((done) => unavailable.listen(0, '127.0.0.1', done))
  try {
    const response = await fetch(`http://127.0.0.1:${unavailable.address().port}/api/health`)
    const body = await response.json()
    assert.equal(response.status, 503)
    assert.equal(body.error.code, 'DATASET_UNAVAILABLE')
    assert.ok(!JSON.stringify(body).includes('Private filesystem'))
  } finally { await new Promise((done) => unavailable.close(done)) }
})
test('importer refuses changed bytes and orphan chunks even with updated checksums', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'xuyensuky-dataset-test-'))
  try {
    await cp(defaultDatasetPath, root, { recursive: true })
    const path = resolve(root, 'chunks/chunks_all.jsonl')
    const text = await readFile(path, 'utf8')
    await writeFile(path, text + '\n')
    await assert.rejects(loadDataset(root), /Checksum mismatch/)
    const lines = text.trim().split('\n')
    const chunk = JSON.parse(lines[0])
    chunk.section_index = 999
    lines[0] = JSON.stringify(chunk)
    const changed = lines.join('\n') + '\n'
    await writeFile(path, changed)
    const checksum = createHash('sha256').update(changed).digest('hex')
    const checksumPath = resolve(root, 'SHA256SUMS.txt')
    const checksums = await readFile(checksumPath, 'utf8')
    await writeFile(checksumPath, checksums.replace(/^[a-f0-9]{64}(\s+chunks\/chunks_all\.jsonl)$/m, checksum + '$1'))
    await assert.rejects(loadDataset(root), /Invalid chunk reference/)
  } finally {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep)) throw new Error('Test cleanup path is outside temporary directory')
    await rm(root, { recursive: true, force: true })
  }
})
