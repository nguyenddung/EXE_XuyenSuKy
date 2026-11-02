// Each AI character only knows the world up to the year they died (`died` in shared/characters.json).
// A question naming a person, dynasty, event, organization, place name or invention that appeared later
// (data/enrichment/timeline.json), or a later year or century, gets an in-character answer instead of
// textbook passages, and points the student to a character who lived at that time.

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']
const romanValue = (text) => roman.findIndex((value) => value.toLowerCase() === text)
export const centuryOf = (year) => Math.ceil(year / 100)
const romanOf = (century) => roman[century] || String(century)
/** "thế kỷ XIII", or "thế kỷ XI – XII" for a life across two centuries. */
export const centuryLabel = (died, born) => Number.isInteger(born) && centuryOf(born) !== centuryOf(died) ? `thế kỷ ${romanOf(centuryOf(born))} – ${romanOf(centuryOf(died))}` : `thế kỷ ${romanOf(centuryOf(died))}`

/** Normalised terms, longest first, each pointing at its timeline entry and the spelling to show. */
export function buildTimeline(entries, normalize) {
  const terms = entries.flatMap((entry) => entry.terms.map((display) => ({ term: normalize(display), display, entry })))
  return { entries, terms: terms.sort((a, b) => b.term.length - a.term.length || a.term.localeCompare(b.term)) }
}

const boundary = (text, start, end) => (start === 0 || !/[a-z0-9]/.test(text[start - 1])) && (end === text.length || !/[a-z0-9]/.test(text[end]))

/** Names of the timeline found in a normalised question, longest first and never overlapping, in reading order. */
export function timelineMentions(question, timeline) {
  const found = []
  for (const item of timeline?.terms || []) {
    for (let start = question.indexOf(item.term); start >= 0; start = question.indexOf(item.term, start + 1)) {
      const end = start + item.term.length
      if (boundary(question, start, end) && !found.some((other) => start < other.end && end > other.start)) found.push({ ...item, start, end })
    }
  }
  return found.sort((a, b) => a.start - b.start)
}

/**
 * The first thing in the question that the character could not know, or null.
 * `question` is already normalised (lower case, no diacritics).
 */
export function findAnachronism(question, profile, timeline) {
  if (!Number.isInteger(profile?.died)) return null
  const later = []
  for (const mention of timelineMentions(question, timeline)) {
    if (mention.entry.from > profile.died && mention.entry.id !== profile.id) later.push({ type: 'entry', start: mention.start, from: mention.entry.from, entry: mention.entry, display: mention.display })
  }
  // "năm 1945" (not "năm 179 TCN"), "thế kỷ XX" / "thế kỉ 20".
  for (const match of question.matchAll(/\bnam (\d{2,4})\b(?!\s*(tcn|truoc cong nguyen))/g)) {
    const year = Number(match[1])
    if (year > profile.died && year <= 2100) later.push({ type: 'year', start: match.index, from: year, display: `năm ${year}` })
  }
  for (const match of question.matchAll(/\bthe k[yi] ([ivx]+|\d{1,2})\b/g)) {
    const century = /^\d+$/.test(match[1]) ? Number(match[1]) : romanValue(match[1])
    const from = (century - 1) * 100 + 1
    if (century >= 1 && century <= 21 && from > profile.died) later.push({ type: 'century', start: match.index, from, display: `thế kỷ ${roman[century]}` })
  }
  return later.sort((a, b) => a.start - b.start)[0] || null
}

// Person and invention sentences carry their own subject ("người ấy", "thứ ấy"); the others name it here.
const defaultWhen = { person: 'sinh năm', dynasty: 'triều đại ấy bắt đầu từ năm', event: 'sự kiện ấy diễn ra năm', organization: 'tổ chức ấy ra đời năm', place: 'tên ấy có từ năm', invention: 'ra đời năm' }

/**
 * The character who lived when the thing happened: the timeline's `ask`, else a character alive that year.
 * Inventions get no suggestion: no history character fits "the smartphone".
 */
export function redirectFor(found, profile, profiles, timeline) {
  if (found.type === 'entry' && found.entry.kind === 'invention') return null
  const born = (id) => timeline?.entries.find((entry) => entry.id === id)?.from
  const asked = found.type === 'entry' && found.entry.ask ? profiles.find((item) => item.id === found.entry.ask) : null
  const alive = profiles.find((item) => item.id !== profile.id && Number.isInteger(born(item.id)) && born(item.id) <= found.from && found.from <= item.died)
  const target = asked && asked.id !== profile.id ? asked : alive
  return target ? { characterId: target.id, name: target.name } : null
}

/** The in-character answer, in the character's own voice. `born` comes from the character's timeline entry. */
export function anachronismAnswer(found, profile, voice, redirect, born) {
  const { self, Self, address, Address } = voice
  const gap = found.from - profile.died
  const life = `${Self} sống vào ${centuryLabel(profile.died, born)} và đã mất năm ${profile.died}`
  let known
  if (found.type === 'entry') {
    const { entry, display } = found
    const when = entry.when || `${defaultWhen[entry.kind]} ${entry.from}`
    known = entry.kind === 'person' ? `${self} không thể biết ${display} là ai: người ấy ${when}, ${gap} năm sau thời của ${self}.`
      : entry.kind === 'invention' ? `${self} chưa từng thấy ${display} bao giờ: thứ ấy ${when}, ${gap} năm sau thời của ${self}.`
      : `${self} không thể biết về ${display}: ${when}, ${gap} năm sau thời của ${self}.`
  } else known = `${self} không thể biết chuyện ${found.display}: đó là ${gap} năm sau thời của ${self}.`
  const next = redirect ? (found.type === 'entry' && found.entry.id === redirect.characterId ? ` ${Address} hãy trò chuyện trực tiếp với ${redirect.name} nhé.` : ` Muốn biết chuyện ấy, ${address} hãy trò chuyện với ${redirect.name} nhé.`)
    : found.type === 'entry' && found.entry.kind === 'invention' ? ` ${Address} kể cho ${self} nghe ${found.display} là gì được không?`
    : ` ${Address} hỏi ${self} về những chuyện thời của ${self} nhé.`
  return `${life}, nên ${known}${next}`
}
