import { MessageCircle, Mic } from 'lucide-react'
import type { Character, CharacterInteractionMode } from '../types'
import { hasAnimatedCharacter } from '../lib/animatedCharacters'

interface Props { character: Character; onChat: (character: Character, mode?: CharacterInteractionMode) => void }

export function CharacterCard({ character, onChat }: Props) {
  return <article className="character-card">
    <div className={`portrait portrait-${character.tone}`}>
      <img className="character-photo" src={character.image} alt={`Minh họa hoạt hình ${character.name}`} loading="lazy" width="1024" height="1536" />
      <span className={`photo-type${hasAnimatedCharacter(character.id) ? ' photo-type--animated' : ''}`}>{hasAnimatedCharacter(character.id) ? 'HOẠT HÌNH 2D · TƯƠNG TÁC' : 'MINH HỌA NHÂN VẬT'}</span>
      <span className="portrait-seal">{character.avatar}</span>
    </div>
    <div className="character-content"><span className="character-period">{character.period}</span><h3>{character.name}</h3><p>{character.description}</p><div className="character-topics">{character.topics.map((topic) => <span key={topic}>{topic}</span>)}</div><small className="character-coverage">Có trong {character.lessonCount} bài · Lớp {character.grades.join(', ')}</small><div className="character-entry-actions"><button type="button" onClick={() => onChat(character, 'chat')} className="character-action"><MessageCircle size={16} /> Nhắn tin</button><button type="button" onClick={() => onChat(character, 'voice')} className="character-action character-action--voice"><Mic size={16} /> Nói chuyện</button></div></div>
  </article>
}
