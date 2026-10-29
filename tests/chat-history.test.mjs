import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiContext, clearHistory, CHAT_HISTORY_VERSION, loadHistory, MAX_STORED_EXCHANGES, persistable, saveHistory, storageKey, toChatReply } from '../src/lib/chatHistory.ts'

class FakeStorage {
  data = new Map()
  limit = Infinity
  failReads = false
  getItem(key) { if (this.failReads) throw new Error('blocked'); return this.data.has(key) ? this.data.get(key) : null }
  setItem(key, value) {
    if (value.length > this.limit) throw new DOMException('full', 'QuotaExceededError')
    this.data.set(key, String(value))
  }
  removeItem(key) { this.data.delete(key) }
}

const source = { id: 'c1', lessonId: 'LS7_B1', lessonTitle: 'Nhà Lý', text: 'ĐOẠN DÀI KHÔNG ĐƯỢC LƯU', quote: 'Dời đô về Thăng Long', source: { book: 'Lịch sử 7', bookSeries: 'KNTT', publisher: 'NXB', sourcePdf: 'a.pdf', pageStart: 3, pageEnd: 4, pageKind: 'pdf' } }
const exchange = (n, extra = {}) => ({ id: `e${n}`, question: `Câu hỏi ${n}`, askedAt: 1000 + n, answeredAt: 2000 + n, reply: { mode: 'textbook', kind: 'grounded', answer: `Trả lời ${n}`, sources: [source] }, ...extra })

test('answered exchanges round-trip with sources and timestamps, and nothing else is stored', () => {
  const storage = new FakeStorage()
  const dirty = exchange(1, { audio: 'data:audio/mpeg;base64,AAAA', apiKey: 'sk-secret', loading: true })
  assert.equal(saveHistory('minh@xuyensuki.vn', 'ngo-quyen', [dirty, { id: 'p', question: 'Chưa trả lời', askedAt: 5 }, { id: 'f', question: 'Lỗi', askedAt: 6, error: 'HTTP 503' }], storage), 'saved')
  const raw = [...storage.data.values()][0]
  for (const forbidden of ['audio', 'sk-secret', 'loading', 'ĐOẠN DÀI', 'Chưa trả lời', 'HTTP 503']) assert.ok(!raw.includes(forbidden), forbidden)
  const loaded = loadHistory('minh@xuyensuki.vn', 'ngo-quyen', storage)
  assert.equal(loaded.status, 'restored')
  assert.equal(loaded.exchanges.length, 1)
  const [restored] = loaded.exchanges
  assert.equal(restored.question, 'Câu hỏi 1')
  assert.equal(restored.askedAt, 1001)
  assert.equal(restored.answeredAt, 2001)
  assert.equal(restored.reply.answer, 'Trả lời 1')
  assert.deepEqual(restored.reply.sources[0], { id: 'c1', lessonId: 'LS7_B1', lessonTitle: 'Nhà Lý', quote: 'Dời đô về Thăng Long', source: source.source })
  assert.equal(JSON.parse(raw).version, CHAT_HISTORY_VERSION)
})

test('histories are separated by owner and by character, including tricky ids', () => {
  const storage = new FakeStorage()
  saveHistory('minh@xuyensuki.vn', 'ngo-quyen', [exchange(1)], storage)
  saveHistory('guest', 'ngo-quyen', [exchange(2)], storage)
  saveHistory('minh@xuyensuki.vn', 'ly-cong-uan', [exchange(3)], storage)
  saveHistory('a:b', 'c', [exchange(4)], storage)
  saveHistory('a', 'b:c', [exchange(5)], storage)
  const question = (owner, character) => loadHistory(owner, character, storage).exchanges.map((item) => item.question)
  assert.deepEqual(question('minh@xuyensuki.vn', 'ngo-quyen'), ['Câu hỏi 1'])
  assert.deepEqual(question('guest', 'ngo-quyen'), ['Câu hỏi 2'])
  assert.deepEqual(question('minh@xuyensuki.vn', 'ly-cong-uan'), ['Câu hỏi 3'])
  assert.deepEqual(question('a:b', 'c'), ['Câu hỏi 4'])
  assert.deepEqual(question('a', 'b:c'), ['Câu hỏi 5'])
  assert.deepEqual(question('other@example.com', 'ngo-quyen'), [])
  assert.equal(storage.data.size, 5)
})

test('a record copied under another owner or character is never shown', () => {
  const storage = new FakeStorage()
  saveHistory('minh@xuyensuki.vn', 'ngo-quyen', [exchange(1)], storage)
  storage.data.set(storageKey('guest', 'ngo-quyen'), storage.data.get(storageKey('minh@xuyensuki.vn', 'ngo-quyen')))
  storage.data.set(storageKey('minh@xuyensuki.vn', 'ly-cong-uan'), storage.data.get(storageKey('minh@xuyensuki.vn', 'ngo-quyen')))
  assert.deepEqual(loadHistory('guest', 'ngo-quyen', storage), { exchanges: [], status: 'discarded' })
  assert.deepEqual(loadHistory('minh@xuyensuki.vn', 'ly-cong-uan', storage), { exchanges: [], status: 'discarded' })
  assert.equal(loadHistory('minh@xuyensuki.vn', 'ngo-quyen', storage).exchanges.length, 1)
})

test('corrupt, old and future data is discarded without throwing and can be cleared', () => {
  const storage = new FakeStorage()
  const key = storageKey('guest', 'ngo-quyen')
  const cases = ['{không phải json', 'null', '[]', '"text"', JSON.stringify({ version: 1, owner: 'guest', characterId: 'ngo-quyen', exchanges: 'x' }),
    JSON.stringify({ version: 0, owner: 'guest', characterId: 'ngo-quyen', exchanges: [exchange(1)] }),
    JSON.stringify({ owner: 'guest', characterId: 'ngo-quyen', exchanges: [exchange(1)] }),
    JSON.stringify({ version: CHAT_HISTORY_VERSION + 1, owner: 'guest', characterId: 'ngo-quyen', exchanges: [exchange(1)] })]
  for (const raw of cases) {
    storage.data.set(key, raw)
    assert.deepEqual(loadHistory('guest', 'ngo-quyen', storage), { exchanges: [], status: 'discarded' }, raw)
    // Loading is repeatable (React renders twice in development); the caller heals the slot afterwards.
    assert.deepEqual(loadHistory('guest', 'ngo-quyen', storage), { exchanges: [], status: 'discarded' }, raw)
    assert.equal(clearHistory('guest', 'ngo-quyen', storage), true)
  }
  assert.deepEqual(loadHistory('guest', 'ngo-quyen', storage), { exchanges: [], status: 'empty' })
})

test('damaged entries are skipped while valid ones survive', () => {
  const storage = new FakeStorage()
  const bad = [null, 7, { question: 'thiếu trả lời', askedAt: 1 }, { ...exchange(2), reply: { mode: 'hack', answer: 'x', sources: [] } }, { ...exchange(3), question: '' }, { ...exchange(4), reply: { ...exchange(4).reply, sources: [null, { id: 1 }, source] } }]
  storage.data.set(storageKey('guest', 'ngo-quyen'), JSON.stringify({ version: CHAT_HISTORY_VERSION, owner: 'guest', characterId: 'ngo-quyen', exchanges: [exchange(1), ...bad] }))
  const loaded = loadHistory('guest', 'ngo-quyen', storage)
  assert.equal(loaded.status, 'restored')
  assert.deepEqual(loaded.exchanges.map((item) => item.question), ['Câu hỏi 1', 'Câu hỏi 4'])
  assert.equal(loaded.exchanges[1].reply.sources.length, 1)
})

test('the number of stored turns is capped and the newest turns win', () => {
  const storage = new FakeStorage()
  const many = Array.from({ length: MAX_STORED_EXCHANGES + 25 }, (_, n) => exchange(n))
  assert.equal(saveHistory('guest', 'ngo-quyen', many, storage), 'saved')
  const loaded = loadHistory('guest', 'ngo-quyen', storage).exchanges
  assert.equal(loaded.length, MAX_STORED_EXCHANGES)
  assert.equal(loaded.at(-1).question, `Câu hỏi ${MAX_STORED_EXCHANGES + 24}`)
  assert.equal(loaded[0].question, 'Câu hỏi 25')
})

test('oversized text is truncated instead of growing without bound', () => {
  const huge = exchange(1, { question: 'q'.repeat(5000), reply: { mode: 'rag', answer: 'a'.repeat(50000), notice: 'n'.repeat(5000), sources: Array.from({ length: 12 }, () => ({ ...source, quote: 'x'.repeat(5000) })) } })
  const [stored] = persistable([huge])
  assert.equal(stored.question.length, 1000)
  assert.equal(stored.reply.answer.length, 4000)
  assert.equal(stored.reply.notice.length, 500)
  assert.equal(stored.reply.sources.length, 5)
  assert.equal(stored.reply.sources[0].quote.length, 600)
})

test('a full quota drops the oldest turns first, and total failure removes the stale record', () => {
  const storage = new FakeStorage()
  const turns = Array.from({ length: 8 }, (_, n) => exchange(n))
  saveHistory('guest', 'ngo-quyen', turns, storage)
  const full = storage.data.get(storageKey('guest', 'ngo-quyen')).length
  storage.limit = Math.floor(full * 0.6)
  assert.equal(saveHistory('guest', 'ngo-quyen', turns, storage), 'trimmed')
  const kept = loadHistory('guest', 'ngo-quyen', storage).exchanges
  assert.ok(kept.length > 0 && kept.length < 8)
  assert.equal(kept.at(-1).question, 'Câu hỏi 7')
  storage.limit = 10
  assert.equal(saveHistory('guest', 'ngo-quyen', turns, storage), 'failed')
  assert.equal(storage.data.has(storageKey('guest', 'ngo-quyen')), false)
  assert.deepEqual(loadHistory('guest', 'ngo-quyen', storage).exchanges, [])
})

test('unavailable or blocked storage never throws', () => {
  assert.equal(saveHistory('guest', 'ngo-quyen', [exchange(1)], null), 'failed')
  assert.deepEqual(loadHistory('guest', 'ngo-quyen', null), { exchanges: [], status: 'empty' })
  assert.equal(clearHistory('guest', 'ngo-quyen', null), false)
  const storage = new FakeStorage()
  storage.failReads = true
  assert.deepEqual(loadHistory('guest', 'ngo-quyen', storage), { exchanges: [], status: 'empty' })
})

test('clearing removes only the chosen owner and character', () => {
  const storage = new FakeStorage()
  saveHistory('minh@xuyensuki.vn', 'ngo-quyen', [exchange(1)], storage)
  saveHistory('minh@xuyensuki.vn', 'ly-cong-uan', [exchange(2)], storage)
  saveHistory('guest', 'ngo-quyen', [exchange(3)], storage)
  assert.equal(clearHistory('minh@xuyensuki.vn', 'ngo-quyen', storage), true)
  assert.equal(loadHistory('minh@xuyensuki.vn', 'ngo-quyen', storage).exchanges.length, 0)
  assert.equal(loadHistory('minh@xuyensuki.vn', 'ly-cong-uan', storage).exchanges.length, 1)
  assert.equal(loadHistory('guest', 'ngo-quyen', storage).exchanges.length, 1)
  saveHistory('minh@xuyensuki.vn', 'ly-cong-uan', [], storage)
  assert.equal(storage.data.has(storageKey('minh@xuyensuki.vn', 'ly-cong-uan')), false)
})

test('API context keeps the existing limit: the last three answered turns, answers cut at 2000 characters', () => {
  const turns = [...Array.from({ length: 5 }, (_, n) => exchange(n)), { id: 'p', question: 'đang chờ', askedAt: 1 }]
  turns[4].reply.answer = 'z'.repeat(3000)
  const context = apiContext(turns)
  assert.equal(context.length, 6)
  assert.deepEqual(context.map((message) => message.role), ['user', 'assistant', 'user', 'assistant', 'user', 'assistant'])
  assert.equal(context[0].content, 'Câu hỏi 2')
  assert.equal(context.at(-1).content.length, 2000)
})

test('server replies are compacted to the fields the interface uses', () => {
  const reply = toChatReply({ characterId: 'ngo-quyen', mode: 'rag', kind: 'grounded', answer: 'Năm 938', notice: 'Hết lượt AI', sources: [source], suggestions: ['a'], relatedLessons: [{ id: 'x' }] })
  assert.deepEqual(Object.keys(reply).sort(), ['answer', 'kind', 'mode', 'notice', 'sources'])
  assert.equal('text' in reply.sources[0], false)
})
