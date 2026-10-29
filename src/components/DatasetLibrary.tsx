import { useEffect, useState } from 'react'
import { ArrowRight, Bookmark, BookOpen, Clapperboard, Search } from 'lucide-react'
import { historyApi, sourceLabel, type DatasetMetadata, type HistoryChunk, type HistoryLesson, type LessonDetail, type PageResult } from '../lib/historyApi'
import type { LessonCollection } from './StudyPlan'
import { dayKey, streak, type useLearningJournal } from '../hooks/useLearningJournal'
import type { JourneyState } from '../hooks/useJourney'
import { journeyLessonOf, type JourneyLaunch } from './LessonJourney'
import { LessonReader } from './LessonReader'

type Learning = ReturnType<typeof useLearningJournal>
interface Props {
  onCollectionHandled: () => void
  requestedCollection: { filter: LessonCollection; token: number } | null
  metadata: DatasetMetadata
  learning: Learning
  grade: number
  requestedLessonId: string | null
  onRequestHandled: () => void
  journeys: JourneyState
  onJourney: (launch: JourneyLaunch) => void
}

function DatasetDailyGoal({ learning }: { learning: Learning }) {
  const [today, setToday] = useState(dayKey)
  useEffect(() => { const timer = setInterval(() => setToday(dayKey()), 30000); return () => clearInterval(timer) }, [])
  const count = learning.journal.events.filter((event) => event.day === today).length
  const goal = learning.journal.goal
  return <div className="dataset-daily-goal"><div className="daily-goal"><span>Mục tiêu hôm nay</span><label><span className="sr-only">Mục tiêu hoạt động mỗi ngày</span><select value={goal} onChange={(event) => learning.setGoal(Number(event.target.value))}>{[1, 3, 5].map((value) => <option key={value} value={value}>{value} hoạt động</option>)}</select></label></div><div className="daily-meter" role="progressbar" aria-label="Tiến độ mục tiêu hôm nay" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(count, goal)}><span style={{ width: `${Math.min(100, count / goal * 100)}%` }} /></div><div className="daily-count" role="status"><strong>{count >= goal ? 'Đã hoàn thành mục tiêu hôm nay!' : `${count}/${goal} hoạt động hôm nay`}</strong><span>{streak(learning.journal.events, today)} ngày liên tiếp</span></div><p className="journal-note">Đọc, ôn hoặc chơi game đều được ghi nhận. Ghi chú và tiến độ lưu trên trình duyệt này.</p></div>
}

/** Tells, on the lesson card, that the reader also has videos and missions for this lesson. */
function JourneyBadge({ journeys, lessonId }: { journeys: JourneyState; lessonId: string }) {
  const lesson = journeyLessonOf(journeys, lessonId)?.lesson
  if (!lesson) return null
  return <span className="lesson-journey-badge">{lesson.videos > 0 && <><Clapperboard size={13} aria-hidden="true" /> {lesson.videos} video · </>}{lesson.missions} nhiệm vụ</span>
}

export function DatasetLibrary({ onCollectionHandled, requestedCollection, metadata, learning, grade, requestedLessonId, onRequestHandled, journeys, onJourney }: Props) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState(String(grade))
  const [chapter, setChapter] = useState('')
  const [filter, setFilter] = useState('all')
  const [mode, setMode] = useState<'lessons' | 'search'>('lessons')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PageResult<HistoryLesson> | null>(null)
  const [sources, setSources] = useState<PageResult<HistoryChunk> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [active, setActive] = useState<LessonDetail | null>(null)
  const [readerError, setReaderError] = useState('')
  const { journal, bookmark } = learning
  const collectionIds = (filter === 'saved' ? journal.bookmarks : filter === 'notes' ? Object.keys(journal.notes).filter((id) => journal.notes[id].trim()) : filter === 'review' ? Object.keys(journal.review).filter((id) => journal.review[id] === 'again') : filter === 'unread' ? journal.read : []).filter((id) => /^LS\d{1,2}_B\d{2}$/.test(id)).join(',')
  useEffect(() => { setFilterGrade(String(grade)); setChapter(''); setPage(1) }, [grade])
  useEffect(() => {
    if (!requestedCollection) return
    setFilter(requestedCollection.filter); setMode('lessons'); setQuery(''); setChapter(''); setPage(1)
    setFilterGrade(requestedCollection.filter === 'review' ? String(grade) : 'all')
    onCollectionHandled()
  }, [requestedCollection])
  useEffect(() => setPage(1), [collectionIds])
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 250); return () => clearTimeout(timer) }, [query])
  useEffect(() => {
    const controller = new AbortController()
    setError(''); setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '6' })
    if (filterGrade !== 'all') params.set('grade', filterGrade)
    if (mode === 'search' && debouncedQuery.trim().length < 2) { setSources(null); setLoading(false); return () => controller.abort() }
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (chapter && mode === 'lessons') params.set('chapter', chapter)
    if (mode === 'lessons' && ['saved', 'notes', 'review'].includes(filter)) params.set('ids', collectionIds)
    if (mode === 'lessons' && filter === 'unread' && collectionIds) params.set('excludeIds', collectionIds)
    const promise = mode === 'lessons' ? historyApi<PageResult<HistoryLesson>>(`lessons?${params}`, controller.signal).then(data => { if (!controller.signal.aborted) setResult(data) }) : historyApi<PageResult<HistoryChunk>>(`search?${params}`, controller.signal).then(data => { if (!controller.signal.aborted) setSources(data) })
    promise.catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, filterGrade, chapter, debouncedQuery, filter, collectionIds, mode, retry])
  useEffect(() => { if (requestedLessonId) { setSelectedId(requestedLessonId); onRequestHandled() } }, [requestedLessonId, onRequestHandled])
  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    setActive(null); setReaderError('')
    historyApi<LessonDetail>(`lessons/${selectedId}`, controller.signal).then(data => { if (!controller.signal.aborted) setActive(data) }).catch((failure: Error) => { if (!controller.signal.aborted) setReaderError(failure.message) })
    return () => controller.abort()
  }, [selectedId])
  const changeFilter = (value: string) => { setFilter(value); setPage(1) }
  const gradeInfo = metadata.grades.find((item) => item.grade === grade)
  const recommended = gradeInfo?.recommendation
  const count = mode === 'lessons' ? result?.total : sources?.total
  const pages = (mode === 'lessons' ? result?.pages : sources?.pages) || 0
  return <div className="dataset-library">
    <DatasetDailyGoal learning={learning} />
    {recommended && <div className="dataset-recommendation"><div><span className="section-kicker">BẮT ĐẦU VỚI LỚP {grade}</span><h3>{recommended.title}</h3><p>{gradeInfo.bookSeries} · {gradeInfo.lessonCount} bài học</p></div><button className="button-primary" onClick={() => setSelectedId(recommended.id)}>Mở bài học <ArrowRight size={16} /></button></div>}
    <div className="dataset-stats"><span><strong>{metadata.totals.lessons}</strong> bài học</span><span><strong>{metadata.totals.chunks}</strong> đoạn tra cứu</span><span><strong>{metadata.grades.length}</strong> khối lớp</span><span>Nguồn SGK · v{metadata.version}</span></div>
    <div className="library-toolbar"><label className="library-search"><Search size={19} /><span className="sr-only">Tìm kiếm sách giáo khoa</span><input type="search" value={query} maxLength={200} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Thử tìm: Bach Dang, Ho Chi Minh…" /></label><label><span className="sr-only">Lọc lớp sách giáo khoa</span><select value={filterGrade} onChange={(event) => { setFilterGrade(event.target.value); setChapter(''); setPage(1) }}><option value="all">Tất cả các lớp</option>{metadata.grades.map((item) => <option key={item.grade} value={item.grade}>Lớp {item.grade}</option>)}</select></label></div>
    {filterGrade !== 'all' && mode === 'lessons' && <label className="dataset-chapter"><span>Lọc chương / chủ đề</span><select value={chapter} onChange={(event) => { setChapter(event.target.value); setPage(1) }}><option value="">Tất cả chương / chủ đề</option>{metadata.grades.find((item) => String(item.grade) === filterGrade)?.chapters.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
    <div className="library-filters" role="group" aria-label="Cách tra cứu dataset"><button aria-pressed={mode === 'lessons'} onClick={() => { setMode('lessons'); setPage(1) }}>Bài học</button><button aria-pressed={mode === 'search'} onClick={() => { setMode('search'); setPage(1) }}>Tra cứu đoạn có nguồn</button></div>
    {mode === 'lessons' && <div className="library-filters" role="group" aria-label="Lọc bài học sách giáo khoa">{[['all', 'Tất cả'], ['saved', 'Đã lưu'], ['unread', 'Chưa đọc'], ['review', 'Cần đọc lại'], ['notes', 'Có ghi chú']].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => changeFilter(id)}>{label}</button>)}</div>}
    <div className="library-result-count" role="status">{loading ? 'Đang tải dữ liệu…' : error || (mode === 'search' && debouncedQuery.trim().length < 2 ? 'Nhập ít nhất 2 ký tự để tìm đoạn tư liệu có nguồn.' : `${count || 0} ${mode === 'lessons' ? 'bài học' : 'đoạn tư liệu'} phù hợp`)}{error && <button className="button-outline" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>}</div>
    {!loading && !error && mode === 'lessons' && <div className="library-grid">{result?.items.map((lesson) => <article className={`library-card dataset-card library-grade-${lesson.grade}`} key={lesson.id}><div className="library-card-top"><span>LỚP {lesson.grade} · {lesson.minutes} PHÚT</span><button aria-label={`${journal.bookmarks.includes(lesson.id) ? 'Bỏ lưu' : 'Lưu'}: ${lesson.title}`} aria-pressed={journal.bookmarks.includes(lesson.id)} onClick={() => bookmark(lesson.id)}><Bookmark size={19} fill={journal.bookmarks.includes(lesson.id) ? 'currentColor' : 'none'} /></button></div><span className="library-era">{lesson.chapter}</span><h3>{lesson.title}</h3><JourneyBadge journeys={journeys} lessonId={lesson.id} /><p>{lesson.excerpt}</p><small className="dataset-card-source">{lesson.source.bookSeries} · trang PDF {lesson.source.pageStart}–{lesson.source.pageEnd}</small><div className="library-state">{journal.read.includes(lesson.id) ? '✓ Đã đọc' : `${lesson.sectionCount} mục kiến thức`}{journal.notes[lesson.id]?.trim() && <span> · Có ghi chú</span>}</div><button className="library-open" onClick={() => setSelectedId(lesson.id)}><BookOpen size={16} /> Mở bài học <ArrowRight size={17} /><span className="sr-only">: {lesson.title}</span></button></article>)}</div>}
    {!loading && !error && mode === 'search' && <div className="dataset-source-results">{sources?.items.map((chunk) => <article className="dataset-source-card" key={chunk.id}><span className="section-kicker">LỚP {chunk.grade} · {chunk.sectionTitle}</span><h3>{chunk.lessonTitle}</h3><p>{chunk.text}</p><small>{sourceLabel(chunk.source)}</small><button className="button-outline" onClick={() => setSelectedId(chunk.lessonId)}>Đọc bài chứa đoạn này <ArrowRight size={16} /></button></article>)}</div>}
    {!loading && !error && count === 0 && <div className="library-empty"><BookOpen size={30} /><h3>Chưa tìm thấy nội dung phù hợp</h3><p>Thử từ khóa khác hoặc bỏ bớt bộ lọc.</p><button className="button-outline" onClick={() => { setQuery(''); setFilterGrade('all'); setChapter(''); changeFilter('all') }}>Xem tất cả bài học</button></div>}
    {!loading && !error && pages > 1 && <nav className="dataset-pagination" aria-label="Phân trang dataset"><button className="button-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page}/{pages}</span><button className="button-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Trang sau <ArrowRight size={16} /></button></nav>}
    {selectedId && !active && <div className="dataset-reader-status" role="status">{readerError || 'Đang mở bài học…'}<button onClick={() => { setSelectedId(null); setReaderError('') }}>Đóng</button></div>}
    {active && <LessonReader key={active.id} lesson={active} learning={learning} journeys={journeys} onJourney={onJourney} onClose={() => { setActive(null); setSelectedId(null) }} />}
  </div>
}
