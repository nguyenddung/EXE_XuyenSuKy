import profiles from '../shared/characters.json' with { type: 'json' }
import voices from '../shared/character-voices.json' with { type: 'json' }
import { voiceOf } from './characters.mjs'

// Builds the ElevenLabs Voice Design requests that give each character a Vietnamese voice of their own.
// The descriptions in shared/character-voices.json describe age, region (accent) and temperament; they never
// name a real person and no recording of anyone is used: these are simulated voices, not copies of real ones.

export const designModel = 'eleven_multilingual_ttv_v2'
export const characterIds = Object.keys(voices)

/** Vietnamese preview text in the character's own voice (the API needs 100–1000 characters). */
export function sampleText(characterId) {
  const profile = profiles.find((item) => item.id === characterId)
  const { Self, address } = voiceOf(profile)
  return `${profile.greeting} ${Self} sẽ kể ${address} nghe những trang sử trong sách giáo khoa: từng mốc năm, từng trận đánh và cả những bài học vẫn còn nguyên giá trị đến hôm nay.`
}

export function designRequest(characterId) {
  const voice = voices[characterId]?.elevenlabs
  if (!voice) throw new Error(`Không có cấu hình giọng cho nhân vật ${characterId}.`)
  return { voice_description: voice.design, text: sampleText(characterId), model_id: designModel, guidance_scale: 4, loudness: 0.5 }
}

export function createRequest(characterId, generatedVoiceId) {
  const profile = profiles.find((item) => item.id === characterId)
  return { voice_name: `Xuyên Sử Ký · ${profile.name}`, voice_description: voices[characterId].elevenlabs.design, generated_voice_id: generatedVoiceId, labels: { app: 'xuyen-su-ky', character: characterId } }
}

/** shared/character-voices.json with one character per line, as committed. */
export function formatVoices(config) {
  return `{\n${Object.entries(config).map(([id, entry]) => `  ${JSON.stringify(id)}: ${JSON.stringify(entry).replaceAll('":', '": ').replaceAll(',"', ', "')}`).join(',\n')}\n}\n`
}
