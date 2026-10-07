import { createHash } from 'node:crypto'
import voices from '../shared/character-voices.json' with { type: 'json' }
import { defaultStore } from './rag/limits.mjs'

export class SpeechError extends Error {
  constructor(status, code, message, retryAfter) {
    super(message); this.status = status; this.code = code; this.retryAfter = retryAfter
  }
}

const numberEnv = (name, fallback) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}
const configuration = () => ({ key: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION })
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

export function createSpeechService({ config = configuration, fetchAudio = fetch, store = defaultStore(), limits = () => ({ perMinute: numberEnv('SPEECH_RATE_PER_MINUTE', 12), perDay: numberEnv('SPEECH_REQUESTS_PER_DAY', 40), globalPerDay: numberEnv('SPEECH_GLOBAL_REQUESTS_PER_DAY', 500) }) } = {}) {
  const cache = new Map()
  let cacheBytes = 0
  return async ({ characterId, text, visitor }) => {
    if (!Object.hasOwn(voices, characterId)) throw new SpeechError(404, 'CHARACTER_NOT_FOUND', 'Không tìm thấy giọng của nhân vật.')
    if (typeof text !== 'string' || !spokenText(text) || text.length > 6000) throw new SpeechError(400, 'INVALID_BODY', 'Nội dung đọc phải có từ 1 đến 6000 ký tự.')
    const { key, region } = config()
    if (!key || !region) throw new SpeechError(503, 'SPEECH_NOT_CONFIGURED', 'Chưa cấu hình giọng Azure.')
    if (!/^[a-z0-9-]{1,50}$/.test(region)) throw new SpeechError(503, 'SPEECH_CONFIGURATION_INVALID', 'Cấu hình vùng Azure chưa hợp lệ.')
    const quota = limits()
    const minute = await store.increment(`speech:min:${visitor}`, 60_000)
    if (minute.count > quota.perMinute) throw new SpeechError(429, 'SPEECH_RATE_LIMITED', 'Bạn đang nghe quá nhanh. Hãy thử lại sau.', Math.max(1, Math.ceil((minute.resetAt - Date.now()) / 1000)))
    const ssml = speechSsml(characterId, text)
    const cacheKey = createHash('sha256').update(`${region}:${ssml}`).digest('hex')
    // Bound both total memory and entry count. Cache audio for one hour per server instance.
    for (const [id, entry] of cache) if (entry.expires <= Date.now()) { cache.delete(id); cacheBytes -= entry.audio.length }
    const cached = cache.get(cacheKey)
    if (cached) { cache.delete(cacheKey); cache.set(cacheKey, cached); return cached.audio }
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
    if ((await store.increment(`speech:day:${today}:${visitor}`, 86400_000)).count > quota.perDay || (await store.increment(`speech:day:${today}:all`, 86400_000)).count > quota.globalPerDay) {
      throw new SpeechError(429, 'SPEECH_QUOTA_EXCEEDED', 'Đã hết lượt đọc Azure hôm nay. Bạn vẫn có thể đọc câu trả lời trên màn hình.')
    }
    try {
      const response = await fetchAudio(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'XuyenSuKy' }, body: ssml,
      })
      if (!response.ok) { await response.body?.cancel(); throw new SpeechError(502, 'SPEECH_UPSTREAM_ERROR', 'Dịch vụ giọng nói đang bận hoặc cấu hình chưa đúng. Hãy thử lại sau.') }
      if (!response.headers.get('Content-Type')?.startsWith('audio/')) { await response.body?.cancel(); throw new SpeechError(502, 'SPEECH_INVALID_AUDIO', 'Chưa nhận được âm thanh phù hợp.') }
      const audio = Buffer.from(await response.arrayBuffer())
      if (!audio.length || audio.length > 2 * 1024 * 1024) throw new SpeechError(502, 'SPEECH_INVALID_AUDIO', 'Chưa nhận được âm thanh phù hợp.')
      cache.set(cacheKey, { audio, expires: Date.now() + 3600_000 }); cacheBytes += audio.length
      while (cache.size > 32 || cacheBytes > 24 * 1024 * 1024) {
        const oldest = cache.keys().next().value
        cacheBytes -= cache.get(oldest).audio.length; cache.delete(oldest)
      }
      return audio
    } catch (error) {
      if (error instanceof SpeechError) throw error
      throw new SpeechError(error.name === 'TimeoutError' ? 504 : 502, 'SPEECH_UNAVAILABLE', 'Chưa kết nối được dịch vụ giọng nói. Hãy thử lại sau.')
    }
  }
}

export const synthesizeSpeech = createSpeechService()
