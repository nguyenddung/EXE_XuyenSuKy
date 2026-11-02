import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { characterIds, createRequest, designRequest, formatVoices } from '../server/voice-design.mjs'

// Gives each AI character a Vietnamese voice of their own with ElevenLabs Voice Design, in two steps:
//
//   npm run voices:design [-- <character id> ...]   generate previews into voice-previews/<id>/1.mp3, 2.mp3, 3.mp3
//   npm run voices:create -- <id>=<n> [<id>=<n> ...]  save preview n as a voice; its id goes into shared/character-voices.json
//   npm run voices:reset -- <character id> ...        go back to the character's default voice
//
// Then commit shared/character-voices.json and run `npm run sync:voice-agents` for live voice conversations.
// Each saved voice uses one custom voice slot: Free 3, Starter 10, Creator 30.
const voicesPath = fileURLToPath(new URL('../shared/character-voices.json', import.meta.url))
const previewsPath = fileURLToPath(new URL('../voice-previews/', import.meta.url))
const manifestPath = `${previewsPath}manifest.json`
const [command, ...args] = process.argv.slice(2)
const key = process.env.ELEVENLABS_API_KEY?.trim()

async function api(path, body) {
  const response = await fetch(`https://api.elevenlabs.io${path}`, {
    method: 'POST',
    signal: AbortSignal.timeout(120000),
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400)
    const hint = response.status === 401 ? ' (kiểm tra Secret API key và quyền Voices)' : /voice_limit|slots?/i.test(detail) ? ' (đã dùng hết suất giọng tự tạo của gói: Free 3, Starter 10, Creator 30)' : ''
    throw new Error(`ElevenLabs HTTP ${response.status}: ${detail}${hint}`)
  }
  return response.json()
}
const readJson = async (path, fallback) => { try { return JSON.parse(await readFile(path, 'utf8')) } catch { return fallback } }
const pick = (ids) => {
  const unknown = ids.filter((id) => !characterIds.includes(id))
  if (unknown.length) throw new Error(`Không có nhân vật: ${unknown.join(', ')}. Có: ${characterIds.join(', ')}`)
  return ids.length ? ids : characterIds
}

async function design(ids) {
  const manifest = await readJson(manifestPath, {})
  for (const id of pick(ids)) {
    const result = await api('/v1/text-to-voice/design?output_format=mp3_44100_128', designRequest(id))
    await mkdir(`${previewsPath}${id}`, { recursive: true })
    manifest[id] = await Promise.all(result.previews.map(async (preview, index) => {
      const file = `${previewsPath}${id}/${index + 1}.mp3`
      await writeFile(file, Buffer.from(preview.audio_base_64, 'base64'))
      return { n: index + 1, generatedVoiceId: preview.generated_voice_id, file: `voice-previews/${id}/${index + 1}.mp3` }
    }))
    console.log(`${id}: ${manifest[id].map((item) => item.file).join(', ')}`)
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }
  console.log('\nNghe các bản thử, rồi lưu bản ưng ý: npm run voices:create -- tran-hung-dao=2 ho-chi-minh=1 ...')
}

async function create(choices) {
  if (!choices.length) throw new Error('Chọn bản thử: npm run voices:create -- <id>=<số bản thử> ...')
  const manifest = await readJson(manifestPath, {})
  const voices = await readJson(voicesPath, null)
  for (const choice of choices) {
    const [id, n] = choice.split('=')
    pick([id])
    const preview = manifest[id]?.find((item) => item.n === Number(n))
    if (!preview) throw new Error(`Chưa có bản thử ${n} của ${id}. Chạy npm run voices:design -- ${id} trước.`)
    const { voice_id: voiceId } = await api('/v1/text-to-voice', createRequest(id, preview.generatedVoiceId))
    voices[id].elevenlabs.designedVoiceId = voiceId
    await writeFile(voicesPath, formatVoices(voices))
    console.log(`${id}: đã lưu giọng ${voiceId}`)
  }
  console.log('\nCommit shared/character-voices.json, rồi chạy npm run sync:voice-agents để agent giọng nói trực tiếp dùng giọng mới.')
}

async function reset(ids) {
  if (!ids.length) throw new Error('Chọn nhân vật: npm run voices:reset -- <id> ...')
  const voices = await readJson(voicesPath, null)
  for (const id of pick(ids)) delete voices[id].elevenlabs.designedVoiceId
  await writeFile(voicesPath, formatVoices(voices))
  console.log(`Đã quay về giọng mặc định: ${ids.join(', ')}`)
}

try {
  if (!['design', 'create', 'reset'].includes(command)) throw new Error('Dùng: design | create | reset (xem đầu file scripts/design-voices.mjs).')
  if (command !== 'reset' && !key) throw new Error('Thiếu ELEVENLABS_API_KEY trong .env.local.')
  await (command === 'design' ? design(args) : command === 'create' ? create(args) : reset(args))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
