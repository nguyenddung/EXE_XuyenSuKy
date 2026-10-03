import { ArrowUpRight, MessageCircle } from 'lucide-react'
import type { Character } from '../types'

interface Props { character: Character; onChat: (character: Character) => void }

export function CharacterCard({ character, onChat }: Props) {
  return <article className="character-card">
    <div className={`portrait portrait-${character.tone}`}>
      <img className="character-photo" src={character.image} alt={`Minh họa hoạt hình ${character.name}`} loading="lazy" width="1024" height="1536" />
      <span className="photo-type">MINH HỌA NHÂN VẬT</span>
      <span className="portrait-seal">{character.avatar}</span>
    </div>
    <div className="character-content"><span className="character-period">{character.period}</span><h3>{character.name}</h3><p>{character.description}</p><div className="character-topics">{character.topics.map((topic) => <span key={topic}>{topic}</span>)}</div><small className="character-coverage">Có trong {character.lessonCount} bài · Lớp {character.grades.join(', ')}</small><button type="button" onClick={() => onChat(character)} className="character-action"><span><MessageCircle size={16} /> Bắt đầu trò chuyện</span><ArrowUpRight size={17} /></button></div>
  </article>
}
