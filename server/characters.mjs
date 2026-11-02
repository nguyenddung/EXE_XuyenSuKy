import profiles from '../shared/characters.json' with { type: 'json' }
import { chunkResponse, lessonId, normalize } from './dataset.mjs'
import { reviewedPassage } from './character-evidence.mjs'

const cache = new WeakMap()
const tokens = (text) => normalize(text).match(/[a-z0-9]+/g) || []
const stopwords = new Set('a ai anh ay ba bac ban bao bi cac cai can cho co con cua cung da de den dieu do duoc gi hay hoi khi la lai lam nao nay nhu nhung no noi o ong ra rang sao se su ta tai tat the thi toi trong tu ve vi voi va xin chao mot nhieu the nao nhu the nao toi muon biet tim hieu nam minh chung'.split(' '))
const includesName = (text, alias) => (` ${text.replace(/[^a-z0-9]+/g, ' ')} `).includes(` ${normalize(alias)} `)
const publicProfile = (profile) => { const { focus, persona, ...publicFields } = profile; return publicFields }
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)
/** How the character refers to themself and to the student, e.g. { self: 'Ta', address: 'con' }. */
export const voiceOf = (profile) => ({ self: profile.persona.self, Self: capitalize(profile.persona.self), address: profile.persona.address, Address: capitalize(profile.persona.address) })

export function characterIndex(dataset) {
  if (cache.has(dataset)) return cache.get(dataset)
  const index = profiles.map((profile) => {
    const mentions = dataset.searchableChunks.filter(({ text, title }) => profile.aliases.some((alias) => includesName(`${title} ${text}`, alias)) && !/\b(duong|truong|pho) le loi\b/.test(text))
    const sections = new Set(mentions.map(({ chunk }) => `${lessonId(chunk)}:${chunk.section_index}`))
    const related = dataset.searchableChunks.filter(({ chunk }) => sections.has(`${lessonId(chunk)}:${chunk.section_index}`))
    const ids = new Set(related.map(({ chunk }) => lessonId(chunk)))
    const lessons = dataset.summaries.filter((lesson) => ids.has(lesson.id)).sort((a, b) => {
      const weight = (lesson) => profile.focus.filter((term) => normalize(lesson.title).includes(normalize(term))).length
      return weight(b) - weight(a) || a.grade - b.grade
    })
    return { profile, related, lessons, public: { ...publicProfile(profile), grades: [...new Set(related.map(({ chunk }) => chunk.grade))].sort((a, b) => a - b), lessonCount: lessons.length, chunkCount: related.length } }
  }).filter((entry) => entry.related.length)
  cache.set(dataset, index)
  return index
}

export function listCharacters(dataset, grade, query = '') {
  const q = normalize(query)
  return characterIndex(dataset).filter((entry) => (!grade || entry.public.grades.includes(grade)) && (!q || normalize(`${entry.profile.name} ${entry.profile.aliases.join(' ')} ${entry.profile.period} ${entry.profile.topics.join(' ')}`).includes(q))).map((entry) => entry.public)
}

function queryTerms(text, profile) {
  let q = normalize(text)
  for (const alias of profile.aliases) q = q.replaceAll(normalize(alias), ' ')
  q = q.replace(/\b(vai tro|dien ra|bat dau|y nghia|nam nao|khi nao|o dau|vi sao|tai sao|nhu the nao|the nao)\b/g, ' ')
  if (q.includes('coc')) q = q.replace(/\b(bo tri|tran dia)\b/g, ' ')
  return [...new Set(tokens(q).filter((term) => !stopwords.has(term)))]
}
const instruction = /^(?:[-–\d. "“]+)?(?:hay |em |trinh bay |khai thac |giai thich |doc them |doc tu lieu |dua vao |neu |lua chon |tom tat |danh gia |cho biet |thao luan )/
const topicPhrases = ['bach dang', 'lam son', 'dien bien phu', 'nhu nguyet', 'ngoc hoi', 'dong da', 'truc lam', 'thang long', 'dai la', 'tuyen ngon doc lap', 'tim duong cuu nuoc', 'tuyen truyen giai phong quan', 'quan tong', 'quan thanh']
function candidates(chunk, terms, profile, intent, phrases, intro) {
  const context = normalize(`${chunk.lesson_title} ${chunk.section_title}`)
  let speaker = profile.aliases.some((alias) => includesName(context, alias)) ? profile.id : null
  return chunk.text.split(/\n+|(?<=[.!?])\s+/).map((raw) => {
    const quote = raw.trim()
    const text = normalize(quote)
    if (quote.length < 35 || quote.endsWith('?') || instruction.test(text)) return null
    const words = new Set(tokens(text))
    const matches = terms.filter((term) => words.has(term))
    const contextualMatches = terms.filter((term) => !words.has(term) && tokens(context).includes(term))
    const coverage = terms.length ? (matches.length + contextualMatches.length * 0.3) / terms.length : 1
    const named = profile.aliases.some((alias) => includesName(text, alias))
    const primary = profile.aliases.some((alias) => includesName(context, alias)) || profile.focus.some((term) => context.includes(normalize(term)))
    const namedPeople = profiles.filter((person) => person.aliases.some((alias) => includesName(text, alias)))
    if (namedPeople.length === 1) speaker = namedPeople[0].id
    const other = namedPeople.some((person) => person.id !== profile.id)
    if ((other && !named) || (/^(ong |ba |nguoi |voi vai tro)/.test(text) && speaker !== profile.id)) return null
    if (intro && !named && speaker !== profile.id) return null
    if (!intro && (coverage < 0.45 || (phrases.length && !phrases.some((phrase) => text.includes(phrase) || context.includes(phrase))))) return null
    if (terms.includes('coc') && !words.has('coc')) return null
    if (terms.some((term) => /^\d{3,4}$/.test(term) && !words.has(term))) return null
    let score = matches.length * 5 + (named ? 5 : 0) + (primary ? 14 : 0) + (chunk.content_type === 'body' ? 2 : 0)
    if (intent === 'date' || intent === 'start') {
      score += /\b\d{2,4}\b/.test(text) ? 14 : -16
      if (/\b(bat dau|dung co|truyen hich|mua xuan|dau nam|lanh dao nhan dan khoi nghia)\b/.test(text)) score += 14
      if (/\b(that bai|dan ap|hoi the|nam 23 tuoi)\b/.test(text)) score -= 16
    }
    if (intent === 'reason') score += /\b(vi |nham |de |bat binh|nguyen nhan|nho |gop phan|ket thuc|mo ra|doc lap|thuan loi|trung tam|rong cuon|tinh than|doan ket|dua vao)\b/.test(text) ? 30 : 0
    if (intent === 'role') score += /\b(chi huy|lanh dao|chu tri|sang lap|quoc cong|tu lenh|quan su|chinh tri|co van|ngoai giao)\b/.test(text) ? 8 : 0
    if (intent === 'place') score += /\b(que o|tai |vung |huyen |tinh |o )\b/.test(text) ? 12 : 0
    if (terms.includes('coc') && /\b(dong |vat |bit |ngam)\b/.test(text)) score += 14
    if (namedPeople.length > 2 || /luoc do|so do|bang tom tat/.test(text)) score -= 20
    if ((quote.match(/[\p{Lu}]{2,}/gu) || []).length >= 6 || (quote.match(/\(/g) || []).length >= 5) score -= 25
    if (/^(hinh |luoc do |so do |bang |\d+[ .])/.test(text)) score -= 10
    if (quote.length > 600) score -= 6
    return { chunk, score, quote: quote.length > 720 ? quote.slice(0, 720).trimEnd() + '…' : quote }
  }).filter(Boolean)
}

export function characterReply(dataset, characterId, message, history = []) {
  return characterRetrieval(dataset, characterId, message, history)?.reply ?? null
}

export const replyBase = (entry) => ({ characterId: entry.profile.id, mode: 'textbook', suggestions: entry.profile.suggestions, relatedLessons: entry.lessons.slice(0, 3).map(({ id, title, grade }) => ({ id, title, grade })) })

// Lexical retrieval for one question. Besides the textbook reply it exposes what the RAG step reuses:
// the intent, the chunks ranked by keyword evidence and the character's searchable scope.
export function characterRetrieval(dataset, characterId, message, history = []) {
  const entry = characterIndex(dataset).find((item) => item.profile.id === characterId)
  if (!entry) return null
  const { profile, related, lessons } = entry
  const q = normalize(message)
  const base = replyBase(entry)
  const scopeChunkIds = related.map(({ chunk }) => chunk.chunk_id)
  const result = (reply, extra = {}) => ({ reply, entry, intent: 'fact', rankedChunkIds: [], scopeChunkIds, previousQuestion: '', ...extra })
  if (/^(xin chao|chao|hello|hi)(\s|$)/.test(q) && tokens(q).length < 7) return result({ ...base, answer: profile.greeting, sources: [], kind: 'greeting' })
  const introduction = /\b(la ai|gioi thieu|tieu su|ve ban|ve ong|ve bac|ve ba)\b/.test(q) || profile.aliases.some((alias) => q === normalize(alias))
  let terms = queryTerms(message, profile)
  const followup = /\b(them|tiep|sau do|khi do|y nghia|vi sao|the nao|o dau|do|nay)\b/.test(q) && terms.length <= 4
  let previousTopic = ''
  let previousQuestion = ''
  if (followup) {
    const previous = [...history].reverse().find((turn) => turn.role === 'user' && queryTerms(turn.content, profile).length > 0)
    if (previous) {
      terms = [...new Set([...terms, ...queryTerms(previous.content, profile)])]
      // Keep the full prior question: stopword filtering drops halves of phrases like "doi do".
      previousTopic = normalize(previous.content)
      previousQuestion = previous.content.slice(0, 500)
    }
  }
  const intro = introduction
  const contextualQuery = `${q} ${previousTopic} ${terms.join(' ')}`
  const phrases = topicPhrases.filter((phrase) => contextualQuery.includes(phrase))
  const intent = /\b(bat dau)\b/.test(q) ? 'start' : /\b(nam nao|khi nao|bao gio|thoi gian)\b/.test(q) ? 'date' : /\b(vi sao|tai sao|y nghia)\b/.test(q) ? 'reason' : /\b(vai tro)\b/.test(q) ? 'role' : /\b(o dau)\b/.test(q) ? 'place' : 'fact'
  let ranked = !intro && !terms.length ? [] : related.flatMap(({ chunk }) => candidates(chunk, terms, profile, intent, phrases, intro))
  // A nearby section can describe the same event without repeating the person's name.
  if (!ranked.length && terms.length > 2 && phrases.length) {
    const ids = new Set(lessons.map((lesson) => lesson.id))
    ranked = dataset.searchableChunks.filter(({ chunk }) => ids.has(lessonId(chunk))).flatMap(({ chunk }) => candidates(chunk, terms, profile, intent, phrases, intro))
  }
  ranked.sort((a, b) => b.score - a.score || a.chunk.chunk_id.localeCompare(b.chunk.chunk_id))
  const reviewed = !intro && reviewedPassage(dataset, characterId, contextualQuery, intent, terms.filter((term) => /^\d{3,4}$/.test(term)))
  const best = reviewed || ranked[0]
  const rankedChunkIds = [...new Set([...(reviewed ? [reviewed.chunk.chunk_id] : []), ...ranked.map(({ chunk }) => chunk.chunk_id)])]
  const extra = { intent, rankedChunkIds, previousQuestion }
  const selected = best ? [{ ...chunkResponse(best.chunk), quote: best.quote }] : []
  if (!selected.length) return result(notFoundReply(entry), extra)
  const { self, Self, address, Address } = voiceOf(profile)
  const answer = `${intro ? `${Self} kể ${address} nghe về mình qua những trang sách giáo khoa nhé:` : `Để ${self} kể ${address} nghe điều sách giáo khoa còn ghi lại:`}\n\n${selected.map((source, index) => `[${index + 1}] “${source.quote}”`).join('\n\n')}\n\n${Address} mở bài học ở phần nguồn để đọc trọn câu chuyện, rồi hỏi ${self} thêm nhé.`
  return result({ ...base, answer, sources: selected, kind: 'grounded' }, extra)
}

export const notFoundReply = (entry) => {
  const { self, Self, address, Address } = voiceOf(entry.profile)
  return { ...replyBase(entry), answer: `${Self} lật mãi mà chưa thấy trang sách giáo khoa nào ghi lại điều ${address} hỏi, nên ${self} không dám kể sai. ${Address} hỏi ${self} về ${entry.profile.topics.join(', ')} hoặc chọn một câu gợi ý bên dưới nhé.`, sources: [], kind: 'not_found' }
}
