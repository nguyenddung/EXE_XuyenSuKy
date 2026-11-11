import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, MessageCircle, PencilLine, X } from 'lucide-react'
import { clampPoint, cleanCompanionName, floatingPlacement, fromRatio, greetingFor, nameProblemMessage, readCompanion, readCompanionPosition, speciesOf, studyStatus, toRatio, writeCompanion, writeCompanionPosition, type CompanionState, type Point, type Size } from '../lib/companion'
import { dayKey, type Journal } from '../hooks/useLearningJournal'
import { showSection } from '../lib/sections'
import { mascotFor, type MascotMood } from './CompanionMascot'

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
// A press that moves less than this is a click, not a drag.
const dragThreshold = 6
const viewport = (): Size => ({ width: window.innerWidth, height: window.innerHeight })
const phone = () => window.matchMedia('(max-width: 680px)').matches

type Bubble = 'intro' | 'greeting' | null
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
const corners: { corner: Corner; label: string; icon: typeof ArrowUpLeft }[] = [
  { corner: 'top-left', label: 'Góc trên bên trái', icon: ArrowUpLeft },
  { corner: 'top-right', label: 'Góc trên bên phải', icon: ArrowUpRight },
  { corner: 'bottom-left', label: 'Góc dưới bên trái', icon: ArrowDownLeft },
  { corner: 'bottom-right', label: 'Góc dưới bên phải', icon: ArrowDownRight },
]

/**
 * The study companion of the learning app (step 1: naming and greetings, no AI yet). It can be dragged anywhere
 * on screen, moved with the arrow keys, or sent to a corner from its panel; the bubble and panel open on the side
 * with more room.
 */
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
  // null: the default corner from the stylesheet; otherwise the launcher's top-left corner on screen.
  const [position, setPosition] = useState<Point | null>(null)
  const [anchor, setAnchor] = useState<(Point & Size) | null>(null)
  const [view, setView] = useState<Size>(viewport)
  const [motion, setMotion] = useState<Exclude<MascotMood, 'idle' | 'wave'> | null>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const figure = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const drag = useRef<{ pointer: number; x: number; y: number; from: Point; lastX: number; moved: boolean } | null>(null)
  const dragged = useRef(false)
  const motionTimer = useRef(0)
  const species = speciesOf(companion?.species)
  const Mascot = mascotFor(species.id)
  const today = dayKey()
  const status = studyStatus({ done: journal.events.filter((event) => event.day === today).length, goal: journal.goal, streak: learningStreak })
  const mood: MascotMood = motion ?? (bubble && !open ? 'wave' : 'idle')

  const sizeOf = (): Size => ({ width: launcher.current?.offsetWidth ?? 76, height: launcher.current?.offsetHeight ?? 84 })

  function save(next: CompanionState) {
    setCompanion(next)
    setSaved(writeCompanion(owner, next))
  }
  function play(next: Exclude<MascotMood, 'idle' | 'wave'> | null, ms = 0) {
    window.clearTimeout(motionTimer.current)
    setMotion(next)
    if (next && ms) motionTimer.current = window.setTimeout(() => setMotion(null), ms)
  }
  function place(point: Point | null, persist = true) {
    setPosition(point && clampPoint(point, sizeOf(), viewport()))
    if (persist) writeCompanionPosition(point && toRatio(clampPoint(point, sizeOf(), viewport()), sizeOf(), viewport()))
  }

  // Back where the student left it, kept in the same part of the screen when the window changes size.
  useLayoutEffect(() => {
    const restore = () => {
      setView(viewport())
      const ratio = readCompanionPosition()
      setPosition(ratio ? fromRatio(ratio, sizeOf(), viewport()) : null)
    }
    restore()
    window.addEventListener('resize', restore)
    return () => { window.removeEventListener('resize', restore); window.clearTimeout(motionTimer.current) }
  }, [])

  // The bubble and the panel are placed next to wherever the launcher is.
  useLayoutEffect(() => {
    const box = launcher.current?.getBoundingClientRect()
    if (box) setAnchor({ left: box.left, top: box.top, width: box.width, height: box.height })
  }, [position, view, open, bubble, companion?.name]) // the name tag changes the launcher's height

  // The daily greeting counts as given once it appears, then fades after a while.
  useEffect(() => {
    if (bubble !== 'greeting' || !companion) return
    if (companion.lastGreetDay !== today) save({ ...companion, lastGreetDay: today })
    const timer = window.setTimeout(() => setBubble(null), greetingSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [bubble])

  useEffect(() => { if (open && companion && !renaming) title.current?.focus() }, [open, renaming])

  function openPanel() { setBubble(null); setOpen(true); play('happy', 900) }
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
    play('happy', 1200)
    window.setTimeout(() => title.current?.focus(), 0)
  }
  function onPanelKey(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.stopPropagation(); closePanel() }
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !launcher.current) return
    // Touch screens may send no click after a drag: forget the last drag at every new press.
    dragged.current = false
    const box = launcher.current.getBoundingClientRect()
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, from: { left: box.left, top: box.top }, lastX: event.clientX, moved: false }
    launcher.current.setPointerCapture?.(event.pointerId)
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    const dx = event.clientX - current.x, dy = event.clientY - current.y
    if (!current.moved) {
      if (Math.hypot(dx, dy) < dragThreshold) return
      current.moved = true
      play('lifted')
    }
    // Leaning into the movement, like something carried by its shell.
    figure.current?.style.setProperty('--cm-tilt', `${Math.max(-18, Math.min(18, (event.clientX - current.lastX) * 2))}deg`)
    current.lastX = event.clientX
    place({ left: current.from.left + dx, top: current.from.top + dy }, false)
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    drag.current = null
    if (!current.moved) return
    dragged.current = true
    figure.current?.style.setProperty('--cm-tilt', '0deg')
    place({ left: current.from.left + event.clientX - current.x, top: current.from.top + event.clientY - current.y })
    play('land', 550)
  }
  function onLauncherClick() {
    // The click that ends a drag only drops the companion.
    if (dragged.current) { dragged.current = false; return }
    if (open) closePanel(); else openPanel()
  }
  function onLauncherKey(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 64 : 16
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[event.key]
    if (!delta || !launcher.current) return
    event.preventDefault()
    const box = launcher.current.getBoundingClientRect()
    place({ left: box.left + delta[0], top: box.top + delta[1] })
  }
  function moveToCorner(corner: Corner) {
    // Bottom right is the default corner, which on a phone stays above the bottom navigation.
    if (corner === 'bottom-right') { place(null); return }
    const size = sizeOf(), screen = viewport()
    const left = corner.endsWith('left') ? 16 : screen.width - size.width - 16
    // Below the top bar; above the bottom navigation on a phone.
    const top = corner.startsWith('top') ? 76 : screen.height - size.height - (phone() ? 92 : 20)
    place({ left, top })
  }

  const bubbleWidth = Math.min(290, view.width - 28)
  const panelWidth = Math.min(360, view.width - 28)
  const floating = (width: number, cap: number): CSSProperties | undefined => {
    if (!anchor) return undefined
    const { side, maxHeight, ...edges } = floatingPlacement(anchor, view, width)
    return { ...edges, width, maxHeight: Math.min(cap, maxHeight) }
  }
  const label = companion ? `Bạn đồng hành ${companion.name}` : 'Bạn đồng hành: đặt tên'

  return <div className={'companion' + (motion === 'lifted' ? ' is-dragging' : '')} style={position ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' } : undefined}>
    {bubble && !open && anchor && <div className="companion-bubble" role="status" style={floating(bubbleWidth, 400)}>
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

    {open && anchor && <section id="companion-panel" className="companion-panel" role="dialog" aria-labelledby="companion-title" onKeyDown={onPanelKey} style={floating(panelWidth, 520)}>
      <header className="companion-header">
        <span className="companion-header-figure"><Mascot size={40} /></span>
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
            <p className="companion-message">{justNamed ? `Từ giờ mình là ${companion.name}! Mình sẽ ở cạnh, học cùng bạn mỗi ngày.` : greetingFor(companion.name)} {status}</p>
            {!saved && <p className="companion-hint">Trình duyệt chưa cho lưu dữ liệu, nên tên này chỉ giữ đến khi tải lại trang.</p>}
            <div className="companion-actions">
              <button type="button" className="companion-primary" onClick={() => { closePanel(); showSection('characters') }}><MessageCircle size={16} /> Nghe nhân vật lịch sử kể chuyện</button>
              <button type="button" className="companion-quiet" onClick={() => setRenaming(true)}><PencilLine size={16} /> Đổi tên</button>
            </div>
            <p className="companion-hint">Sắp tới, bạn có thể hỏi {companion.name} về bài đang học, cách lập kế hoạch học và mẹo ghi nhớ.</p>
          </>}
        <div className="companion-seat">
          <p id="companion-seat-label">Kéo {companion?.name ?? 'mình'} đi bất kỳ đâu trên màn hình, hoặc chọn một góc:</p>
          <div role="group" aria-labelledby="companion-seat-label">
            {corners.map(({ corner, label: name, icon: Icon }) => <button type="button" key={corner} aria-label={name} title={name} onClick={() => moveToCorner(corner)}><Icon size={16} /></button>)}
          </div>
        </div>
      </div>
    </section>}

    <button ref={launcher} type="button" className="companion-launcher" aria-label={label} aria-describedby="companion-move-hint" aria-expanded={open} aria-controls={open ? 'companion-panel' : undefined}
      onClick={onLauncherClick} onKeyDown={onLauncherKey} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <span ref={figure} className="companion-figure"><Mascot mood={mood} track lively /></span>
      {companion && <span className="companion-name-tag" aria-hidden="true">{companion.name}</span>}
    </button>
    <span id="companion-move-hint" hidden>Kéo, hoặc dùng phím mũi tên, để di chuyển.</span>
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
