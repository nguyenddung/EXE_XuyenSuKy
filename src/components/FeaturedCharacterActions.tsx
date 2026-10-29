import { MessageCircle, Mic } from 'lucide-react'
import type { Character, CharacterInteractionMode } from '../types'

interface Props { character: Character | null; onChat: (character: Character, mode?: CharacterInteractionMode) => void }

export function FeaturedCharacterActions({ character, onChat }: Props) {
  return <div className="featured-conversation" role="group" aria-label={`Trò chuyện với ${character?.name || 'nhân vật nổi bật'}`}>
    <div className="featured-conversation-actions">
      <button type="button" disabled={!character} onClick={() => character && onChat(character, 'chat')}><MessageCircle size={17} /> Nhắn tin</button>
      <button type="button" disabled={!character} className="featured-voice-action" onClick={() => character && onChat(character, 'voice')}><Mic size={17} /> Nói chuyện</button>
    </div>
    <p>Gõ câu hỏi hoặc trò chuyện bằng giọng nói.</p>
  </div>
}
