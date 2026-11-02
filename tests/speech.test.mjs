import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createSpeechService, elevenLabsVoiceId, SpeechError, speechSsml } from '../server/speech.mjs'
import voices from '../shared/character-voices.json' with { type: 'json' }
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

test('ElevenLabs receives server-selected Vietnamese voice settings and caches per voice', async () => {
  const calls = []
  const settings = { provider: 'elevenlabs', key: 'test-elevenlabs-secret', voiceId: 'JBFqnCBsd6RMkjVDRZzb', model: 'eleven_flash_v2_5' }
  const synthesize = service({ config: () => settings, fetchAudio: async (...args) => { calls.push(args); return mp3() } })
  const input = request('Chiến thắng Bạch Đằng năm 938. [1]')
  assert.equal((await synthesize(input)).toString(), 'mock-mp3')
  await synthesize(input)
  assert.equal(calls.length, 1)
  const [url, options] = calls[0]
  assert.equal(url, 'https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128')
  assert.equal(options.headers['xi-api-key'], settings.key)
  assert.equal(options.headers['Content-Type'], 'application/json')
  assert.ok(options.signal instanceof AbortSignal)
  const body = JSON.parse(options.body)
  assert.equal(body.text, 'Chiến thắng Bạch Đằng năm 938.')
  assert.equal(body.language_code, 'vi')
  assert.equal(body.model_id, 'eleven_flash_v2_5')
  assert.equal(body.voice_settings.speed, 0.92)
  settings.voiceId = 'onwK4e9ZLuTAKqWW03F9'
  await synthesize(input)
  assert.equal(calls.length, 2)
  assert.match(calls[1][0], /onwK4e9ZLuTAKqWW03F9/)
})

test('ElevenLabs environment configuration gives each character its own voice and keeps per-character overrides', async () => {
  const names = ['SPEECH_PROVIDER', 'SPEECH_DISABLED', 'ELEVENLABS_API_KEY', 'ELEVENLABS_MODEL', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_FEMALE_VOICE_ID', 'ELEVENLABS_VOICE_TRAN_HUNG_DAO', 'ELEVENLABS_VOICE_NGO_QUYEN', 'ELEVENLABS_VOICE_BA_TRIEU']
  const before = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  const calls = []
  try {
    for (const name of names) delete process.env[name]
    process.env.ELEVENLABS_API_KEY = 'test-environment-secret'
    const synthesize = createSpeechService({ store: memoryStore(), limits: quota, fetchAudio: async (...args) => { calls.push(args); return mp3() } })
    for (const characterId of ['tran-hung-dao', 'ngo-quyen', 'ba-trieu']) await synthesize({ ...request(), characterId })
    assert.match(calls[0][0], /JBFqnCBsd6RMkjVDRZzb/)
    assert.match(calls[1][0], /onwK4e9ZLuTAKqWW03F9/)
    assert.match(calls[2][0], /Xb7hH8MSUJpSbSDYk0k2/)
    assert.deepEqual(JSON.parse(calls[0][1].body).voice_settings, { stability: 0.7, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed: 0.88 })
    // The old shared defaults no longer put every character on one voice.
    process.env.ELEVENLABS_VOICE_ID = 'SharedMaleVoice'; process.env.ELEVENLABS_FEMALE_VOICE_ID = 'SharedFemaleVoice'
    assert.equal(elevenLabsVoiceId('tran-hung-dao'), 'JBFqnCBsd6RMkjVDRZzb')
    assert.equal(elevenLabsVoiceId('ba-trieu'), 'Xb7hH8MSUJpSbSDYk0k2')
    process.env.ELEVENLABS_VOICE_NGO_QUYEN = 'TeacherVoiceOverride'
    await synthesize(request())
    assert.match(calls[3][0], /TeacherVoiceOverride/)
    process.env.SPEECH_PROVIDER = 'azure'
    process.env.ELEVENLABS_VOICE_NGO_QUYEN = 'https://untrusted.example'
    // Explicit Azure selection uses Azure credentials and ignores ElevenLabs voice settings.
    const azureBefore = { key: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION }
    try {
      process.env.AZURE_SPEECH_KEY = 'test-azure-secret'; process.env.AZURE_SPEECH_REGION = 'southeastasia'
      await synthesize(request())
      assert.match(calls[4][0], /^https:\/\/southeastasia\.tts\.speech\.microsoft\.com\//)
      assert.equal(calls[4][1].headers['xi-api-key'], undefined)
      process.env.SPEECH_DISABLED = '1'
      await assert.rejects(synthesize(request()), { code: 'SPEECH_NOT_CONFIGURED' })
      assert.equal(calls.length, 5)
    } finally {
      for (const [name, value] of [['AZURE_SPEECH_KEY', azureBefore.key], ['AZURE_SPEECH_REGION', azureBefore.region]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value }
    }
  } finally {
    for (const [name, value] of Object.entries(before)) { if (value === undefined) delete process.env[name]; else process.env[name] = value }
  }
})

test('invalid ElevenLabs settings never send credentials to any upstream', async () => {
  let calls = 0
  const base = { provider: 'elevenlabs', key: 'test-secret', voiceId: 'JBFqnCBsd6RMkjVDRZzb' }
  for (const settings of [{ ...base, key: '' }, { ...base, voiceId: 'https://untrusted.example' }, { ...base, model: '../invalid' }, { ...base, provider: 'unknown' }]) {
    await assert.rejects(service({ config: () => settings, fetchAudio: async () => { calls++; return mp3() } })(request()), { status: 503 })
  }
  assert.equal(calls, 0)
})

test('ElevenLabs authentication and quota failures are safe and do not start a second provider', async () => {
  for (const status of [400, 401, 403, 429, 500]) {
    let calls = 0
    const synthesize = service({ config: () => ({ provider: 'elevenlabs', key: 'test-secret', voiceId: 'JBFqnCBsd6RMkjVDRZzb' }), fetchAudio: async () => { calls++; return new Response('private diagnostics and test-secret', { status }) } })
    await assert.rejects(synthesize(request()), (error) => error instanceof SpeechError && error.status === (status === 429 ? 429 : 502) && !/private|test-secret/.test(error.message) && (status !== 429 || error.retryAfter === 60))
    assert.equal(calls, 1)
  }
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

// Each character speaks with a voice of their own (shared/character-voices.json).
test('the 12 characters have 12 different default voices that fit them, and a designed voice wins', async () => {
  const defaults = { George: 'JBFqnCBsd6RMkjVDRZzb', Daniel: 'onwK4e9ZLuTAKqWW03F9', Brian: 'nPczCjzI2devNBz1zQrb', Bill: 'pqHfZKP75CvOlQylNhV4', Callum: 'N2lVS1w4EtoT3dr4eOWO', Charlie: 'IKne3meq5aSn9XLyUdCD', Eric: 'cjVigY5qzO86Huf0OWal', Chris: 'iP95p4xoKVk53GoZ742B', Liam: 'TX3LPaxmHKxFdv7VOQHJ', Will: 'bIHbv24MWmeRgasZH58o', Jessica: 'cgSgspJ2msm6clMCkdW9', Alice: 'Xb7hH8MSUJpSbSDYk0k2' }
  const female = new Set(['Jessica', 'Alice'])
  const ids = Object.keys(voices)
  assert.equal(ids.length, 12)
  assert.equal(new Set(ids.map((id) => voices[id].elevenlabs.voiceId)).size, 12)
  for (const id of ids) {
    const { name, voiceId, stability, style, design } = voices[id].elevenlabs
    assert.equal(defaults[name], voiceId, `${id}: ${name}`)
    assert.equal(female.has(name), voices[id].voice === 'vi-VN-HoaiMyNeural', `${id}: voice gender`)
    assert.ok(stability >= 0.3 && stability <= 0.9 && style >= 0 && style <= 0.6 && voices[id].rate >= 0.7 && voices[id].rate <= 1.2, id)
    assert.match(design, /speaking Vietnamese with a .*accent/, id)
    const { sampleText, designRequest, createRequest } = await import('../server/voice-design.mjs')
    assert.ok(sampleText(id).length >= 100 && sampleText(id).length <= 1000, id)
    assert.deepEqual(Object.keys(designRequest(id)).sort(), ['guidance_scale', 'loudness', 'model_id', 'text', 'voice_description'])
    assert.equal(createRequest(id, 'gen-1').generated_voice_id, 'gen-1')
  }
  // Hồ Chí Minh speaks slowly and steadily, Quang Trung fast and fiery.
  assert.ok(voices['ho-chi-minh'].rate < voices['quang-trung'].rate && voices['ho-chi-minh'].elevenlabs.stability > voices['quang-trung'].elevenlabs.stability)
  const { formatVoices } = await import('../server/voice-design.mjs')
  assert.equal(formatVoices(voices), await readFile(new URL('../shared/character-voices.json', import.meta.url), 'utf8'))
  voices['ho-chi-minh'].elevenlabs.designedVoiceId = 'DesignedVietnameseVoice'
  try { assert.equal(elevenLabsVoiceId('ho-chi-minh'), 'DesignedVietnameseVoice') } finally { delete voices['ho-chi-minh'].elevenlabs.designedVoiceId }
  assert.equal(elevenLabsVoiceId('ho-chi-minh'), 'pqHfZKP75CvOlQylNhV4')
})
