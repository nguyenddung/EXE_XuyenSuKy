import type { HistoryChunk } from './historyApi'
import { RateLimitError } from './characterApi'

/** What POST /api/companion/chat answers (server/companion.mjs). */
export interface CompanionReply {
  /** app: how Xuyên Sử Ký works · history: from the textbook · study: study tips · others: templates. */
  kind: 'app' | 'history' | 'study' | 'off_topic' | 'blocked' | 'smalltalk' | 'fallback'
  /** guide: the app guide as written · ai: a model answer · textbook: a cited quote · template: a fixed answer. */
  mode: 'guide' | 'ai' | 'textbook' | 'template'
  answer: string
  sources: (HistoryChunk & { quote: string })[]
  /** A section of /home the answer points to. */
  action?: { label: string; view: string }
  notice?: string
}

export interface CompanionQuestion {
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
  name: string
  grade?: number
  /** The lesson the student read last, read first by the companion. */
  lessonId?: string
}

export async function askCompanion(question: CompanionQuestion, signal: AbortSignal): Promise<CompanionReply> {
  const response = await fetch('/api/companion/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(question), signal })
  if (response.status === 429) throw new RateLimitError(Math.min(Math.max(Number(response.headers.get('Retry-After')) || 60, 1), 600))
  if (!response.ok) throw new Error(response.status === 503 ? 'Mình chưa kết nối được kho bài học. Bạn thử lại sau nhé.' : `Mình chưa gửi được câu hỏi (HTTP ${response.status}).`)
  return response.json() as Promise<CompanionReply>
}
