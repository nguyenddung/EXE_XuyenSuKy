import type { HistorySource } from './historyApi'
import type { CharacterReply } from './characterApi'

/**
 * Local chat history for the demo accounts. Sign-in here is a browser-only demo, so conversations live in
 * localStorage, one record per (owner, character): they are neither synced across devices nor protected from
 * someone using the same browser profile. Only text is stored; audio, API keys and loading/error state never are.
 */
export const CHAT_HISTORY_VERSION = 1
export const MAX_STORED_EXCHANGES = 40
const KEY_PREFIX = 'xuyen-su-ky-chat-v1'
const MAX_QUESTION = 1000
const MAX_ANSWER = 4000
const MAX_NOTICE = 500
const MAX_TITLE = 300
const MAX_QUOTE = 600
const MAX_SOURCES = 5
const MODES = ['textbook', 'rag', 'guardrail']
const KINDS = ['grounded', 'not_found', 'greeting', 'smalltalk', 'blocked']

export interface ChatSource { id: string; lessonId: string; lessonTitle: string; source: HistorySource; quote?: string }
export interface ChatReply { mode: CharacterReply['mode']; kind?: CharacterReply['kind']; answer: string; notice?: string; sources: ChatSource[] }
export interface ChatExchange {
  id: string
  question: string
  /** Epoch milliseconds when the question was sent. */
  askedAt: number
  reply?: ChatReply
  answeredAt?: number
  /** Transient UI state; never persisted. */
  error?: string
  rateLimited?: boolean
}
export type StoredExchange = ChatExchange & { reply: ChatReply; answeredAt: number }

export type LoadStatus = 'empty' | 'restored' | 'discarded'
export interface LoadResult { exchanges: StoredExchange[]; status: LoadStatus }
export type SaveStatus = 'saved' | 'trimmed' | 'failed'

export const newExchangeId = () => {
  try { if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID() } catch { /* Fall back below on insecure origins. */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** localStorage can be missing or throw on access (blocked site data, private windows); callers must cope with null. */
export function browserStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

export const storageKey = (owner: string, characterId: string) => `${KEY_PREFIX}:${encodeURIComponent(owner)}:${encodeURIComponent(characterId)}`

const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : null
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null

function cleanSource(value: unknown): ChatSource | null {
  if (!isRecord(value) || !isRecord(value.source)) return null
  const origin = value.source
  const id = text(value.id, MAX_TITLE), lessonId = text(value.lessonId, MAX_TITLE), lessonTitle = text(value.lessonTitle, MAX_TITLE)
  const book = text(origin.book, MAX_TITLE), bookSeries = text(origin.bookSeries, MAX_TITLE), publisher = text(origin.publisher, MAX_TITLE), sourcePdf = text(origin.sourcePdf, MAX_TITLE)
  const pageStart = count(origin.pageStart), pageEnd = count(origin.pageEnd)
  if (id === null || lessonId === null || lessonTitle === null || book === null || bookSeries === null || publisher === null || sourcePdf === null || pageStart === null || pageEnd === null) return null
  const quote = text(value.quote, MAX_QUOTE)
  return { id, lessonId, lessonTitle, source: { book, bookSeries, publisher, sourcePdf, pageStart, pageEnd, pageKind: 'pdf' }, ...(quote ? { quote } : {}) }
}

function cleanReply(value: unknown): ChatReply | null {
  if (!isRecord(value)) return null
  const answer = text(value.answer, MAX_ANSWER)
  if (!answer || typeof value.mode !== 'string' || !MODES.includes(value.mode)) return null
  const notice = text(value.notice, MAX_NOTICE)
  const sources = Array.isArray(value.sources) ? value.sources.map(cleanSource).filter((source): source is ChatSource => source !== null).slice(0, MAX_SOURCES) : []
  return {
    mode: value.mode as ChatReply['mode'],
    ...(typeof value.kind === 'string' && KINDS.includes(value.kind) ? { kind: value.kind as ChatReply['kind'] } : {}),
    answer,
    ...(notice ? { notice } : {}),
    sources,
  }
}

/** Keeps only what is allowed on disk; returns null for exchanges that were never answered. */
function cleanExchange(value: unknown): StoredExchange | null {
  if (!isRecord(value)) return null
  const question = text(value.question, MAX_QUESTION)
  const reply = cleanReply(value.reply)
  if (!question?.trim() || !reply) return null
  const askedAt = count(value.askedAt) ?? 0
  return { id: typeof value.id === 'string' && value.id ? value.id.slice(0, 80) : newExchangeId(), question, askedAt, reply, answeredAt: count(value.answeredAt) ?? askedAt }
}

/** Compact reply stored in memory and on disk: drops the full passage text the server sends with each source. */
export function toChatReply(reply: CharacterReply): ChatReply {
  return cleanReply(reply) ?? { mode: 'textbook', answer: String(reply.answer ?? '').slice(0, MAX_ANSWER), sources: [] }
}

/** Answered exchanges only, newest MAX_STORED_EXCHANGES, in sanitised form. Pending and failed questions are dropped. */
export function persistable(exchanges: ChatExchange[]): StoredExchange[] {
  return exchanges.map(cleanExchange).filter((exchange): exchange is StoredExchange => exchange !== null).slice(-MAX_STORED_EXCHANGES)
}

/** Upgrades older records one version at a time. Version 1 is the first release, so there is nothing older to upgrade yet. */
const migrations: Record<number, (record: Record<string, unknown>) => Record<string, unknown>> = {}

function parse(raw: string, owner: string, characterId: string): StoredExchange[] | null {
  let record: unknown
  try { record = JSON.parse(raw) } catch { return null }
  if (!isRecord(record)) return null
  while (typeof record.version === 'number' && Number.isInteger(record.version) && record.version < CHAT_HISTORY_VERSION) {
    const upgrade: ((value: Record<string, unknown>) => Record<string, unknown>) | undefined = migrations[record.version]
    if (!upgrade) return null
    try { record = upgrade(record as Record<string, unknown>) } catch { return null }
    if (!isRecord(record)) return null
  }
  // A record filed under another owner or character (tampering, copied keys) must never be shown here.
  if (record.version !== CHAT_HISTORY_VERSION || record.owner !== owner || record.characterId !== characterId || !Array.isArray(record.exchanges)) return null
  return persistable(record.exchanges as ChatExchange[])
}

export function loadHistory(owner: string, characterId: string, storage: Storage | null = browserStorage()): LoadResult {
  if (!storage) return { exchanges: [], status: 'empty' }
  const key = storageKey(owner, characterId)
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { exchanges: [], status: 'empty' } }
  if (raw === null) return { exchanges: [], status: 'empty' }
  const exchanges = parse(raw, owner, characterId)
  // Reading has no side effects (React may render twice); the caller removes a 'discarded' record with clearHistory.
  if (exchanges === null) return { exchanges: [], status: 'discarded' }
  return { exchanges, status: exchanges.length ? 'restored' : 'empty' }
}

/** Removes only this owner's conversation with this character. Returns false when storage refused. */
export function clearHistory(owner: string, characterId: string, storage: Storage | null = browserStorage()): boolean {
  if (!storage) return false
  try { storage.removeItem(storageKey(owner, characterId)); return true } catch { return false }
}

/**
 * Writes the answered exchanges. When the browser reports a full quota the oldest turns are dropped until the record
 * fits; if even a single turn cannot be stored the stale record is removed and 'failed' is returned. The caller keeps
 * chatting from memory in every case.
 */
export function saveHistory(owner: string, characterId: string, exchanges: ChatExchange[], storage: Storage | null = browserStorage(), now: () => number = Date.now): SaveStatus {
  if (!storage) return 'failed'
  const key = storageKey(owner, characterId)
  let kept = persistable(exchanges)
  if (!kept.length) return clearHistory(owner, characterId, storage) ? 'saved' : 'failed'
  const total = kept.length
  while (kept.length) {
    try {
      storage.setItem(key, JSON.stringify({ version: CHAT_HISTORY_VERSION, owner, characterId, updatedAt: now(), exchanges: kept }))
      return kept.length < total ? 'trimmed' : 'saved'
    } catch {
      kept = kept.length === 1 ? [] : kept.slice(Math.ceil(kept.length / 2))
    }
  }
  // A stale record would resurrect an older conversation on reload, so remove it rather than leave it behind.
  clearHistory(owner, characterId, storage)
  return 'failed'
}

/** Context sent to the API: the last three answered exchanges, unchanged from before history was persisted. */
export function apiContext(exchanges: ChatExchange[]) {
  return exchanges.filter((exchange) => exchange.reply).slice(-3).flatMap((exchange) => [{ role: 'user' as const, content: exchange.question }, { role: 'assistant' as const, content: exchange.reply!.answer.slice(0, 2000) }])
}
