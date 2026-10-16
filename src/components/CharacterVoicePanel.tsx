import type { ReactNode } from 'react'
import type { Character } from '../types'
import { hasAnimatedCharacter, type CharacterActivity } from '../lib/animatedCharacters'
import { CharacterStage } from './CharacterStage'

interface Props { character: Character; activity: CharacterActivity; studentSpeaking: boolean; children: ReactNode }

export function CharacterVoicePanel({ character, activity, studentSpeaking, children }: Props) {
  return <div className="voice-scene">
    {hasAnimatedCharacter(character.id) ? <CharacterStage character={character} activity={activity} studentSpeaking={studentSpeaking} /> : <aside className="character-stage character-stage--static" aria-label={`Chân dung ${character.name}`}>
      <div className="stage-landscape" aria-hidden="true" style={{ backgroundImage: `url("${character.image}")` }} />
      <div className="stage-portrait-wrap"><img src={character.image} alt={`Minh họa ${character.name}`} /></div>
      <div className="stage-caption"><span>{character.period}</span><strong>{character.name}</strong><p>{activity === 'speaking' ? 'Đang nói cùng em' : activity === 'listening' ? 'Đang lắng nghe em' : 'Sẵn sàng trò chuyện'}</p></div>
      <span className="stage-disclaimer">Nhân vật minh họa · Giọng nói mô phỏng</span>
    </aside>}
    <section className="voice-caption" aria-label="Lời nhân vật">{children}</section>
  </div>
}
