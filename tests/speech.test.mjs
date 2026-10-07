import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createSpeechService, SpeechError, speechSsml } from '../server/speech.mjs'
import { memoryStore } from '../server/rag/limits.mjs'
import { handleApi } from '../server/handler.mjs'

const config = () => ({ key: 'test-server-secret', region: 'southeastasia' })
const quota = () => ({ perMinute: 100, perDay: 100, globalPerDay: 100 })
const request = (text = 'Ta kể con nghe về năm 938. [1]', visitor = 'student') => ({ characterId: 'ngo-quyen', text, visitor })
const mp3 = () => new Response(Buffer.from('mock-mp3'), { headers: { 'Content-Type': 'audio/mpeg' } })
const service = (extra = {}) => createSpeechService({ config, store: memoryStore(), limits: quota, fetchAudio: async () => mp3(), ...extra })

test('speech uses character voices, escapes SSML and removes only visual citations', async () => {
  const calls = []
  const synthesize = service({ fetchAudio: async (...args) => { calls.push(args); return mp3() } })
  const result = await synthesize(request('Năm 938 [1]. <voice name="evil"> & sách.'))
  assert.equal(result.toString(), 'mock-mp3')
  const [url, options] = calls[0]
  assert.equal(url, 'https://southeastasia.tts.speech.microsoft.com/cognitiveservices/v1')
  assert.equal(options.headers['Ocp-Apim-Subscription-Key'], 'test-server-secret')
  assert.ok(options.signal instanceof AbortSignal)
  assert.match(options.body, /vi-VN-NamMinhNeural/)
  assert.match(options.body, /rate="-8%"/)
  assert.match(options.body, /&lt;voice name=&quot;evil&quot;&gt; &amp; sách/)
  assert.ok(!options.body.includes('[1]'))
  assert.match(options.body, /938/)
  assert.match(speechSsml('hai-ba-trung', 'Xin chào'), /vi-VN-HoaiMyNeural/)
  assert.match(speechSsml('quang-trung', 'Xin chào'), /rate="\+8%"/)
})

test('invalid character, text and missing/unsafe configuration never contact Azure', async () => {
  let calls = 0
  const fetchAudio = async () => { calls++; return mp3() }
  const synthesize = service({ fetchAudio })
  for (const characterId of ['unknown', '__proto__', 'toString']) await assert.rejects(synthesize({ ...request(), characterId }), { status: 404 })
  for (const text of [null, {}, '', '   ', '[1]', 'a'.repeat(6001)]) await assert.rejects(synthesize(request(text)), { status: 400 })
  await assert.rejects(service({ fetchAudio, config: () => ({}) })(request()), { code: 'SPEECH_NOT_CONFIGURED' })
  await assert.rejects(service({ fetchAudio, config: () => ({ key: 'secret', region: 'evil.com/path' }) })(request()), { code: 'SPEECH_CONFIGURATION_INVALID' })
  assert.equal(calls, 0)
})

test('cached replay avoids another paid request; visitor/global quotas and rate limits are separate', async () => {
  let calls = 0
  const fetchAudio = async () => { calls++; return mp3() }
  const synthesize = service({ fetchAudio, limits: () => ({ perMinute: 10, perDay: 1, globalPerDay: 2 }) })
  await synthesize(request())
  await synthesize(request())
  assert.equal(calls, 1)
  await assert.rejects(synthesize(request('Khác')), { status: 429, code: 'SPEECH_QUOTA_EXCEEDED' })
  await synthesize(request('Khác', 'student2'))
  await assert.rejects(synthesize(request('Lại khác', 'student3')), { code: 'SPEECH_QUOTA_EXCEEDED' })
  assert.equal(calls, 2)
  const rateLimited = service({ limits: () => ({ perMinute: 1, perDay: 100, globalPerDay: 100 }) })
  await rateLimited(request())
  await assert.rejects(rateLimited(request()), (error) => error.status === 429 && error.retryAfter > 0)
})

test('Azure failures return safe errors without leaking credentials or upstream response bodies', async () => {
  for (const [fetchAudio, status, code] of [
    [async () => new Response('secret diagnostic', { status: 401 }), 502, 'SPEECH_UPSTREAM_ERROR'],
    [async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }), 502, 'SPEECH_INVALID_AUDIO'],
    [async () => new Response('', { headers: { 'Content-Type': 'audio/mpeg' } }), 502, 'SPEECH_INVALID_AUDIO'],
    [async () => { throw new DOMException('secret diagnostic', 'TimeoutError') }, 504, 'SPEECH_UNAVAILABLE'],
  ]) {
    await assert.rejects(service({ fetchAudio })(request()), (error) => error instanceof SpeechError && error.status === status && error.code === code && !/secret/.test(error.message))
  }
})

test('speech HTTP endpoint validates JSON, enforces POST, handles Vercel routing and works without dataset', async () => {
  const server = createServer((req, res) => handleApi(req, res, async () => { throw new Error('Dataset must not be read for speech') }, { speech: service() }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const post = (path, body, contentType = 'application/json') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': contentType }, body })
  try {
    const response = await post('/api/dataset?route=characters/ngo-quyen/speech', JSON.stringify({ text: 'Xin chào' }))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'audio/mpeg')
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.equal(await response.text(), 'mock-mp3')
    const get = await fetch(`${base}/api/characters/ngo-quyen/speech`)
    assert.equal(get.status, 405); assert.equal(get.headers.get('Allow'), 'POST')
    const path = '/api/characters/ngo-quyen/speech'
    assert.equal((await post(path, '{')).status, 400)
    assert.equal((await post(path, '[]')).status, 400)
    assert.equal((await post(path, '{}')).status, 400)
    assert.equal((await post(path, '{"text":"hello"}', 'text/plain')).status, 415)
    assert.equal((await post(path, JSON.stringify({ text: 'a'.repeat(33000) }))).status, 413)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
