import type { HistoryChunk } from './historyApi'

export interface CharacterReply {
  characterId: string
  /** textbook: quoted passage · rag: AI answer grounded in passages · guardrail: request refused before any model call */
  mode: 'textbook' | 'rag' | 'guardrail'
  kind: 'grounded' | 'not_found' | 'greeting' | 'smalltalk' | 'blocked'
  answer: string
  /** Set when the AI quota is used up and the answer falls back to the textbook quote. */
  notice?: string
  sources: (HistoryChunk & { quote: string })[]
  suggestions: string[]
  relatedLessons: { id: string; title: string; grade: number }[]
}
/** The server refused the request for asking too fast; retryAfter is in seconds. */
export class RateLimitError extends Error {
  constructor(readonly retryAfter: number) { super('Bạn đang hỏi hơi nhanh.') }
}
export async function askCharacter(characterId: string, message: string, history: { role: 'user' | 'assistant'; content: string }[], signal: AbortSignal): Promise<CharacterReply> {
  const response = await fetch(`/api/characters/${characterId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message, history }), signal })
  if (response.status === 429) throw new RateLimitError(Math.min(Math.max(Number(response.headers.get('Retry-After')) || 60, 1), 600))
  if (!response.ok) throw new Error(response.status === 503 ? 'Chưa kết nối được kho bài học. Hãy thử lại sau.' : `Chưa gửi được câu hỏi (HTTP ${response.status}).`)
  return response.json() as Promise<CharacterReply>
}
