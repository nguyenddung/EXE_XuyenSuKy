import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import profiles from '../shared/characters.json' with { type: 'json' }
import { loadDataset } from '../server/dataset.mjs'
import { handleApi } from '../server/handler.mjs'
import { createLimiter, memoryStore } from '../server/rag/limits.mjs'
import { SpeechError } from '../server/speech.mjs'
import { agentDefinition, createVoiceSession, textbookTool } from '../server/voice-agents.mjs'

let server, base, perMinute = 1e9
const sessions = []
before(async () => {
  const dataset = await loadDataset()
  const limiter = createLimiter(memoryStore(), () => ({ perMinute, aiPerDay: 1e9, aiGlobalPerDay: 1e9 }))
  const voiceSession = async (id) => { sessions.push(id); if (id === 'unknown') throw new SpeechError(404, 'CHARACTER_NOT_FOUND', 'x'); return { signedUrl: `wss://example.test/${id}` } }
  server = createServer((req, res) => handleApi(req, res, async () => dataset, { limiter, voiceSession }))
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${server.address().port}/api/`
})
after(async () => { await new Promise((done) => server.close(done)) })

test('voice sessions are POST-only, uncached and rate limited', async () => {
  const response = await fetch(`${base}characters/ngo-quyen/voice-session`, { method: 'POST' })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { signedUrl: 'wss://example.test/ngo-quyen' })
  assert.equal((await fetch(`${base}characters/ngo-quyen/voice-session`)).status, 405)
  assert.equal((await fetch(`${base}characters/unknown/voice-session`, { method: 'POST' })).status, 404)
  perMinute = 0
  const limited = await fetch(`${base}characters/ngo-quyen/voice-session`, { method: 'POST' })
  perMinute = 1e9
  assert.equal(limited.status, 429)
  assert.deepEqual(sessions, ['ngo-quyen', 'unknown'])
})

test('without an ElevenLabs key live voice is off and no session is opened', async () => {
  const key = process.env.ELEVENLABS_API_KEY
  delete process.env.ELEVENLABS_API_KEY
  try {
    const { items } = await (await fetch(`${base}characters`)).json()
    assert.ok(items.length && items.every((item) => item.liveVoice === false))
    await assert.rejects(createVoiceSession('ngo-quyen'), (error) => error.status === 503)
    await assert.rejects(createVoiceSession('unknown'), (error) => error.status === 404)
  } finally { if (key) process.env.ELEVENLABS_API_KEY = key }
})

test('every character agent speaks Vietnamese in persona, requires signed URLs and looks facts up', () => {
  for (const profile of profiles) {
    const { conversation_config: config, platform_settings: platform } = agentDefinition(profile)
    assert.equal(config.agent.language, 'vi')
    assert.equal(config.agent.first_message, profile.greeting)
    assert.ok(config.agent.prompt.prompt.includes(`tự xưng "${profile.persona.self}"`))
    assert.deepEqual(config.agent.prompt.tools.map((tool) => [tool.type, tool.name]), [['client', textbookTool], ['system', 'end_call']])
    assert.equal(platform.auth.enable_auth, true)
    assert.ok(config.conversation.max_duration_seconds <= 300)
  }
})
