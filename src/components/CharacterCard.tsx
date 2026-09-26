import { ArrowUpRight, MessageCircle } from 'lucide-react'
import type { Character } from '../types'

interface Props { character: Character; onChat: (character: Character) => void }

export function CharacterCard({ character, onChat }: Props) {
  return <article className="character-card">
    <div className={`portrait portrait-${character.tone}`} aria-hidden="true">
      <div className="portrait-sun" /><div className="portrait-arch" />
      {character.id === 'hai-ba-trung' ? <svg className="portrait-person" viewBox="0 0 210 170" aria-hidden="true"><path d="M7 170c2-34 23-55 57-55s56 21 59 55Z" fill="#734e65"/><path d="M87 170c2-37 25-59 59-59s57 22 59 59Z" fill="#4c586e"/><path d="M40 91c0-29 8-48 25-48s26 19 26 48c0 26-11 41-26 41S40 117 40 91Z" fill="#e8b88a"/><path d="M118 88c0-29 9-49 27-49s28 20 28 49c0 26-12 42-28 42s-27-16-27-42Z" fill="#e6b188"/><path d="M36 101c-11-47 0-71 29-71 24 0 36 22 29 68l-11-31-16-13-20 13Z" fill="#263b47"/><path d="M111 100c-9-48 3-73 34-73 26 0 39 25 31 72l-12-33-20-12-22 14Z" fill="#283a47"/><path d="M51 91h4m20 0h4m55-2h4m19 0h4" stroke="#5c423e" strokeWidth="3" strokeLinecap="round"/></svg> : <svg className="portrait-person" viewBox="0 0 210 170" aria-hidden="true"><path d="M27 170c2-35 31-56 78-56s76 21 78 56Z" fill="#214a50"/><path d="M65 170c4-26 16-39 40-39s36 13 40 39Z" fill="#c69a61"/><path d="M76 100c0-33 10-51 29-51s29 18 29 51c0 23-12 40-29 40s-29-17-29-40Z" fill="#e8b88a"/><path d="M72 83c0-32 12-51 33-51s33 19 33 51l-14-16-20 8-20-8Z" fill="#243f45"/><path d="M68 60h74l-9-18H77Z" fill="#1c3f44"/><path d="M82 39h46l-6-26H88Z" fill="#1c3f44"/><path d="M96 22h18" stroke="#dba65e" strokeWidth="5" strokeLinecap="round"/><path d="M90 96h5m20 0h5" stroke="#523e35" strokeWidth="3" strokeLinecap="round"/><path d="M96 116c6 5 12 5 18 0" fill="none" stroke="#a66d57" strokeWidth="2" strokeLinecap="round"/></svg>}
      <span className="portrait-seal">{character.avatar}</span>
    </div>
    <div className="character-content"><span className="character-period">{character.period}</span><h3>{character.name}</h3><p>{character.description}</p><button type="button" onClick={() => onChat(character)} className="character-action"><span><MessageCircle size={16} /> Trò chuyện</span><ArrowUpRight size={17} /></button></div>
  </article>
}
