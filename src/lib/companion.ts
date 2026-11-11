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
  image: string
  suggestions: readonly string[]
}

// More animals are added here. A stored record whose animal no longer exists falls back to the first one.
export const companionSpecies: readonly CompanionSpecies[] = [
  { id: 'turtle', label: 'rùa', image: '/images/brand/xuyen-su-ky-mascot-brand-avatar.svg', suggestions: ['Rùa Vàng', 'Kim Quy', 'Sử Sử', 'Bông'] },
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
