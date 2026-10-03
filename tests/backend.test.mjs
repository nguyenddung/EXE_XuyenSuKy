import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { defaultDatasetPath, loadDataset, normalize } from '../server/dataset.mjs'
import { handleApi } from '../server/handler.mjs'

let dataset, server, base
before(async () => {
  dataset = await loadDataset()
  server = createServer((req, res) => handleApi(req, res, async () => dataset))
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${server.address().port}/api/`
})
after(async () => { await new Promise((done) => server.close(done)) })
const get = async (path) => { const response = await fetch(`${base}${path}`); return { response, body: await response.json() } }

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
