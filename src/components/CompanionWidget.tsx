import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MessageCircle, PencilLine, X } from 'lucide-react'
import { cleanCompanionName, greetingFor, nameProblemMessage, readCompanion, speciesOf, studyStatus, writeCompanion, type CompanionState } from '../lib/companion'
import { dayKey, type Journal } from '../hooks/useLearningJournal'
import { showSection } from '../lib/sections'

interface Props {
  /** storageOwner(session): account id, 'guest', or null when unknown (the name then lasts until the page closes). */
  owner: string | null
  journal: Journal
  learningStreak: number
}

// "Để sau" on the naming invitation hides it for this tab only; it comes back on the next visit until a name is chosen.
const laterKey = 'xuyen-su-ky-companion-later'
const laterThisTab = () => { try { return sessionStorage.getItem(laterKey) === '1' } catch { return false } }
const greetingSeconds = 12

type Bubble = 'intro' | 'greeting' | null

/** The study companion floating in the corner of the learning app (step 1: naming and greetings, no AI yet). */
export function CompanionWidget({ owner, journal, learningStreak }: Props) {
  const [initial] = useState(() => {
    const stored = readCompanion(owner)
    const bubble: Bubble = stored ? (stored.lastGreetDay === dayKey() ? null : 'greeting') : laterThisTab() ? null : 'intro'
    return { stored, bubble }
  })
  const [companion, setCompanion] = useState<CompanionState | null>(initial.stored)
  const [bubble, setBubble] = useState<Bubble>(initial.bubble)
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [justNamed, setJustNamed] = useState(false)
  const [saved, setSaved] = useState(true)
  const launcher = useRef<HTMLButtonElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const species = speciesOf(companion?.species)
  const today = dayKey()
  const status = studyStatus({ done: journal.events.filter((event) => event.day === today).length, goal: journal.goal, streak: learningStreak })

  function save(next: CompanionState) {
    setCompanion(next)
    setSaved(writeCompanion(owner, next))
  }

  // The daily greeting counts as given once it appears, then fades after a while.
  useEffect(() => {
    if (bubble !== 'greeting' || !companion) return
    if (companion.lastGreetDay !== today) save({ ...companion, lastGreetDay: today })
    const timer = window.setTimeout(() => setBubble(null), greetingSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [bubble])

  useEffect(() => { if (open && companion && !renaming) title.current?.focus() }, [open, renaming])

  function openPanel() { setBubble(null); setOpen(true) }
  function closePanel() { setOpen(false); setRenaming(false); setJustNamed(false); launcher.current?.focus() }
  function later() {
    try { sessionStorage.setItem(laterKey, '1') } catch { /* It then comes back on the next page load. */ }
    setBubble(null)
  }
  function chooseName(name: string) {
    const first = !companion
    save({ species: species.id, name, namedAt: new Date().toISOString(), lastGreetDay: today })
    setRenaming(false)
    setJustNamed(first)
    window.setTimeout(() => title.current?.focus(), 0)
  }
  function onPanelKey(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.stopPropagation(); closePanel() }
  }

  const label = companion ? `Bạn đồng hành ${companion.name}` : 'Bạn đồng hành: đặt tên'

  return <div className="companion">
    {bubble && !open && <div className="companion-bubble" role="status">
      {bubble === 'intro'
        ? <>
          <p>Chào bạn! Mình là bạn {species.label} sẽ học Sử cùng bạn. Bạn đặt cho mình một cái tên nhé?</p>
          <div className="companion-bubble-actions">
            <button type="button" className="companion-primary" onClick={openPanel}>Đặt tên</button>
            <button type="button" className="companion-quiet" onClick={later}>Để sau</button>
          </div>
        </>
        : <>
          <p><strong>{greetingFor(companion!.name)}</strong> {status}</p>
          <button type="button" className="companion-bubble-close" aria-label="Ẩn lời chào" onClick={() => setBubble(null)}><X size={14} /></button>
        </>}
    </div>}

    {open && <section id="companion-panel" className="companion-panel" role="dialog" aria-labelledby="companion-title" onKeyDown={onPanelKey}>
      <header className="companion-header">
        <img src={species.image} alt="" width={44} height={44} />
        <div>
          <span>Bạn đồng hành</span>
          <h2 id="companion-title" ref={title} tabIndex={-1}>{companion?.name ?? `Bạn ${species.label} mới`}</h2>
        </div>
        <button type="button" aria-label="Đóng bạn đồng hành" onClick={closePanel}><X size={18} /></button>
      </header>
      <div className="companion-body">
        {!companion || renaming
          ? <NameForm key={renaming ? 'rename' : 'first'} initial={companion?.name} suggestions={species.suggestions} speciesLabel={species.label} onSave={chooseName} onCancel={renaming ? () => { setRenaming(false); window.setTimeout(() => title.current?.focus(), 0) } : undefined} />
          : <>
            <p className="companion-message">{justNamed ? `Từ giờ mình là ${companion.name}! Mình sẽ ở góc này, học cùng bạn mỗi ngày.` : greetingFor(companion.name)} {status}</p>
            {!saved && <p className="companion-hint">Trình duyệt chưa cho lưu dữ liệu, nên tên này chỉ giữ đến khi tải lại trang.</p>}
            <div className="companion-actions">
              <button type="button" className="companion-primary" onClick={() => { closePanel(); showSection('characters') }}><MessageCircle size={16} /> Nghe nhân vật lịch sử kể chuyện</button>
              <button type="button" className="companion-quiet" onClick={() => setRenaming(true)}><PencilLine size={16} /> Đổi tên</button>
            </div>
            <p className="companion-hint">Sắp tới, bạn có thể hỏi {companion.name} về bài đang học, cách lập kế hoạch học và mẹo ghi nhớ.</p>
          </>}
      </div>
    </section>}

    <button ref={launcher} type="button" className={'companion-launcher' + (bubble ? ' is-calling' : '')} aria-label={label} aria-expanded={open} aria-controls={open ? 'companion-panel' : undefined} onClick={() => open ? closePanel() : openPanel()}>
      <img src={species.image} alt="" width={60} height={60} />
      {companion && <span className="companion-name-tag" aria-hidden="true">{companion.name}</span>}
    </button>
  </div>
}

function NameForm({ initial = '', suggestions, speciesLabel, onSave, onCancel }: { initial?: string; suggestions: readonly string[]; speciesLabel: string; onSave: (name: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = cleanCompanionName(value)
    if ('problem' in result) { setError(nameProblemMessage[result.problem]); input.current?.focus(); return }
    onSave(result.name)
  }
  function pick(name: string) { setValue(name); setError(''); input.current?.focus() }

  return <form className="companion-name-form" onSubmit={submit} noValidate>
    <label htmlFor="companion-name">{onCancel ? 'Tên mới cho bạn đồng hành' : `Đặt tên cho bạn ${speciesLabel}`}</label>
    <input id="companion-name" ref={input} value={value} maxLength={40} autoComplete="off" spellCheck={false} aria-invalid={error ? true : undefined} aria-describedby={error ? 'companion-name-error' : 'companion-name-hint'} onChange={(event) => { setValue(event.target.value); setError('') }} />
    {error
      ? <p id="companion-name-error" className="companion-error" role="alert">{error}</p>
      : <p id="companion-name-hint" className="companion-hint">Đây là tên của bạn đồng hành, không cần tên thật của bạn. Tối đa 20 ký tự.</p>}
    <div className="companion-suggestions" role="group" aria-label="Tên gợi ý">
      {suggestions.map((name) => <button type="button" key={name} onClick={() => pick(name)}>{name}</button>)}
    </div>
    <div className="companion-actions">
      <button type="submit" className="companion-primary">{onCancel ? 'Lưu tên mới' : 'Đặt tên'}</button>
      {onCancel && <button type="button" className="companion-quiet" onClick={onCancel}>Huỷ</button>}
    </div>
  </form>
}
