import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, BookOpen, MessageCircle, RotateCcw, X } from 'lucide-react'
import type { Character } from '../types'
import { askCharacter, type CharacterReply } from '../lib/characterApi'
import { sourceLabel } from '../lib/historyApi'

interface Props { character: Character; onClose: () => void; onOpenLesson: (id: string) => void }
interface Exchange { question: string; reply?: CharacterReply; error?: string }

export function CharacterChatModal({ character, onClose, onOpenLesson }: Props) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Exchange[]>([])
  const [busy, setBusy] = useState(false)
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

  // Native modal dialogs let Tab escape to the browser chrome after the last control; keep focus cycling inside.
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab' || !dialog.current) return
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !dialog.current.contains(active))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (active === last || !dialog.current.contains(active))) { event.preventDefault(); first.focus() }
  }

  async function requestReply(question: string, index: number) {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    const history = messages.slice(0, index).filter((message) => message.reply).slice(-3).flatMap((message) => [{ role: 'user' as const, content: message.question }, { role: 'assistant' as const, content: message.reply!.answer.slice(0, 2000) }])
    try {
      const reply = await askCharacter(character.id, question, history, controller.signal)
      if (!controller.signal.aborted) setMessages((previous) => previous.map((message, item) => item === index ? { question, reply } : message))
    } catch (failure) {
      // A closed modal is unmounted; an aborted timeout still presents a retry.
      setMessages((previous) => previous.map((message, item) => item === index ? { question, error: controller.signal.aborted ? 'Kết nối mất quá nhiều thời gian. Bạn có thể gửi lại câu hỏi.' : (failure as Error).message } : message))
    } finally {
      clearTimeout(timeout)
      pending.current = null
      setBusy(false)
    }
  }
  function sendMessage(question = input.trim()) {
    if (!question || question.length > 1000 || pending.current) return
    const index = messages.length
    setMessages((previous) => [...previous, { question }])
    setInput('')
    void requestReply(question, index)
  }

  return <dialog ref={dialog} aria-modal="true" aria-labelledby="chat-title" className="chat-modal" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="chat-header"><div className={`chat-avatar portrait-${character.tone}`}><img src={character.image} alt="" /></div><div><span>TRÒ CHUYỆN CÙNG</span><h2 id="chat-title">{character.name}</h2></div><button type="button" disabled={busy} onClick={() => { setMessages([]); setInput(''); inputRef.current?.focus() }} aria-label="Bắt đầu cuộc trò chuyện mới"><RotateCcw size={18} /></button><button type="button" onClick={onClose} aria-label="Đóng trò chuyện"><X size={21} /></button></div>
    <div className="chat-body" role="log" aria-live="polite" aria-label="Nội dung trò chuyện"><div className="chat-note"><MessageCircle size={14} /> Nhân vật mô phỏng · Tra cứu sách giáo khoa</div><div className="chat-bubble character-bubble">{character.greeting}</div>{messages.map((message, index) => <div className="chat-exchange" key={index}><div className="chat-bubble user-bubble">{message.question}</div>{message.reply && <><div className="chat-bubble character-bubble chat-answer">{message.reply.answer}</div>{message.reply.sources.length > 0 && <div className="chat-sources"><h3>Nguồn trong bài học · {message.reply.mode === 'rag' ? 'AI tóm tắt' : 'Trích đoạn gốc'}</h3>{message.reply.sources.map((source, number) => <article key={source.id}><strong>[{number + 1}] {source.lessonTitle}</strong><small>{sourceLabel(source.source)}</small><button type="button" onClick={() => onOpenLesson(source.lessonId)}><BookOpen size={14} /> Đọc bài học nguồn</button></article>)}</div>}</>}{message.error && <div className="chat-error" role="alert"><p>{message.error}</p><button type="button" disabled={busy} onClick={() => { setMessages((previous) => previous.map((value, item) => item === index ? { question: value.question } : value)); void requestReply(message.question, index) }}>Thử gửi lại</button></div>}</div>)}{busy && <p className="chat-loading" role="status">Đang tìm đoạn sách phù hợp…</p>}<div ref={bottom} /></div>
    <div className="chat-suggestions" aria-label="Câu hỏi gợi ý">{character.suggestions.map((question) => <button key={question} type="button" disabled={busy} onClick={() => sendMessage(question)}>{question}</button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); sendMessage() }} className="chat-form"><label htmlFor="chat-input" className="sr-only">Nhập câu hỏi cho nhân vật</label><textarea id="chat-input" ref={inputRef} value={input} maxLength={1000} rows={2} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage() } }} placeholder="Hãy hỏi một điều bạn tò mò…" /><button type="submit" aria-label="Gửi câu hỏi" disabled={busy || !input.trim()}><ArrowUp size={20} /></button></form>
  </dialog>
}
