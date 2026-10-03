import type { HistoryChunk } from './historyApi'

export interface CharacterReply {
  characterId: string
  mode: 'textbook'
  kind: 'grounded' | 'not_found' | 'greeting'
  answer: string
  sources: (HistoryChunk & { quote: string })[]
  suggestions: string[]
  relatedLessons: { id: string; title: string; grade: number }[]
}
export async function askCharacter(characterId: string, message: string, history: { role: 'user' | 'assistant'; content: string }[], signal: AbortSignal): Promise<CharacterReply> {
  const response = await fetch(`/api/characters/${characterId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message, history }), signal })
  if (!response.ok) throw new Error(response.status === 503 ? 'Chưa kết nối được kho bài học. Hãy thử lại sau.' : `Chưa gửi được câu hỏi (HTTP ${response.status}).`)
  return response.json() as Promise<CharacterReply>
}
