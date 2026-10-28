import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, BookOpen, LoaderCircle, MessageCircle, Mic, RotateCcw, Square, Volume2, X } from 'lucide-react'
import type { Character, CharacterInteractionMode } from '../types'
import { askCharacter, RateLimitError } from '../lib/characterApi'
import { sourceLabel } from '../lib/historyApi'
import { apiContext, newExchangeId, toChatReply, type ChatExchange } from '../lib/chatHistory'
import { useChatHistory } from '../hooks/useChatHistory'
import { useCharacterSpeech } from '../lib/useCharacterSpeech'
import { useVoiceInput } from '../lib/useVoiceInput'
import type { CharacterActivity } from '../lib/animatedCharacters'
import { CharacterVoicePanel } from './CharacterVoicePanel'

/** `historyOwner` is the stable id of the signed-in demo account ('guest' for guests); null means the chat works but is not stored. */
interface Props { character: Character; historyOwner: string | null; initialMode?: CharacterInteractionMode; onClose: () => void; onOpenLesson: (id: string) => void }

const timeLabel = (at?: number) => at && at > 0 ? new Date(at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''
const historyNoteFor = (notice: ReturnType<typeof useChatHistory>['notice']) =>
  notice.save === 'failed' ? 'Không lưu được lịch sử vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Bạn vẫn trò chuyện được, nhưng cuộc trò chuyện sẽ mất khi đóng trang.'
    : notice.save === 'trimmed' ? 'Bộ nhớ trình duyệt gần đầy nên chỉ lưu các lượt gần nhất.'
    : notice.save === 'unavailable' ? 'Chưa xác định được tài khoản nên cuộc trò chuyện này không được lưu. Hãy đăng nhập lại để lưu lịch sử.'
    : notice.discarded ? 'Lịch sử cũ bị lỗi hoặc không còn tương thích nên đã được bỏ qua. Cuộc trò chuyện mới bắt đầu.'
    : notice.restored ? 'Đã khôi phục cuộc trò chuyện trước đó trên trình duyệt này.' : ''

export function CharacterChatModal({ character, historyOwner, initialMode = 'chat', onClose, onOpenLesson }: Props) {
  const [mode, setMode] = useState<CharacterInteractionMode>(initialMode)
  const modeRef = useRef(initialMode)
  const [voiceMessage, setVoiceMessage] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const history = useChatHistory(historyOwner, character.id)
  const messages = history.messages
  const historyNote = historyNoteFor(history.notice)
  // Replies are applied through the token they were requested under; see useChatHistory.
  const tokenRef = useRef(history.token)
  tokenRef.current = history.token
  const [busy, setBusy] = useState(false)
  // After HTTP 429 every way of asking stays locked until the server's Retry-After has passed.
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const locked = busy || cooldown > 0
  const [autoRead, setAutoRead] = useState(true)
  const autoReadRef = useRef(true)
  const speech = useCharacterSpeech(character.id)
  const mic = useVoiceInput(setInput)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const micRef = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const pending = useRef<AbortController | null>(null)
  const activity: CharacterActivity = mic.listening ? 'listening' : busy ? 'thinking' : speech.phase === 'loading' ? 'loading' : speech.phase === 'speaking' ? 'speaking' : 'idle'

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current
    element?.showModal()
    inputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { pending.current?.abort(); element?.close(); document.body.style.overflow = previousOverflow; previous?.focus() }
  }, [])
  // A different owner, character or a fresh conversation invalidates any request still on its way.
  useEffect(() => () => { pending.current?.abort() }, [history.token])
  useEffect(() => { if (mode === 'chat') inputRef.current?.focus(); else micRef.current?.focus() }, [mode])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages, busy, mode])
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= cooldownUntil) { window.clearInterval(timer); inputRef.current?.focus() }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  // Native modal dialogs let Tab escape to the browser chrome after the last control; keep focus cycling inside.
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab' || !dialog.current) return
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !dialog.current.contains(active))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (active === last || !dialog.current.contains(active))) { event.preventDefault(); first.focus() }
  }

  async function requestReply(question: string, id: string, index: number) {
    if (pending.current || cooldownUntil > Date.now()) return
    speech.stop(); mic.stop(); speech.clearError(); mic.clearError()
    const token = history.token
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    const context = apiContext(messages.slice(0, index))
    const settle = (change: (message: ChatExchange) => ChatExchange) => history.update(token, (previous) => previous.map((message) => message.id === id ? change(message) : message))
    try {
      const reply = await askCharacter(character.id, question, context, controller.signal)
      if (!controller.signal.aborted && tokenRef.current === token) {
        settle((message) => ({ id: message.id, question: message.question, askedAt: message.askedAt, reply: toChatReply(reply), answeredAt: Date.now() }))
        if (autoReadRef.current && modeRef.current === 'voice') void speech.play(reply.answer, index)
      }
    } catch (failure) {
      if (tokenRef.current !== token) return
      if (failure instanceof RateLimitError) {
        setCooldownUntil(Date.now() + failure.retryAfter * 1000)
        setNow(Date.now())
        settle((message) => ({ id: message.id, question: message.question, askedAt: message.askedAt, error: failure.message, rateLimited: true }))
        return
      }
      // A closed modal is unmounted; an aborted timeout still presents a retry.
      settle((message) => ({ id: message.id, question: message.question, askedAt: message.askedAt, error: controller.signal.aborted ? 'Kết nối mất quá nhiều thời gian. Bạn có thể gửi lại câu hỏi.' : (failure as Error).message }))
    } finally {
      clearTimeout(timeout)
      // Only the request that owns the busy state may release it; a superseded one must not unlock a newer request.
      if (pending.current === controller) { pending.current = null; setBusy(false) }
    }
  }
  function sendMessage(question = input.trim()) {
    if (!question || question.length > 1000 || pending.current || cooldownUntil > Date.now()) return
    const index = messages.length
    const id = newExchangeId()
    history.update(history.token, (previous) => [...previous, { id, question, askedAt: Date.now() }])
    setVoiceMessage(index)
    setInput('')
    void requestReply(question, id, index)
  }

  function listen(answer: string, index: number) {
    mic.stop(); mic.clearError()
    setVoiceMessage(index)
    if (modeRef.current !== 'voice') switchMode('voice')
    if (speech.activeMessage === index) speech.stop()
    else void speech.play(answer, index)
  }

  function switchMode(next: CharacterInteractionMode) {
    if (next === modeRef.current) return
    speech.stop(); mic.stop(); speech.clearError(); mic.clearError()
    modeRef.current = next; setMode(next)
  }
  function resetConversation() {
    speech.stop(); mic.stop(); speech.clearError(); mic.clearError()
    history.clear(); setVoiceMessage(null); setInput('')
    if (modeRef.current === 'chat') inputRef.current?.focus(); else micRef.current?.focus()
  }
  function startMicrophone() {
    speech.stop(); speech.clearError()
    if (mic.listening) mic.stop(); else mic.start(input)
  }
  function retryMessage(index: number) {
    if (locked) return
    const target = messages[index]
    if (!target) return
    history.update(history.token, (previous) => previous.map((value) => value.id === target.id ? { id: value.id, question: value.question, askedAt: value.askedAt } : value))
    void requestReply(target.question, target.id, index)
  }
  const voiceIndex = voiceMessage ?? (messages.length - 1)
  const voiceExchange = messages[voiceIndex]
  const voiceAnswer = voiceExchange?.reply?.answer || character.greeting
  const voiceNotice = mic.listening ? 'Đang nghe… Nói câu hỏi, kiểm tra nội dung rồi nhấn Gửi.' : mic.error || speech.error || (!mic.supported ? 'Trình duyệt này chưa hỗ trợ mic. Chuyển sang Nhắn tin để nhập câu hỏi.' : '') || historyNote
  function listenButton(answer: string, index: number) {
    const active = speech.activeMessage === index
    return <button type="button" className="chat-listen" disabled={busy} onClick={() => listen(answer, index)} aria-label={active ? 'Dừng đọc' : index === -1 ? 'Nghe lời chào' : `Nghe câu trả lời ${index + 1}`}>
      {active ? <Square size={14} /> : <Volume2 size={14} />}{active ? 'Dừng đọc' : 'Nghe câu trả lời'}
    </button>
  }

  return <dialog ref={dialog} aria-modal="true" aria-labelledby="chat-title" className={`chat-modal chat-modal--${mode}`} onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="chat-header"><div className={`chat-avatar portrait-${character.tone}${speech.phase === 'speaking' ? ' is-speaking' : ''}`}><img src={character.image} alt="" /></div><div><span>{mode === 'voice' ? 'NÓI CHUYỆN CÙNG' : 'NHẮN TIN CÙNG'}</span><h2 id="chat-title">{character.name}</h2></div><button type="button" disabled={busy} onClick={resetConversation} aria-label="Bắt đầu cuộc trò chuyện mới"><RotateCcw size={18} /></button><button type="button" onClick={onClose} aria-label="Đóng trò chuyện"><X size={21} /></button></div>
    <div className="character-mode-switch" role="group" aria-label="Chế độ trò chuyện"><button type="button" aria-pressed={mode === 'chat'} onClick={() => switchMode('chat')}><MessageCircle size={16} /> Nhắn tin</button><button type="button" aria-pressed={mode === 'voice'} onClick={() => switchMode('voice')}><Mic size={16} /> Nói chuyện</button></div>
    {mode === 'voice' ? <>
      <CharacterVoicePanel character={character} activity={activity} studentSpeaking={mic.hearingSpeech}>
        <span className="voice-kicker">{busy ? 'ĐANG TRA CỨU' : 'LỜI NHÂN VẬT'}</span>
        {voiceExchange?.question && <p className="voice-current-question">Em hỏi: {voiceExchange.question}</p>}
        {busy ? <p className="voice-loading" role="status"><LoaderCircle size={18} className="voice-spinner" /> Đang tìm đoạn sách phù hợp…</p> : voiceExchange?.error ? <div className="chat-error" role="alert"><p>{voiceExchange.error}{voiceExchange.rateLimited && cooldown > 0 ? ` Hãy chờ ${cooldown} giây rồi gửi lại nhé.` : ''}</p><button type="button" disabled={locked} onClick={() => retryMessage(voiceIndex)}>Thử gửi lại</button></div> : <p className="voice-answer" aria-live="polite">{voiceAnswer}</p>}
        {voiceExchange?.reply?.notice && <p className="voice-answer-notice">{voiceExchange.reply.notice}</p>}
        {!busy && !voiceExchange?.error && <div className="voice-reading-actions">{listenButton(voiceAnswer, voiceIndex)}<button type="button" onClick={() => switchMode('chat')}><BookOpen size={14} /> Xem văn bản và nguồn</button></div>}
        <div className="voice-prompts" role="group" aria-label="Câu hỏi gợi ý">{!messages.length && character.suggestions.map((question) => <button key={question} type="button" disabled={locked} onClick={() => sendMessage(question)}>{question}</button>)}</div>
      </CharacterVoicePanel>
      <div className="voice-dock">
        <div className="voice-draft"><span>CÂU HỎI CỦA EM</span><p className="voice-transcript" aria-live="polite">{input || (mic.listening ? 'Hãy nói, nhân vật đang lắng nghe em…' : 'Nhấn mic để bắt đầu đặt câu hỏi.')}</p>{input && <button type="button" onClick={() => switchMode('chat')}>Chỉnh nội dung</button>}</div>
        {voiceNotice && <p className="chat-voice-notice" role="status">{voiceNotice}</p>}
        {cooldown > 0 && <p className="chat-cooldown" role="status">Có thể hỏi tiếp sau {cooldown} giây.</p>}
        <div className="voice-main-controls"><button ref={micRef} type="button" className={`voice-mic${mic.listening ? ' is-listening' : ''}`} aria-label={mic.listening ? 'Dừng microphone' : 'Nói câu hỏi'} aria-pressed={mic.listening} disabled={locked || !mic.supported} onClick={startMicrophone}><Mic size={24} /><span>{mic.listening ? 'Đang lắng nghe' : 'Nói câu hỏi'}</span></button><button type="button" className="voice-send" aria-label="Gửi câu hỏi" disabled={locked || !input.trim() || mic.listening} onClick={() => sendMessage()}><ArrowUp size={20} /> Gửi câu hỏi</button></div>
        <div className="chat-voice-controls"><label><input type="checkbox" checked={autoRead} onChange={(event) => { autoReadRef.current = event.target.checked; setAutoRead(event.target.checked); if (!event.target.checked) speech.stop() }} /> Tự đọc câu trả lời</label>{speech.phase !== 'idle' && <button type="button" onClick={speech.stop} aria-label="Dừng giọng nói"><Square size={13} /> Dừng</button>}<span role="status">{speech.phase === 'loading' ? 'Đang tạo giọng đọc…' : speech.phase === 'paused' ? 'Giọng đọc đang tạm dừng' : speech.phase === 'speaking' ? `${character.name} đang nói…` : speech.provider === 'browser' ? 'Giọng đọc của trình duyệt' : 'Giọng mô phỏng'}</span></div>
      </div>
    </> : <div className="chat-conversation">
    <div className="chat-body" role="log" aria-live="polite" aria-label="Nội dung trò chuyện"><div className="chat-note"><MessageCircle size={14} /> Nhân vật mô phỏng · Tra cứu sách giáo khoa</div>{historyNote && <p className="chat-history-note" role="status">{historyNote}</p>}<div className="chat-bubble character-bubble">{character.greeting}{listenButton(character.greeting, -1)}</div>{messages.map((message, index) => <div className="chat-exchange" key={message.id}><div className="chat-bubble user-bubble">{message.question}</div>{timeLabel(message.askedAt) && <time className="chat-time" dateTime={new Date(message.askedAt).toISOString()}>{timeLabel(message.askedAt)}</time>}{message.reply && <><div className="chat-bubble character-bubble chat-answer">{message.reply.answer}{listenButton(message.reply.answer, index)}</div>{message.reply.notice && <p className="chat-notice" role="note">{message.reply.notice}</p>}{message.reply.sources.length > 0 && <div className="chat-sources"><h3>Nguồn trong bài học · {message.reply.mode === 'rag' ? 'AI tóm tắt' : 'Trích đoạn gốc'}</h3>{message.reply.sources.map((source, number) => <article key={source.id}><strong>[{number + 1}] {source.lessonTitle}</strong><small>{sourceLabel(source.source)}</small><button type="button" onClick={() => onOpenLesson(source.lessonId)}><BookOpen size={14} /> Đọc bài học nguồn</button></article>)}</div>}</>}{message.error && <div className="chat-error" role="alert"><p>{message.rateLimited ? (cooldown > 0 ? `${message.error} Hãy chờ ${cooldown} giây rồi gửi lại nhé.` : `${message.error} Giờ bạn có thể gửi lại.`) : message.error}</p><button type="button" disabled={locked} onClick={() => retryMessage(index)}>{cooldown > 0 && message.rateLimited ? `Gửi lại sau ${cooldown}s` : 'Thử gửi lại'}</button></div>}</div>)}{busy && <p className="chat-loading" role="status">Đang tìm đoạn sách phù hợp…</p>}<div ref={bottom} /></div>
    <div className="chat-suggestions" aria-label="Câu hỏi gợi ý">{character.suggestions.map((question) => <button key={question} type="button" disabled={locked} onClick={() => sendMessage(question)}>{question}</button>)}</div>
    {cooldown > 0 && <p className="chat-cooldown" role="status">Bạn đang hỏi hơi nhanh. Có thể hỏi tiếp sau {cooldown} giây.</p>}
    <form onSubmit={(event) => { event.preventDefault(); sendMessage() }} className="chat-form"><label htmlFor="chat-input" className="sr-only">Nhập câu hỏi cho nhân vật</label><textarea id="chat-input" ref={inputRef} value={input} maxLength={1000} rows={2} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage() } }} placeholder="Hãy hỏi một điều bạn tò mò…" /><button type="submit" aria-label="Gửi câu hỏi" disabled={locked || !input.trim()}><ArrowUp size={20} /></button></form>
    </div>}
  </dialog>
}
