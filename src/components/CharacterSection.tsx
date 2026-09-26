import { characters } from '../data/characters'
import type { Character } from '../types'
import { CharacterCard } from './CharacterCard'

interface Props { onChat: (character: Character) => void }

export function CharacterSection({ onChat }: Props) {
  return <section id="characters" className="section-space bg-cream" aria-labelledby="characters-title"><div className="page-shell"><div className="section-heading"><div><span className="section-kicker">NHÂN VẬT LỊCH SỬ</span><h2 id="characters-title">Trò chuyện cùng nhân vật lịch sử</h2><p>Hỏi những điều mà sách giáo khoa chưa thể trả lời theo cách thú vị.</p></div><span className="heading-decoration">GẶP GỠ & KHÁM PHÁ</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{characters.map(character => <CharacterCard key={character.id} character={character} onChat={onChat} />)}</div></div></section>
}
