import { createHash } from 'node:crypto'
import voices from '../shared/character-voices.json' with { type: 'json' }
import { defaultStore } from './rag/limits.mjs'

export class SpeechError extends Error {
  constructor(status, code, message, retryAfter) {
    super(message); this.status = status; this.code = code; this.retryAfter = retryAfter
  }
}

/** A provider failure, tagged with the provider's HTTP status and reason code (never its message or our key). */
function upstream(providerStatus, reason, ...args) {
  const error = new SpeechError(502, ...args)
  error.upstream = `${providerStatus}${reason ? ` ${reason}` : ''}`
  return error
}

const numberEnv = (name, fallback) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}
/**
 * The ElevenLabs voice of a character, shared by spoken answers and the live voice agents: a per-character
 * override (ELEVENLABS_VOICE_<ID>), else the Vietnamese voice designed for it (`designedVoiceId`, written by
 * `npm run voices:create`), else its own default voice. Every character has a different voice.
 */
export function elevenLabsVoiceId(characterId) {
  const { designedVoiceId, voiceId } = voices[characterId].elevenlabs
  return process.env[`ELEVENLABS_VOICE_${characterId.replaceAll('-', '_').toUpperCase()}`] || designedVoiceId || voiceId
}
/** Delivery of each character: steadier for calm elders, more expressive for fiery leaders. */
export function elevenLabsSettings(characterId) {
  const { rate, elevenlabs } = voices[characterId]
  return { stability: elevenlabs.stability, similarity_boost: 0.75, style: elevenlabs.style, use_speaker_boost: true, speed: rate }
}
const configuration = (characterId) => {
  const provider = process.env.SPEECH_PROVIDER || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'azure')
  if (provider !== 'elevenlabs') return { provider, key: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION }
  return { provider, key: process.env.ELEVENLABS_API_KEY, voiceId: elevenLabsVoiceId(characterId), model: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5' }
}
const escapeXml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])

// Speak the answer itself, omitting visual citation markers; never accept SSML from the browser.
export const spokenText = (text) => text.replace(/\[\d+\]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
export function speechSsml(characterId, text) {
  if (!Object.hasOwn(voices, characterId)) throw new SpeechError(404, 'CHARACTER_NOT_FOUND', 'Không tìm thấy giọng của nhân vật.')
  const profile = voices[characterId]
  const rate = Math.round((profile.rate - 1) * 100)
  const pitch = Math.round((profile.pitch - 1) * 100)
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN"><voice name="${profile.voice}"><prosody rate="${rate >= 0 ? '+' : ''}${rate}%" pitch="${pitch >= 0 ? '+' : ''}${pitch}%">${escapeXml(spokenText(text))}</prosody></voice></speak>`
}

// Primary-provider failures that the Google voice can cover. Bad input, a disabled server voice and the app's own
// rate limits and daily quotas are never covered: they stay errors.
const BACKUP_CODES = new Set(['SPEECH_NOT_CONFIGURED', 'SPEECH_CONFIGURATION_INVALID', 'SPEECH_UPSTREAM_ERROR', 'SPEECH_PROVIDER_LIMITED', 'SPEECH_INVALID_AUDIO', 'SPEECH_UNAVAILABLE'])

/** Splits text into pieces of at most `limit` characters, cutting after a sentence, then a comma, then a word. */
export function speechChunks(text, limit = 180) {
  const chunks = []
  let rest = text.replace(/\s+/g, ' ').trim()
  while (rest.length > limit) {
    const window = rest.slice(0, limit + 1)
    const lastBreak = (characters) => Math.max(...characters.map((character) => window.lastIndexOf(character)))
    const cut = [lastBreak(['. ', '! ', '? ', '… ']), lastBreak([', ', '; ', ': ']), window.lastIndexOf(' ')].find((index) => index > limit / 3)
    const at = cut === undefined ? limit : cut + 1
    chunks.push(rest.slice(0, at).trim()); rest = rest.slice(at).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

/**
 * Backup voice: the Vietnamese voice of Google Translate, read in pieces of up to 180 characters and joined into
 * one MP3. It needs no key, so it covers an ElevenLabs account out of credits; it is the same voice for everyone.
 */
export function createGoogleSpeech({ fetchAudio = fetch } = {}) {
  return async (text) => {
    const chunks = speechChunks(text)
    const parts = new Array(chunks.length)
    let next = 0
    async function worker() {
      while (next < chunks.length) {
        const index = next++
        const query = new URLSearchParams({ ie: 'UTF-8', tl: 'vi', client: 'tw-ob', q: chunks[index], total: String(chunks.length), idx: String(index), textlen: String(chunks[index].length) })
        let response
        try { response = await fetchAudio(`https://translate.google.com/translate_tts?${query}`, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'audio/mpeg' } }) }
        catch (error) { throw new SpeechError(error.name === 'TimeoutError' ? 504 : 502, 'SPEECH_UNAVAILABLE', 'Chưa kết nối được dịch vụ giọng nói. Hãy thử lại sau.') }
        if (!response.ok || !response.headers.get('Content-Type')?.startsWith('audio/')) { await response.body?.cancel(); throw upstream(response.status, 'google', 'SPEECH_UPSTREAM_ERROR', 'Dịch vụ giọng nói đang bận. Hãy thử lại sau.') }
        parts[index] = Buffer.from(await response.arrayBuffer())
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, worker))
    const audio = Buffer.concat(parts)
    if (!audio.length || audio.length > 4 * 1024 * 1024) throw new SpeechError(502, 'SPEECH_INVALID_AUDIO', 'Chưa nhận được âm thanh phù hợp.')
    return audio
  }
}

/** `backup` reads with the Google voice when the primary provider is missing or fails; pass null to turn it off. */
export function createSpeechService({ config = configuration, fetchAudio = fetch, backup = createGoogleSpeech(), store = defaultStore(), limits = () => ({ perMinute: numberEnv('SPEECH_RATE_PER_MINUTE', 12), perDay: numberEnv('SPEECH_REQUESTS_PER_DAY', 40), globalPerDay: numberEnv('SPEECH_GLOBAL_REQUESTS_PER_DAY', 500) }) } = {}) {
  const cache = new Map()
  let cacheBytes = 0
  // After the primary provider fails (no credits, bad key…), go straight to the backup for a minute.
  let primaryDownUntil = 0
  const remember = (cacheKey, audio) => {
    cache.set(cacheKey, { audio, expires: Date.now() + 3600_000 }); cacheBytes += audio.length
    while (cache.size > 32 || cacheBytes > 24 * 1024 * 1024) {
      const oldest = cache.keys().next().value
      cacheBytes -= cache.get(oldest).audio.length; cache.delete(oldest)
    }
  }
  const cached = (cacheKey) => {
    const entry = cache.get(cacheKey)
    if (entry) { cache.delete(cacheKey); cache.set(cacheKey, entry) }
    return entry?.audio
  }

  function primaryRequest(characterId, text) {
    const { provider = 'azure', key, region, voiceId, model = 'eleven_flash_v2_5' } = config(characterId)
    if (!['azure', 'elevenlabs'].includes(provider)) throw new SpeechError(503, 'SPEECH_CONFIGURATION_INVALID', 'Dịch vụ giọng nói chưa được cấu hình hợp lệ.')
    if (!key || (provider === 'azure' && !region)) throw new SpeechError(503, 'SPEECH_NOT_CONFIGURED', 'Chưa cấu hình dịch vụ giọng nói.')
    if (provider === 'azure' && !/^[a-z0-9-]{1,50}$/.test(region)) throw new SpeechError(503, 'SPEECH_CONFIGURATION_INVALID', 'Cấu hình vùng Azure chưa hợp lệ.')
    if (provider === 'elevenlabs' && (!/^[a-zA-Z0-9_-]{1,80}$/.test(voiceId || '') || !/^eleven_[a-zA-Z0-9_]{1,60}$/.test(model))) throw new SpeechError(503, 'SPEECH_CONFIGURATION_INVALID', 'Cấu hình giọng ElevenLabs chưa hợp lệ.')
    const body = provider === 'elevenlabs' ? JSON.stringify({ text: spokenText(text), model_id: model, language_code: 'vi', voice_settings: elevenLabsSettings(characterId) }) : speechSsml(characterId, text)
    const url = provider === 'elevenlabs' ? `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128` : `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
    const headers = provider === 'elevenlabs' ? { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' } : { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'XuyenSuKy' }
    return { provider, url, headers, body, cacheKey: createHash('sha256').update(`${url}:${key}:${body}`).digest('hex') }
  }

  async function primaryAudio({ provider, url, headers, body }) {
    try {
      const response = await fetchAudio(url, { method: 'POST', signal: AbortSignal.timeout(15000), headers, body })
      if (!response.ok) {
        // ElevenLabs names the cause in detail.status (quota_exceeded, invalid_api_key, voice_not_found…): keep only that code.
        const reason = provider === 'elevenlabs' ? await response.json().then((data) => String(data?.detail?.status || data?.detail?.code || '').slice(0, 60), () => '') : (await response.body?.cancel(), '')
        if (provider === 'elevenlabs' && [400, 401, 403].includes(response.status)) throw upstream(response.status, reason, 'SPEECH_UPSTREAM_ERROR', 'Chưa tạo được giọng ElevenLabs. Hãy kiểm tra Secret API Key, quyền tạo giọng và Voice ID trong cấu hình máy chủ.')
        if (response.status === 429) throw new SpeechError(429, 'SPEECH_PROVIDER_LIMITED', 'Dịch vụ giọng nói đang giới hạn lượt đọc. Hãy thử lại sau.', 60)
        throw upstream(response.status, reason, 'SPEECH_UPSTREAM_ERROR', 'Dịch vụ giọng nói đang bận hoặc cấu hình chưa đúng. Hãy thử lại sau.')
      }
      if (!response.headers.get('Content-Type')?.startsWith('audio/')) { await response.body?.cancel(); throw new SpeechError(502, 'SPEECH_INVALID_AUDIO', 'Chưa nhận được âm thanh phù hợp.') }
      const audio = Buffer.from(await response.arrayBuffer())
      if (!audio.length || audio.length > 2 * 1024 * 1024) throw new SpeechError(502, 'SPEECH_INVALID_AUDIO', 'Chưa nhận được âm thanh phù hợp.')
      return audio
    } catch (error) {
      if (error instanceof SpeechError) throw error
      throw new SpeechError(error.name === 'TimeoutError' ? 504 : 502, 'SPEECH_UNAVAILABLE', 'Chưa kết nối được dịch vụ giọng nói. Hãy thử lại sau.')
    }
  }

  return async ({ characterId, text, visitor }) => {
    if (!Object.hasOwn(voices, characterId)) throw new SpeechError(404, 'CHARACTER_NOT_FOUND', 'Không tìm thấy giọng của nhân vật.')
    if (typeof text !== 'string' || !spokenText(text) || text.length > 6000) throw new SpeechError(400, 'INVALID_BODY', 'Nội dung đọc phải có từ 1 đến 6000 ký tự.')
    if (process.env.SPEECH_DISABLED === '1') throw new SpeechError(503, 'SPEECH_NOT_CONFIGURED', 'Giọng máy chủ đang tắt. Bạn có thể dùng giọng đọc của trình duyệt.')
    let primary = null
    try { primary = primaryRequest(characterId, text) } catch (error) { if (!backup) throw error }
    if (primary && backup && Date.now() < primaryDownUntil) primary = null
    const backupKey = createHash('sha256').update(`google:${spokenText(text)}`).digest('hex')
    const quota = limits()
    const minute = await store.increment(`speech:min:${visitor}`, 60_000)
    if (minute.count > quota.perMinute) throw new SpeechError(429, 'SPEECH_RATE_LIMITED', 'Bạn đang nghe quá nhanh. Hãy thử lại sau.', Math.max(1, Math.ceil((minute.resetAt - Date.now()) / 1000)))
    // Bound both total memory and entry count. Cache audio for one hour per server instance.
    for (const [id, entry] of cache) if (entry.expires <= Date.now()) { cache.delete(id); cacheBytes -= entry.audio.length }
    const hit = cached(primary ? primary.cacheKey : backupKey)
    if (hit) return hit
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
    if ((await store.increment(`speech:day:${today}:${visitor}`, 86400_000)).count > quota.perDay || (await store.increment(`speech:day:${today}:all`, 86400_000)).count > quota.globalPerDay) {
      throw new SpeechError(429, 'SPEECH_QUOTA_EXCEEDED', 'Đã hết lượt đọc hôm nay. Bạn vẫn có thể đọc câu trả lời trên màn hình.')
    }
    if (primary) {
      try {
        const audio = await primaryAudio(primary)
        remember(primary.cacheKey, audio)
        return audio
      } catch (error) {
        if (!backup || !BACKUP_CODES.has(error.code)) throw error
        console.warn('[speech] primary voice failed, using the Google voice:', error.code, error.upstream || '')
        primaryDownUntil = Date.now() + 60_000
      }
    }
    const audio = cached(backupKey) || await backup(spokenText(text))
    remember(backupKey, audio)
    return audio
  }
}

export const synthesizeSpeech = createSpeechService()
