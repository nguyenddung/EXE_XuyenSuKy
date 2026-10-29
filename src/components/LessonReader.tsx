import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, CircleCheck, CircleHelp, Clapperboard, Clock, Focus, Image as ImageIcon, Layers, Lightbulb, Target, Type, X } from 'lucide-react'
import { sourceLabel, type LessonDetail } from '../lib/historyApi'
import { useReaderPreferences } from '../hooks/useReaderPreferences'
import type { useLearningJournal } from '../hooks/useLearningJournal'
import type { JourneyState } from '../hooks/useJourney'
import { LessonPractice, LessonVideoCard, useLessonJourney, type JourneyLaunch } from './LessonJourney'
import '../lesson-reader.css'

// The SGK lesson reader: a contents rail, typeset sections (objectives, lists, figure captions), the journey's videos
// at the start of the section they illustrate, and practice once the text is read.

type Learning = ReturnType<typeof useLearningJournal>
interface Props { lesson: LessonDetail; learning: Learning; onClose: () => void; journeys: JourneyState; onJourney: (launch: JourneyLaunch) => void }

type Block = { kind: 'p' | 'figure' | 'question'; text: string } | { kind: 'list'; items: string[] } | { kind: 'note'; title: string; text: string }
const bullet = /^[-–•+]\s+/
const figure = /^(Hình|Bảng|Sơ đồ|Lược đồ|Tư liệu)\s*\d+/i
const note = /^em có biết\s*\??$/i
/** Numbered review questions at the end of a section, e.g. "1. Xã hội nguyên thuỷ đã trải qua những giai đoạn nào?" */
const question = /^\d+\.\s.+\?$/
/** The extracted text keeps one line per paragraph; bullet lines become lists, figure captions and "Em có biết?" boxes are set apart. */
function blocksOf(content: string): Block[] {
  const blocks: Block[] = []
  for (const line of content.split('\n').map((text) => text.trim()).filter(Boolean)) {
    const last = blocks[blocks.length - 1]
    if (note.test(line)) blocks.push({ kind: 'note', title: line, text: '' })
    else if (last?.kind === 'note' && !last.text && !figure.test(line)) last.text = line.replace(bullet, '')
    else if (bullet.test(line)) {
      const item = line.replace(bullet, '')
      if (last?.kind === 'list') last.items.push(item); else blocks.push({ kind: 'list', items: [item] })
    } else blocks.push({ kind: figure.test(line) ? 'figure' : question.test(line) ? 'question' : 'p', text: line })
  }
  return blocks
}
/** "1. Title", "1 Title" and "3, Title" carry their number in a badge. */
function headingOf(title: string, index: number) {
  const match = /^(\d+)[.,]?\s+(.+)$/.exec(title)
  if (match) return { badge: match[1], text: match[2], kind: 'numbered' as const }
  if (/^mục tiêu/i.test(title)) return { badge: null, text: title, kind: 'objectives' as const }
  if (/^mở đầu/i.test(title)) return { badge: null, text: title, kind: 'intro' as const }
  return { badge: null, text: title, kind: index === 0 ? 'intro' as const : 'plain' as const }
}
const pagesOf = (section: LessonDetail['sections'][number]) => `Trang PDF ${section.pageStart}${section.pageEnd !== section.pageStart ? `–${section.pageEnd}` : ''}`

function SectionBody({ blocks, objectives }: { blocks: Block[]; objectives: boolean }) {
  return <>{blocks.map((block, index) => block.kind === 'list'
    ? <ul key={index} className={objectives ? 'reader-checklist' : 'reader-list'}>{block.items.map((item, at) => <li key={at}>{objectives && <CircleCheck size={18} aria-hidden="true" />}<span>{item}</span></li>)}</ul>
    : block.kind === 'note' ? <aside key={index} className="reader-note"><strong><Lightbulb size={17} aria-hidden="true" /> {block.title}</strong>{block.text && <p>{block.text}</p>}</aside>
    : block.kind === 'question' ? <p key={index} className="reader-question"><CircleHelp size={18} aria-hidden="true" /><span>{block.text}</span></p>
    : block.kind === 'figure' ? <p key={index} className="reader-figure"><ImageIcon size={16} aria-hidden="true" /><span>{block.text}</span></p>
    : <p key={index}>{block.text}</p>)}</>
}

export function LessonReader({ lesson, learning, onClose, journeys, onJourney }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const { large, focused, toggleLarge, toggleFocus } = useReaderPreferences()
  const savedSection = useRef(Math.min(learning.journal.reading[lesson.id]?.section || 0, lesson.sections.length - 1))
  const [activeSection, setActiveSection] = useState(savedSection.current)
  const currentSection = useRef(savedSection.current)
  const restored = useRef(false)
  const remember = useRef(learning.rememberLesson); remember.current = learning.rememberLesson
  const [readNow, setReadNow] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [wide] = useState(() => !window.matchMedia('(max-width: 900px)').matches)
  const lessonJourney = useLessonJourney(journeys, lesson.id)
  const launch = (value: JourneyLaunch) => { onClose(); onJourney(value) }

  function goToSection(index: number, behavior: ScrollBehavior = 'smooth') {
    const element = dialog.current
    const section = element?.querySelector<HTMLElement>('#dataset-section-' + index)
    if (!element || !section) return
    const top = section.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop - 76
    element.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : behavior })
  }
  function trackSection() {
    if (!restored.current || !dialog.current) return
    const edge = dialog.current.getBoundingClientRect().top + 110
    const sections = Array.from(dialog.current.querySelectorAll<HTMLElement>('.dataset-section'))
    const index = Math.max(0, sections.reduce((last, section, at) => section.getBoundingClientRect().top <= edge ? at : last, 0))
    if (index !== currentSection.current) { currentSection.current = index; setActiveSection(index); remember.current(lesson, index) }
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const element = dialog.current
    element?.showModal()
    title.current?.focus()
    const frame = window.requestAnimationFrame(() => {
      if (savedSection.current > 0) goToSection(savedSection.current, 'auto')
      restored.current = true
      remember.current(lesson, savedSection.current)
    })
    return () => { window.cancelAnimationFrame(frame); element?.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])

  const { journal, bookmark, note, markRead, rate, storageError } = learning
  const { journey, stage, videos } = lessonJourney
  const videosAt = (index: number) => videos.filter((mission) => mission.video!.section === index)
  const unplaced = videos.filter((mission) => mission.video!.section === undefined || mission.video!.section >= lesson.sections.length)
  const card = (mission: (typeof videos)[number]) => <LessonVideoCard key={mission.id} mission={mission} playing={playing === mission.id} onToggle={() => setPlaying(playing === mission.id ? null : mission.id)} />
  const saved = journal.bookmarks.includes(lesson.id)
  const progress = Math.round((activeSection + 1) / lesson.sections.length * 100)

  return <dialog ref={dialog} onScroll={trackSection} className={'lesson-reader dataset-reader' + (focused ? ' is-focused' : '')} aria-modal="true" aria-labelledby="dataset-reader-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="reader-hero">
      <span className="section-kicker">SÁCH GIÁO KHOA · LỚP {lesson.grade}{lesson.chapter ? ` · ${lesson.chapter}` : ''}</span>
      <h2 id="dataset-reader-title" ref={title} tabIndex={-1}>{lesson.title}</h2>
      <ul className="reader-meta" aria-label="Thông tin bài học">
        <li><Clock size={15} aria-hidden="true" /> {lesson.minutes} phút đọc</li>
        <li><Layers size={15} aria-hidden="true" /> {lesson.sectionCount} mục</li>
        {lessonJourney.found && lessonJourney.found.lesson.videos > 0 && <li className="is-video"><Clapperboard size={15} aria-hidden="true" /> {lessonJourney.found.lesson.videos} video minh hoạ</li>}
        {lessonJourney.found && <li className="is-practice"><Target size={15} aria-hidden="true" /> {lessonJourney.found.lesson.missions} nhiệm vụ luyện tập</li>}
      </ul>
      <p className="dataset-citation">{sourceLabel(lesson.source)}</p>
      <div className="reader-tools">
        <button aria-pressed={large} onClick={toggleLarge}><Type size={16} aria-hidden="true" />Aa · {large ? 'Cỡ thường' : 'Chữ lớn'}</button>
        <button aria-pressed={focused} onClick={toggleFocus}><Focus size={16} aria-hidden="true" />Chế độ tập trung</button>
        <button aria-pressed={saved} onClick={() => bookmark(lesson.id)}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /> {saved ? 'Đã lưu' : 'Lưu bài'}</button>
      </div>
    </header>
    <div className="reader-position-bar">
      <span><small>Mục {activeSection + 1}/{lesson.sections.length}<span className="reader-autosave"> · vị trí đọc tự động lưu</span></small><strong>{lesson.sections[activeSection]?.title}</strong></span>
      <div><button aria-label="Mục trước" disabled={activeSection === 0} onClick={() => goToSection(activeSection - 1)}><ArrowLeft size={18} /></button><button aria-label="Mục sau" disabled={activeSection >= lesson.sections.length - 1} onClick={() => goToSection(activeSection + 1)}><ArrowRight size={18} /></button><button aria-label="Đóng bài đọc" onClick={onClose}><X size={20} /></button></div>
      <i className="reader-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
    </div>
    <div className="reader-content">
      <div className="reader-layout">
        <aside className="reader-rail">
          <details className="reader-toc-container" open={!focused && wide}><summary>Mục lục bài học</summary>
            <nav className="dataset-toc" aria-label="Mục lục bài học">{lesson.sections.map((section, index) => {
              const heading = headingOf(section.title, index)
              return <a href={`#dataset-section-${index}`} key={index} aria-current={activeSection === index ? 'location' : undefined} onClick={(event) => { event.preventDefault(); goToSection(index) }}>
                <span className="toc-mark" aria-hidden="true">{heading.badge || (index < activeSection ? <Check size={12} /> : '•')}</span><span>{heading.text}</span>{videosAt(index).length > 0 && <Clapperboard size={14} className="toc-video" aria-label=" (có video)" />}
              </a>
            })}</nav>
          </details>
        </aside>
        <article className="reader-main">
          {unplaced.length > 0 && <div className="reader-videos">{unplaced.map(card)}</div>}
          <div className={`reader-prose ${large ? 'large' : ''}`}>{lesson.sections.map((section, index) => {
            const heading = headingOf(section.title, index)
            return <section className={`dataset-section is-${heading.kind}`} key={index} id={`dataset-section-${index}`} aria-labelledby={`dataset-section-title-${index}`}>
              <header className="dataset-section-head">
                {heading.badge && <span className="section-badge" aria-hidden="true">{heading.badge}</span>}
                {heading.kind === 'objectives' && <span className="section-badge is-icon" aria-hidden="true"><Target size={17} /></span>}
                <h3 id={`dataset-section-title-${index}`}>{heading.badge ? <span className="sr-only">{heading.badge}. </span> : null}{heading.text}</h3>
                <small>{pagesOf(section)}</small>
              </header>
              {videosAt(index).length > 0 && <div className="reader-videos">{videosAt(index).map(card)}</div>}
              <SectionBody blocks={blocksOf(section.content)} objectives={heading.kind === 'objectives'} />
            </section>
          })}</div>

          <section className="reader-finish" aria-labelledby="reader-finish-title">
            <h3 id="reader-finish-title"><BookOpen size={19} aria-hidden="true" /> Đọc xong bài này?</h3>
            <div className="reader-finish-actions">
              <button className="button-primary mark-read" onClick={() => { markRead(lesson.id); setReadNow(true) }}><Check size={16} /> {readNow ? 'Đã ghi nhận hôm nay' : journal.read.includes(lesson.id) ? 'Ghi nhận đọc lại hôm nay' : 'Đánh dấu đã đọc'}</button>
              <button className="button-outline" aria-pressed={journal.review[lesson.id] === 'again'} onClick={() => rate(lesson.id, 'again')}>Cần đọc lại</button>
              <button className="button-outline" aria-pressed={journal.review[lesson.id] === 'remembered'} onClick={() => rate(lesson.id, 'remembered')}>Đã nắm nội dung</button>
            </div>
            {readNow && <p className="reader-status" role="status">Đã cập nhật mục tiêu học tập. Đọc lại cùng ngày không tăng trùng lượt.</p>}
          </section>

          {journey && stage && <LessonPractice journey={journey} stage={stage} journeys={journeys} onLaunch={launch} />}
          {lessonJourney.found && !stage && <p className="reader-status" role="status">{lessonJourney.failed ? 'Chưa tải được video và nhiệm vụ của bài này.' : 'Đang tải video và nhiệm vụ…'}</p>}

          <section className="reader-notebook"><label htmlFor="dataset-note">Sổ tay của bạn</label><p>Tóm tắt bài bằng lời của mình hoặc ghi câu hỏi cần tìm hiểu thêm.</p><textarea id="dataset-note" value={journal.notes[lesson.id] || ''} onChange={(event) => note(lesson.id, event.target.value)} maxLength={2000} rows={4} placeholder="Điều mình muốn nhớ là…" /><small>{storageError ? 'Chưa lưu được. Hãy sao chép ghi chú trước khi rời trang.' : 'Tự động lưu trên trình duyệt này'} · {(journal.notes[lesson.id] || '').length}/2000</small></section>
          <p className="dataset-citation">{sourceLabel(lesson.source)}. File nguồn: {lesson.source.sourcePdf}. Số trang là vị trí trong PDF, không phải số in trên sách.</p>
        </article>
      </div>
    </div>
  </dialog>
}
