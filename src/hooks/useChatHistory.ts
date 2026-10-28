import { useCallback, useEffect, useState } from 'react'
import { clearHistory, loadHistory, persistable, saveHistory, type ChatExchange, type LoadStatus, type SaveStatus } from '../lib/chatHistory'

export interface ChatHistoryNotice { restored: boolean; discarded: boolean; save: SaveStatus | 'unavailable' | null }

interface State { owner: string | null; characterId: string; generation: number; messages: ChatExchange[]; loaded: LoadStatus; save: ChatHistoryNotice['save']; saved: string }

const init = (owner: string | null, characterId: string, generation: number): State => {
  const result = owner ? loadHistory(owner, characterId) : { exchanges: [], status: 'empty' as const }
  return { owner, characterId, generation, messages: result.exchanges, loaded: result.status, save: owner ? null : 'unavailable', saved: JSON.stringify(result.exchanges) }
}
const scopeOf = (owner: string | null, characterId: string) => `${owner ?? ''}\u0000${characterId}`

/**
 * Conversation of one owner with one character, restored from and saved to localStorage.
 * `owner` is a stable account id ('guest' for guests) or null when the identity is unknown, in which case the chat works but is not stored.
 *
 * Every state change is addressed with the `token` that was current when the request began. A reply that arrives after the
 * owner, the character or the conversation (reset) has changed carries an outdated token and is ignored, so it can never be
 * written into someone else's history.
 */
export function useChatHistory(owner: string | null, characterId: string) {
  const [state, setState] = useState<State>(() => init(owner, characterId, 0))
  let current = state
  // Derive state during render when the scope changes so an old conversation can never be saved under the new scope.
  if (scopeOf(state.owner, state.characterId) !== scopeOf(owner, characterId)) {
    current = init(owner, characterId, state.generation + 1)
    setState(current)
  }
  const token = `${scopeOf(current.owner, current.characterId)}#${current.generation}`

  const update = useCallback((forToken: string, change: (previous: ChatExchange[]) => ChatExchange[]) => {
    setState((previous) => `${scopeOf(previous.owner, previous.characterId)}#${previous.generation}` === forToken ? { ...previous, messages: change(previous.messages) } : previous)
  }, [])

  // Unreadable or unsupported data would be rediscovered on every open; remove it once so the next chat starts clean.
  useEffect(() => { if (state.loaded === 'discarded' && state.owner) clearHistory(state.owner, state.characterId) }, [state.loaded, state.owner, state.characterId])

  // Persist answered exchanges after every change; unchanged content (pending questions, errors, loading) is not rewritten.
  useEffect(() => {
    if (!state.owner) return
    const durable = persistable(state.messages)
    const signature = JSON.stringify(durable)
    if (signature === state.saved) return
    const status = saveHistory(state.owner, state.characterId, durable)
    setState((previous) => previous === state ? { ...previous, saved: signature, save: status } : previous)
  }, [state])

  /** Starts a new conversation with this character only: deletes its stored record and invalidates in-flight replies. */
  const clear = useCallback(() => {
    const ok = owner ? clearHistory(owner, characterId) : true
    setState((previous) => ({ ...previous, generation: previous.generation + 1, messages: [], loaded: 'empty', save: owner ? (ok ? null : 'failed') : 'unavailable', saved: '[]' }))
  }, [owner, characterId])

  const notice: ChatHistoryNotice = { restored: current.loaded === 'restored' && current.messages.length > 0, discarded: current.loaded === 'discarded' && current.messages.length === 0, save: current.save }
  return { messages: current.messages, token, update, clear, notice }
}
