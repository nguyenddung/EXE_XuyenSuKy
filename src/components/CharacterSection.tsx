import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { Character } from '../types'
import { CharacterCard } from './CharacterCard'
import { historyApi } from '../lib/historyApi'
import { normalizeSearch } from '../data/library'

interface Props { onChat: (character: Character) => void; onLoaded?: (count: number) => void }

export function CharacterSection({ onChat, onLoaded }: Props) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [grade, setGrade] = useState('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(''); setLoading(true)
    historyApi<{ items: Character[] }>('characters', controller.signal).then((data) => { setCharacters(data.items); onLoaded?.(data.items.length) }).catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt, onLoaded])
  const categories = [...new Set(characters.map((character) => character.category))]
  const matches = characters.filter((character) => (category === 'all' || character.category === category) && (grade === 'all' || character.grades.includes(Number(grade))) && normalizeSearch(`${character.name} ${character.aliases.join(' ')} ${character.description} ${character.topics.join(' ')}`).includes(normalizeSearch(query)))
  return <section id="characters" className="section-space bg-cream" aria-labelledby="characters-title"><div className="page-shell">
    <div className="section-heading"><div><span className="section-kicker">NHÂN VẬT TRONG BÀI HỌC</span><h2 id="characters-title">Gặp người viết nên lịch sử.</h2><p>Chọn một nhân vật, hỏi điều bạn tò mò và cùng đọc những đoạn sách có trích nguồn.</p></div><span className="heading-decoration">{characters.length || '…'} NHÂN VẬT · LỚP 6–12</span></div>
    <div className="library-toolbar character-toolbar"><label className="library-search"><Search size={19} /><span className="sr-only">Tìm nhân vật lịch sử</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Thử tìm: Ngo Quyen, Lam Son…" /></label><label><span className="sr-only">Lọc lớp có nhân vật</span><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="all">Tất cả các lớp</option>{[6, 7, 8, 9, 10, 11, 12].map((value) => <option key={value} value={value}>Lớp {value}</option>)}</select></label></div>
    <div className="library-filters" role="group" aria-label="Lọc thời kỳ nhân vật"><button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Tất cả</button>{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <p className="character-result-count" role="status">{loading ? 'Đang tìm nhân vật trong bài học…' : error || `${matches.length} nhân vật phù hợp`}</p>
    {error ? <button className="button-outline" onClick={() => setAttempt((value) => value + 1)}>Tải lại nhân vật</button> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{matches.map((character) => <CharacterCard key={character.id} character={character} onChat={onChat} />)}</div>}
    {!loading && !error && !matches.length && <div className="library-empty"><h3>Chưa tìm thấy nhân vật phù hợp</h3><p>Thử tên không dấu hoặc bỏ bớt bộ lọc.</p><button className="button-outline" onClick={() => { setQuery(''); setCategory('all'); setGrade('all') }}>Xem tất cả nhân vật</button></div>}
  </div></section>
}
