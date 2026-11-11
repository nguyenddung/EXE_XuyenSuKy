import { browserStorage } from './chatHistory'

/**
 * Study companion (bạn đồng hành) of the learning app: a mascot the student names, one record per owner (account
 * id or 'guest') in localStorage, like the chat history. Sign-in is a browser-only demo, so the record is neither
 * synced across devices nor protected from someone using the same browser profile. Only the animal, its name and
 * dates are stored; never anything about the student.
 */
export interface CompanionSpecies {
  id: string
  /** Shown in sentences: "bạn rùa". */
  label: string
  suggestions: readonly string[]
}

// More animals are added here, each with its drawing in components/CompanionMascot.tsx. A stored record whose
// animal no longer exists falls back to the first one.
export const companionSpecies: readonly CompanionSpecies[] = [
  { id: 'turtle', label: 'rùa', suggestions: ['Rùa Vàng', 'Kim Quy', 'Sử Sử', 'Bông'] },
]
export const speciesOf = (id?: string) => companionSpecies.find((item) => item.id === id) ?? companionSpecies[0]

export interface CompanionState {
  species: string
  name: string
  /** ISO time the companion got its current name. */
  namedAt: string
  /** Vietnam calendar day (YYYY-MM-DD) of the last daily greeting, so it shows once a day. */
  lastGreetDay?: string
}

export const MAX_COMPANION_NAME = 20
export type NameProblem = 'empty' | 'too_long' | 'characters'
export const nameProblemMessage: Record<NameProblem, string> = {
  empty: 'Bạn nhập một cái tên nhé.',
  too_long: `Tên dài tối đa ${MAX_COMPANION_NAME} ký tự.`,
  characters: 'Tên chỉ gồm chữ cái, chữ số và khoảng trắng.',
}

/**
 * Letters (any script, with Vietnamese marks), digits and single spaces, at most 20 characters. The name will
 * later reach the AI prompt as data, so symbols, markup and line breaks are refused here already.
 */
export function cleanCompanionName(raw: string): { name: string } | { problem: NameProblem } {
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (!name) return { problem: 'empty' }
  if ([...name].length > MAX_COMPANION_NAME) return { problem: 'too_long' }
  if (!/^[\p{L}\p{M}\p{N}]+(?: [\p{L}\p{M}\p{N}]+)*$/u.test(name)) return { problem: 'characters' }
  return { name }
}

const KEY_PREFIX = 'xuyen-su-ky-companion-v1'
export const companionKey = (owner: string) => `${KEY_PREFIX}:${encodeURIComponent(owner)}`
const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

/** The owner's companion, or null when there is none yet, the owner is unknown or the record is unreadable. */
export function readCompanion(owner: string | null, storage = browserStorage()): CompanionState | null {
  if (!owner || !storage) return null
  try {
    const value = JSON.parse(storage.getItem(companionKey(owner)) || 'null') as Partial<CompanionState> | null
    if (!value || typeof value !== 'object' || typeof value.name !== 'string') return null
    const cleaned = cleanCompanionName(value.name)
    if ('problem' in cleaned) return null
    return {
      species: speciesOf(value.species).id,
      name: cleaned.name,
      namedAt: typeof value.namedAt === 'string' && !Number.isNaN(Date.parse(value.namedAt)) ? value.namedAt : new Date(0).toISOString(),
      ...(isDay(value.lastGreetDay) ? { lastGreetDay: value.lastGreetDay } : {}),
    }
  } catch { return null }
}

/** False when the browser refuses to store it (or the owner is unknown): the name then lasts until the page closes. */
export function writeCompanion(owner: string | null, state: CompanionState, storage = browserStorage()): boolean {
  if (!owner || !storage) return false
  try { storage.setItem(companionKey(owner), JSON.stringify(state)); return true } catch { return false }
}

export type PartOfDay = 'sáng' | 'trưa' | 'chiều' | 'tối'
export function partOfDay(date = new Date()): PartOfDay {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(date))
  return hour >= 4 && hour < 11 ? 'sáng' : hour >= 11 && hour < 14 ? 'trưa' : hour >= 14 && hour < 18 ? 'chiều' : 'tối'
}

export const greetingFor = (name: string, date = new Date()) => `Chào buổi ${partOfDay(date)}! ${name} đây.`

/** One line about today's goal and streak, from the learning journal (no AI). */
export function studyStatus({ done, goal, streak }: { done: number; goal: number; streak: number }) {
  if (done >= goal) return `Hôm nay bạn đã đạt mục tiêu ${goal} hoạt động rồi. Giỏi quá!`
  if (done > 0) return `Hôm nay bạn đã làm ${done}/${goal} hoạt động, còn ${goal - done} nữa là đạt mục tiêu.`
  if (streak > 0) return `Bạn đang giữ chuỗi ${streak} ngày học. Học một chút để giữ chuỗi nhé!`
  return `Hôm nay mình cùng làm ${goal} hoạt động nhé!`
}

/* Where the companion sits on screen. A device preference rather than personal data, so one value per browser.
   Kept as fractions of the free space, so the companion stays in the same part of the screen after a resize or
   rotation. No stored value: the default corner from the stylesheet. */
export interface Point { left: number; top: number }
export interface Size { width: number; height: number }
export interface Ratio { x: number; y: number }
export const SCREEN_MARGIN = 8
const positionKey = 'xuyen-su-ky-companion-position-v1'
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

/** Keeps the whole companion on screen. */
export const clampPoint = (point: Point, size: Size, view: Size): Point => ({
  left: Math.round(clamp(point.left, SCREEN_MARGIN, view.width - size.width - SCREEN_MARGIN)),
  top: Math.round(clamp(point.top, SCREEN_MARGIN, view.height - size.height - SCREEN_MARGIN)),
})
export function toRatio(point: Point, size: Size, view: Size): Ratio {
  const free = (span: number, own: number) => Math.max(1, span - own - 2 * SCREEN_MARGIN)
  return { x: clamp((point.left - SCREEN_MARGIN) / free(view.width, size.width), 0, 1), y: clamp((point.top - SCREEN_MARGIN) / free(view.height, size.height), 0, 1) }
}
export const fromRatio = (ratio: Ratio, size: Size, view: Size): Point => clampPoint({
  left: SCREEN_MARGIN + ratio.x * (view.width - size.width - 2 * SCREEN_MARGIN),
  top: SCREEN_MARGIN + ratio.y * (view.height - size.height - 2 * SCREEN_MARGIN),
}, size, view)

export function readCompanionPosition(storage = browserStorage()): Ratio | null {
  try {
    const value = JSON.parse(storage?.getItem(positionKey) || 'null') as Partial<Ratio> | null
    if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null
    return { x: clamp(value.x, 0, 1), y: clamp(value.y, 0, 1) }
  } catch { return null }
}
export function writeCompanionPosition(ratio: Ratio | null, storage = browserStorage()) {
  try { if (ratio) storage?.setItem(positionKey, JSON.stringify({ x: Number(ratio.x.toFixed(4)), y: Number(ratio.y.toFixed(4)) })); else storage?.removeItem(positionKey) } catch { /* The position then lasts until the page closes. */ }
}

/**
 * Where a bubble or panel of the given width opens next to the companion: on the side with more room vertically,
 * aligned with the companion's nearer screen edge, never past the screen.
 */
export function floatingPlacement(anchor: Point & Size, view: Size, width: number, gap = 14) {
  const roomAbove = anchor.top - gap - SCREEN_MARGIN
  const roomBelow = view.height - anchor.top - anchor.height - gap - SCREEN_MARGIN
  const rightHalf = anchor.left + anchor.width / 2 > view.width / 2
  const left = Math.round(clamp(rightHalf ? anchor.left + anchor.width - width : anchor.left, SCREEN_MARGIN, view.width - width - SCREEN_MARGIN))
  return roomAbove >= roomBelow
    ? { side: 'above' as const, left, bottom: Math.round(view.height - anchor.top + gap), maxHeight: Math.max(0, Math.round(roomAbove)) }
    : { side: 'below' as const, left, top: Math.round(anchor.top + anchor.height + gap), maxHeight: Math.max(0, Math.round(roomBelow)) }
}

/* Signing in opens the companion once, ready to chat: login() leaves a mark for this tab and the companion takes
   it away the first time it appears. A remembered sign-in or a reload therefore does not open it again. */
const signedInKey = 'xuyen-su-ky-companion-signed-in'
export function markSignedIn() { try { sessionStorage.setItem(signedInKey, '1') } catch { /* The companion then stays closed. */ } }
/** Read without side effects (React may run state initialisers twice); clearSignedIn() takes the mark away. */
export function signedInPending() { try { return sessionStorage.getItem(signedInKey) === '1' } catch { return false } }
export function clearSignedIn() { try { sessionStorage.removeItem(signedInKey) } catch { /* Nothing to clear. */ } }

/* The conversation, one record per owner like the name. Only text, sources and buttons are kept, never audio,
   errors or loading state. */
export interface CompanionAction { label: string; view?: string; lessonId?: string }
export interface CompanionSource { lessonId: string | null; lessonTitle: string; grade: number; book: string; pageStart: number; pageEnd: number }
export interface CompanionMessage {
  id: string
  role: 'user' | 'companion'
  text: string
  /** Epoch milliseconds. */
  at: number
  sources?: CompanionSource[]
  action?: CompanionAction
  notice?: string
}
export const MAX_COMPANION_MESSAGES = 40
export const companionViews = ['dashboard', 'library', 'journey', 'timeline', 'characters', 'challenges', 'progress']
const chatPrefix = 'xuyen-su-ky-companion-chat-v1'
export const conversationKey = (owner: string) => `${chatPrefix}:${encodeURIComponent(owner)}`
const lessonPattern = /^LS\d{1,2}_B\d{2}$/
const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : null

function cleanAction(value: unknown): CompanionAction | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { label, view, lessonId } = value as Record<string, unknown>
  const name = text(label, 60)
  if (!name) return undefined
  if (typeof view === 'string' && companionViews.includes(view)) return { label: name, view }
  if (typeof lessonId === 'string' && lessonPattern.test(lessonId)) return { label: name, lessonId }
  return undefined
}
function cleanSource(value: unknown): CompanionSource | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const lessonTitle = text(item.lessonTitle, 300), book = text(item.book, 300)
  if (!lessonTitle || !book || !Number.isInteger(item.grade) || !Number.isFinite(item.pageStart) || !Number.isFinite(item.pageEnd)) return null
  return { lessonId: typeof item.lessonId === 'string' && lessonPattern.test(item.lessonId) ? item.lessonId : null, lessonTitle, grade: item.grade as number, book, pageStart: item.pageStart as number, pageEnd: item.pageEnd as number }
}
function cleanMessage(value: unknown): CompanionMessage | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const body = text(item.text, 4000), id = text(item.id, 80)
  if (!body || !id || (item.role !== 'user' && item.role !== 'companion') || typeof item.at !== 'number' || !Number.isFinite(item.at)) return null
  const sources = Array.isArray(item.sources) ? item.sources.map(cleanSource).filter((source): source is CompanionSource => source !== null).slice(0, 5) : []
  const action = cleanAction(item.action)
  const notice = text(item.notice, 300)
  return { id, role: item.role, text: body, at: item.at, ...(sources.length ? { sources } : {}), ...(action ? { action } : {}), ...(notice ? { notice } : {}) }
}

export function readConversation(owner: string | null, storage = browserStorage()): CompanionMessage[] {
  if (!owner || !storage) return []
  try {
    const value = JSON.parse(storage.getItem(conversationKey(owner)) || '[]')
    return Array.isArray(value) ? value.map(cleanMessage).filter((message): message is CompanionMessage => message !== null).slice(-MAX_COMPANION_MESSAGES) : []
  } catch { return [] }
}
export function writeConversation(owner: string | null, messages: CompanionMessage[], storage = browserStorage()): boolean {
  if (!owner || !storage) return false
  try {
    if (messages.length) storage.setItem(conversationKey(owner), JSON.stringify(messages.slice(-MAX_COMPANION_MESSAGES)))
    else storage.removeItem(conversationKey(owner))
    return true
  } catch { return false }
}

/** What the student has done so far, from this browser only; it never leaves the page. */
export interface StudyStats {
  done: number
  goal: number
  streak: number
  readCount: number
  xp: number
  /** The lesson left half-read, if any. */
  resume?: { lessonId: string; title: string }
}

/**
 * Questions about the student's own progress are answered here, from the browser's data: no request, no model,
 * and nothing personal sent anywhere.
 */
export function localAnswer(question: string, stats: StudyStats): { text: string; action?: CompanionAction } | null {
  const q = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
  if (/\b(hom nay|bay gio|tiep theo)\b.*\b(hoc gi|nen hoc|lam gi)\b|\b(hoc gi tiep|nen hoc gi|bat dau tu dau hom nay)\b/.test(q)) {
    const goal = stats.done >= stats.goal ? `Bạn đã đạt mục tiêu ${stats.goal} hoạt động hôm nay rồi, học thêm là để vui thôi!` : `Hôm nay bạn đã làm ${stats.done}/${stats.goal} hoạt động.`
    if (stats.resume) return { text: `${goal} Bạn đang đọc dở bài "${stats.resume.title}", đọc tiếp từ chỗ cũ nhé.`, action: { label: 'Đọc tiếp bài này', lessonId: stats.resume.lessonId } }
    return { text: `${goal} Mình gợi ý làm một nhiệm vụ trong Hành trình: vừa học vừa nhận XP.`, action: { label: 'Mở Hành trình', view: 'journey' } }
  }
  if (/\b(tien do|da hoc (duoc )?(bao nhieu|may)|bao nhieu bai|may bai|xp cua (minh|toi|em|to)|bao nhieu xp|chuoi (ngay )?hoc cua|minh hoc duoc)\b/.test(q)) {
    return { text: `Trên trình duyệt này, bạn đã đọc xong ${stats.readCount} bài, có ${stats.xp} XP và đang giữ chuỗi ${stats.streak} ngày học. Hôm nay bạn đã làm ${stats.done}/${stats.goal} hoạt động.`, action: { label: 'Xem Bảng xếp hạng', view: 'progress' } }
  }
  return null
}

export const companionSuggestions = ['Xuyên Sử Ký có những gì?', 'Hôm nay mình nên học gì?', 'Mẹo nhớ mốc năm lịch sử', 'Hành trình là gì?']
