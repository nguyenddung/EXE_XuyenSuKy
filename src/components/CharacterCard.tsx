import { ArrowUpRight, MessageCircle } from 'lucide-react'
import type { Character } from '../types'

interface Props { character: Character; onChat: (character: Character) => void }

export function CharacterCard({ character, onChat }: Props) {
  return <article className="character-card">
    <div className={`portrait portrait-${character.tone}`}>
      <img className="character-photo" src={`/images/characters/${character.id}.webp`} alt={`Minh họa hoạt hình ${character.name}`} loading="lazy" width="1024" height="1536" />
      <span className="photo-type">MINH HỌA NHÂN VẬT</span>
      <span className="portrait-seal">{character.avatar}</span>
    </div>
    <div className="character-content"><span className="character-period">{character.period}</span><h3>{character.name}</h3><p>{character.description}</p><button type="button" onClick={() => onChat(character)} className="character-action"><span><MessageCircle size={16} /> Bắt đầu trò chuyện</span><ArrowUpRight size={17} /></button></div>
  </article>
}
