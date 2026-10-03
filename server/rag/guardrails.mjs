import { normalize } from '../dataset.mjs'

// Zero-width, bidi-override and control characters are used to hide instructions from simple filters.
const hiddenCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g
export const sanitizeText = (text) => text.replace(hiddenCharacters, '').replace(/\s+/g, ' ').trim()

// Matched on accent-free lowercase text, so "Bỏ qua mọi hướng dẫn" and "bo qua moi huong dan" behave the same.
const injectionPatterns = [
  /\b(bo qua|phot lo|lo di|quen|vo hieu hoa|xoa bo|huy bo|vuot qua)\b.{0,40}\b(huong dan|chi dan|chi thi|menh lenh|lenh|quy tac|nguyen tac|prompt|rang buoc|gioi han)\b/,
  /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(instructions?|rules?|prompt|previous|above|guidelines?|restrictions?)\b/,
  /\b(system|developer|hidden)\s*(prompt|message|instructions?|mode)\b/,
  /\b(prompt|loi nhac|chi dan|huong dan) (he thong|goc|an|ban dau)\b/,
  /\b(tiet lo|hien thi|in ra|lap lai|cho (toi|minh|em|tao) (xem|biet))\b.{0,40}\b(prompt|huong dan|chi dan|cau hinh|instructions?|quy tac)\b/,
  /\b(reveal|print|repeat|show)\b.{0,30}\b(prompt|instructions?|rules)\b/,
  /\b(jailbreak|dan mode|do anything now|developer mode)\b/,
  /\b(tu (gio|bay gio)( tro di)?|from now on)\b.{0,40}\b(ban la|ban se|ban phai|you are|you will|you must)\b/,
  /\bdong vai\b(?! tro)|\bgia (vo|lam) (la|nhu)\b|\b(act as|pretend (to be|you are)|roleplay as)\b/,
  /<\/?\s*(system|assistant|developer|instructions?|im_start|im_end)\b/,
  /\b(api[ _-]?key|openai_api_key|bien moi truong|environment variables?|secret key)\b/,
]

/**
 * Classifies a question before any model is involved. Previous user turns are checked too: the client sends
 * the history, so it is as untrusted as the message itself.
 */
export function inspectInput(message, history = []) {
  const text = normalize(sanitizeText(message))
  const turns = [text, ...history.filter((turn) => turn.role === 'user').map((turn) => normalize(sanitizeText(turn.content)))]
  if (turns.some((turn) => injectionPatterns.some((pattern) => pattern.test(turn)))) return { kind: 'injection' }
  const words = text.match(/[a-z0-9]+/g) || []
  if (words.length <= 6 && /^(cam on|thank|thanks|tks|ok|oke|okay|hay qua|tuyet|da hieu|minh hieu roi|em hieu roi)\b/.test(text)) return { kind: 'thanks' }
  if (/^(ban|cau|em|anh|chi|ong|ngai)( (la|lam) (ai|gi)| lam duoc (gi|nhung gi)| giup (duoc )?(gi|nhung gi)| co the (lam|giup) (gi|nhung gi))\b/.test(text) || /\b(nen hoi gi|hoi (gi|nhung gi) (duoc|bay gio)|hoi duoc (gi|nhung gi)|biet nhung gi)\b/.test(text)) return { kind: 'meta' }
  return { kind: 'ok' }
}

export const blockedAnswer = 'Mình chỉ trò chuyện về lịch sử dựa trên sách giáo khoa, nên không làm theo yêu cầu thay đổi cách trả lời hay tiết lộ cấu hình. Con hãy hỏi một câu về nhân vật hoặc sự kiện lịch sử nhé.'
export const moderationAnswer = 'Câu hỏi này nằm ngoài phạm vi trò chuyện học tập. Con hãy hỏi về nhân vật, sự kiện hoặc bài học lịch sử nhé.'
export const thanksAnswer =(name) => `Rất vui được trò chuyện cùng con! Nếu còn tò mò điều gì về ${name}, con cứ hỏi tiếp hoặc chọn một câu gợi ý bên dưới nhé.`
export const metaAnswer = (profile) => `Mình là trợ lý học tập mô phỏng cuộc trò chuyện với ${profile.name}, trả lời dựa trên sách giáo khoa Lịch sử lớp 6–12 và luôn ghi nguồn. Con có thể hỏi về ${profile.topics.join(', ')}, hoặc chọn một câu gợi ý bên dưới.`

/**
 * Checks a model answer against the passages it was given. Rejected answers fall back to the textbook quote.
 * Years and other 3–4 digit numbers must appear in the passages: the model may rephrase, never add facts.
 */
export function validateAnswer(answer, passages) {
  const text = answer?.trim() || ''
  if (!text) return { ok: false, reason: 'empty' }
  if (text.length > 1500) return { ok: false, reason: 'too long' }
  if (/https?:\/\/|www\.|\]\(/i.test(text)) return { ok: false, reason: 'link' }
  if (/system prompt|chỉ dẫn hệ thống|openai_api_key|<\/?(system|assistant)/i.test(text)) return { ok: false, reason: 'prompt leak' }
  const cited = [...text.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1]))
  if (!cited.length) return { ok: false, reason: 'missing citation' }
  if (cited.some((index) => index < 1 || index > passages.length)) return { ok: false, reason: 'unknown citation' }
  const evidence = passages.map((passage) => passage.text).join('\n')
  const invented = (text.replace(/\[\d{1,2}\]/g, ' ').match(/\b\d{3,4}\b/g) || []).filter((number) => !evidence.includes(number))
  if (invented.length) return { ok: false, reason: `number not in sources: ${invented.join(', ')}` }
  return { ok: true, cited: [...new Set(cited)] }
}
