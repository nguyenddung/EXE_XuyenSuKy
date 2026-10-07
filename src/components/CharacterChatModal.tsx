import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, BookOpen, LoaderCircle, MessageCircle, Mic, RotateCcw, Square, Volume2, X } from 'lucide-react'
import type { Character } from '../types'
import { askCharacter, RateLimitError, type CharacterReply } from '../lib/characterApi'
import { sourceLabel } from '../lib/historyApi'
import { useCharacterSpeech } from '../lib/useCharacterSpeech'
import { useVoiceInput } from '../lib/useVoiceInput'

interface Props { character: Character; onClose: () => void; onOpenLesson: (id: string) => void }
interface Exchange { question: string; reply?: CharacterReply; error?: string; rateLimited?: boolean }

export function CharacterChatModal({ character, onClose, onOpenLesson }: Props) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Exchange[]>([])
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
  const dialog = useRef<HTMLDialogElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const pending = useRef<AbortController | null>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current
    element?.showModal()
    inputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { pending.current?.abort(); element?.close(); document.body.style.overflow = previousOverflow; previous?.focus() }
  }, [])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages, busy])
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
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !dialog.current.contains(active))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (active === last || !dialog.current.contains(active))) { event.preventDefault(); first.focus() }
  }

  async function requestReply(question: string, index: number) {
    if (pending.current || cooldownUntil > Date.now()) return
    speech.stop(); mic.stop(); speech.clearError(); mic.clearError()
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    const history = messages.slice(0, index).filter((message) => message.reply).slice(-3).flatMap((message) => [{ role: 'user' as const, content: message.question }, { role: 'assistant' as const, content: message.reply!.answer.slice(0, 2000) }])
    try {
      const reply = await askCharacter(character.id, question, history, controller.signal)
      if (!controller.signal.aborted) {
        setMessages((previous) => previous.map((message, item) => item === index ? { question, reply } : message))
        if (autoReadRef.current) void speech.play(reply.answer, index)
      }
    } catch (failure) {
      if (failure instanceof RateLimitError) {
        setCooldownUntil(Date.now() + failure.retryAfter * 1000)
        setNow(Date.now())
        setMessages((previous) => previous.map((message, item) => item === index ? { question, error: failure.message, rateLimited: true } : message))
        return
      }
      // A closed modal is unmounted; an aborted timeout still presents a retry.
      setMessages((previous) => previous.map((message, item) => item === index ? { question, error: controller.signal.aborted ? 'Kết nối mất quá nhiều thời gian. Bạn có thể gửi lại câu hỏi.' : (failure as Error).message } : message))
    } finally {
      clearTimeout(timeout)
      pending.current = null
      setBusy(false)
    }
  }
  function sendMessage(question = input.trim()) {
    if (!question || question.length > 1000 || pending.current || cooldownUntil > Date.now()) return
    const index = messages.length
    setMessages((previous) => [...previous, { question }])
    setInput('')
    void requestReply(question, index)
  }

  function listen(answer: string, index: number) {
    mic.stop(); mic.clearError()
    if (speech.activeMessage === index) speech.stop()
    else void speech.play(answer, index)
  }
  function listenButton(answer: string, index: number) {
    const active = speech.activeMessage === index
    return <button type="button" className="chat-listen" disabled={busy} onClick={() => listen(answer, index)} aria-label={active ? 'Dừng đọc' : index === -1 ? 'Nghe lời chào' : `Nghe câu trả lời ${index + 1}`}>
      {active ? <Square size={14} /> : <Volume2 size={14} />}{active ? 'Dừng đọc' : 'Nghe câu trả lời'}
    </button>
  }

  return <dialog ref={dialog} aria-modal="true" aria-labelledby="chat-title" className="chat-modal" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="chat-header"><div className={`chat-avatar portrait-${character.tone}${speech.phase === 'speaking' ? ' is-speaking' : ''}`}><img src={character.image} alt="" /></div><div><span>TRÒ CHUYỆN CÙNG</span><h2 id="chat-title">{character.name}</h2></div><button type="button" disabled={busy} onClick={() => { speech.stop(); mic.stop(); speech.clearError(); mic.clearError(); setMessages([]); setInput(''); inputRef.current?.focus() }} aria-label="Bắt đầu cuộc trò chuyện mới"><RotateCcw size={18} /></button><button type="button" onClick={onClose} aria-label="Đóng trò chuyện"><X size={21} /></button></div>
    <div className="chat-voice-controls">
      <label><input type="checkbox" checked={autoRead} onChange={(event) => { autoReadRef.current = event.target.checked; setAutoRead(event.target.checked); if (!event.target.checked) speech.stop() }} /> Tự đọc câu trả lời</label>
      {speech.phase !== 'idle' && <button type="button" onClick={speech.stop} aria-label="Dừng giọng nói"><Square size={13} /> Dừng</button>}
      <span role="status">{speech.phase === 'loading' ? <><LoaderCircle size={13} className="voice-spinner" /> Đang tạo giọng đọc…</> : speech.phase === 'speaking' ? `${character.name} đang nói…` : speech.provider === 'browser' ? 'Giọng đọc của trình duyệt' : 'Giọng mô phỏng'}</span>
    </div>
    {(speech.error || mic.error || mic.listening || !mic.supported) && <p className="chat-voice-notice" role="status">{mic.listening ? 'Đang nghe… Nói câu hỏi, kiểm tra nội dung rồi nhấn Gửi.' : mic.error || speech.error || 'Trình duyệt này chưa hỗ trợ nhập bằng mic. Bạn có thể nhập câu hỏi.'}</p>}
    <div className="chat-body" role="log" aria-live="polite" aria-label="Nội dung trò chuyện"><div className="chat-note"><MessageCircle size={14} /> Nhân vật mô phỏng · Tra cứu sách giáo khoa</div><div className="chat-bubble character-bubble">{character.greeting}{listenButton(character.greeting, -1)}</div>{messages.map((message, index) => <div className="chat-exchange" key={index}><div className="chat-bubble user-bubble">{message.question}</div>{message.reply && <><div className="chat-bubble character-bubble chat-answer">{message.reply.answer}{listenButton(message.reply.answer, index)}</div>{message.reply.notice && <p className="chat-notice" role="note">{message.reply.notice}</p>}{message.reply.sources.length > 0 && <div className="chat-sources"><h3>Nguồn trong bài học · {message.reply.mode === 'rag' ? 'AI tóm tắt' : 'Trích đoạn gốc'}</h3>{message.reply.sources.map((source, number) => <article key={source.id}><strong>[{number + 1}] {source.lessonTitle}</strong><small>{sourceLabel(source.source)}</small><button type="button" onClick={() => onOpenLesson(source.lessonId)}><BookOpen size={14} /> Đọc bài học nguồn</button></article>)}</div>}</>}{message.error && <div className="chat-error" role="alert"><p>{message.rateLimited ? (cooldown > 0 ? `${message.error} Hãy chờ ${cooldown} giây rồi gửi lại nhé.` : `${message.error} Giờ bạn có thể gửi lại.`) : message.error}</p><button type="button" disabled={locked} onClick={() => { setMessages((previous) => previous.map((value, item) => item === index ? { question: value.question } : value)); void requestReply(message.question, index) }}>{cooldown > 0 && message.rateLimited ? `Gửi lại sau ${cooldown}s` : 'Thử gửi lại'}</button></div>}</div>)}{busy && <p className="chat-loading" role="status">Đang tìm đoạn sách phù hợp…</p>}<div ref={bottom} /></div>
    <div className="chat-suggestions" aria-label="Câu hỏi gợi ý">{character.suggestions.map((question) => <button key={question} type="button" disabled={locked} onClick={() => sendMessage(question)}>{question}</button>)}</div>
    {cooldown > 0 && <p className="chat-cooldown" role="status">Bạn đang hỏi hơi nhanh. Có thể hỏi tiếp sau {cooldown} giây.</p>}
    <form onSubmit={(event) => { event.preventDefault(); sendMessage() }} className="chat-form"><label htmlFor="chat-input" className="sr-only">Nhập câu hỏi cho nhân vật</label><textarea id="chat-input" ref={inputRef} value={input} readOnly={mic.listening} maxLength={1000} rows={2} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage() } }} placeholder="Hãy hỏi một điều bạn tò mò…" /><button type="button" className={`chat-mic${mic.listening ? ' is-listening' : ''}`} aria-label={mic.listening ? 'Dừng microphone' : 'Nói câu hỏi'} aria-pressed={mic.listening} title={mic.supported ? 'Nhập câu hỏi bằng giọng nói' : 'Trình duyệt chưa hỗ trợ nhận dạng giọng nói'} disabled={busy || !mic.supported} onClick={() => { speech.stop(); speech.clearError(); if (mic.listening) mic.stop(); else mic.start(input) }}><Mic size={20} /></button><button type="submit" aria-label="Gửi câu hỏi" disabled={locked || !input.trim()}><ArrowUp size={20} /></button></form>
  </dialog>
}
