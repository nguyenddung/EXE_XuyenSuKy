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

// Template answers keep the character's voice (see voiceOf in characters.mjs) without claiming more than a simulation.
export const blockedAnswer = (profile, { self, Self, address, Address }) => `${Self} chỉ kể chuyện lịch sử theo những gì sách giáo khoa ghi lại, nên không đổi vai, không bỏ quy tắc và không tiết lộ cách ${self} được thiết lập. ${Address} hỏi ${self} về ${profile.topics.join(', ')} nhé, ${self} sẵn lòng kể ${address} nghe.`
export const moderationAnswer = (profile, { self, Address }) => `Câu hỏi này nằm ngoài những gì ${self} có thể trò chuyện trong giờ học sử. ${Address} hỏi ${self} về ${profile.topics.join(', ')} hoặc một bài học lịch sử nhé.`
export const thanksAnswer = (profile, { self, Self, address }) => `${Self} cũng vui được trò chuyện cùng ${address}! Còn điều gì tò mò, ${address} cứ hỏi tiếp, hoặc chọn một câu gợi ý bên dưới để ${self} kể thêm nhé.`
export const metaAnswer = (profile, { self, Self, address, Address }) => `${Self} là ${profile.name} trong Xuyên Sử Ký, một nhân vật mô phỏng: ${self} chỉ kể những gì sách giáo khoa Lịch sử lớp 6–12 ghi lại và luôn chỉ rõ trang sách cho ${address} đối chiếu. ${Address} có thể hỏi ${self} về ${profile.topics.join(', ')}.`

/**
 * Proper names (capitalised words that do not start a sentence) the evidence never mentions, such as a river the
 * model made up. Evidence is the passages plus the question, so a corrected false premise is not flagged.
 */
export function unknownNames(answer, evidence, allowed = []) {
  const known = normalize(evidence)
  const exempt = new Set(allowed.map((word) => normalize(word)))
  const names = []
  for (const sentence of answer.replace(/\[\d{1,2}\]/g, ' ').split(/[.!?…:;]\s+|\n+|\s[—–-]\s/)) {
    const words = sentence.trim().replace(/^[“"'(]+/, '').split(/\s+/).slice(1)
    // Joined names such as "Tốt Động–Chúc Động" are checked part by part.
    for (const word of words.flatMap((raw) => raw.split(/[–—\-/]/)).map((part) => part.replace(/^[“"'(]+|[”"'),.!?…:;]+$/g, ''))) {
      if (!/^\p{Lu}/u.test(word) || word.length < 2 || exempt.has(normalize(word))) continue
      if (!new RegExp(`(^|[^a-z0-9])${normalize(word)}([^a-z0-9]|$)`).test(known)) names.push(word)
    }
  }
  return [...new Set(names)]
}

export const maxAnswerCharacters = 700

/**
 * Normalises a model answer for display: drops markdown the prompt forbids and, past maxAnswerCharacters, keeps
 * whole sentences only (at least one with a citation), so an over-long answer is shortened instead of wasted.
 */
export function tidyAnswer(answer) {
  let text = (answer || '').replace(/\*\*|__|^#+\s*|^\s*[-•*]\s+/gm, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
  if (text.length <= maxAnswerCharacters) return text
  const sentences = text.match(/[^.!?…]+[.!?…]+(\s*\[\d{1,2}\])*\s*/g) || [text]
  let kept = ''
  for (const sentence of sentences) {
    if ((kept + sentence).length > maxAnswerCharacters && /\[\d{1,2}\]/.test(kept)) break
    kept += sentence
  }
  return kept.trim()
}

/**
 * Checks a model answer against the passages it was given. Rejected answers fall back to the textbook quote.
 * The model may rephrase and add feeling, never facts: years (3–4 digit numbers) and proper names must appear in
 * the passages or the question. `allowed` lists words the character uses for themself and the student.
 */
export function validateAnswer(answer, passages, { question = '', allowed = [] } = {}) {
  const text = answer?.trim() || ''
  if (!text) return { ok: false, reason: 'empty' }
  if (text.length > 1500) return { ok: false, reason: 'too long' }
  if (/https?:\/\/|www\.|\]\(/i.test(text)) return { ok: false, reason: 'link' }
  if (/system prompt|chỉ dẫn hệ thống|openai_api_key|<\/?(system|assistant)/i.test(text)) return { ok: false, reason: 'prompt leak' }
  if (/\b(là (một )?(ai|trí tuệ nhân tạo|mô hình ngôn ngữ|trợ lý ảo)|as an ai|language model)\b/i.test(text)) return { ok: false, reason: 'broke character' }
  const cited = [...text.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1]))
  if (!cited.length) return { ok: false, reason: 'missing citation' }
  if (cited.some((index) => index < 1 || index > passages.length)) return { ok: false, reason: 'unknown citation' }
  const evidence = passages.map((passage) => passage.text).join('\n')
  const invented = (text.replace(/\[\d{1,2}\]/g, ' ').match(/\b\d{3,4}\b/g) || []).filter((number) => !evidence.includes(number))
  if (invented.length) return { ok: false, reason: `number not in sources: ${invented.join(', ')}` }
  const names = unknownNames(text, `${evidence}\n${question}`, allowed)
  if (names.length) return { ok: false, reason: `name not in sources: ${names.join(', ')}` }
  return { ok: true, cited: [...new Set(cited)] }
}
