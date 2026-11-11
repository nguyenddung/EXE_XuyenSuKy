import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, LogIn, Send } from 'lucide-react'
import { companionSuggestions, localAnswer, readConversation, writeConversation, type CompanionAction, type CompanionMessage, type StudyStats } from '../lib/companion'
import { askCompanion } from '../lib/companionApi'
import { RateLimitError } from '../lib/characterApi'
import { newExchangeId } from '../lib/chatHistory'

interface Props {
  owner: string | null
  name: string
  /** Chatting is for signed-in members, like the AI characters; guests are invited to sign in. */
  loggedIn: boolean
  grade?: number
  /** The lesson the student read last: the companion looks there first. */
  lessonId?: string
  stats: StudyStats
  greeting: string
  onSignIn: () => void
  onAction: (action: CompanionAction) => void
  /** A reply arrived (the companion cheers). */
  onReply: () => void
}

const contextTurns = 6
const timeoutMs = 25000

/** The conversation with the companion: questions about the app, the lessons and how to study. */
export function CompanionChat({ owner, name, loggedIn, grade, lessonId, stats, greeting, onSignIn, onAction, onReply }: Props) {
  const [messages, setMessages] = useState<CompanionMessage[]>(() => readConversation(owner))
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [unsaved, setUnsaved] = useState(false)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [messages, pending])

  if (!loggedIn) return <div className="companion-chat">
    <div className="companion-log"><p className="companion-message">{greeting}</p></div>
    <div className="companion-signin">
      <p>Đăng nhập để trò chuyện với {name}. Giống Nhân vật AI, trò chuyện chỉ dành cho tài khoản đã đăng nhập.</p>
      <button type="button" className="companion-primary" onClick={onSignIn}><LogIn size={16} /> Đăng nhập để trò chuyện</button>
    </div>
  </div>

  // Kept even if the panel closes before the answer arrives: the next opening shows it.
  function commit(next: CompanionMessage[]) {
    setMessages(next)
    setUnsaved(owner === null || !writeConversation(owner, next))
  }

  async function send(raw: string) {
    const question = raw.replace(/\s+/g, ' ').trim()
    if (!question || pending) return
    if (question.length > 1000) { setError('Câu hỏi dài tối đa 1.000 ký tự.'); return }
    setError('')
    setDraft('')
    const asked: CompanionMessage = { id: newExchangeId(), role: 'user', text: question, at: Date.now() }
    const withQuestion = [...messages, asked]
    commit(withQuestion)
    // Progress questions are answered from this browser's data, without a request.
    const local = localAnswer(question, stats)
    if (local) {
      commit([...withQuestion, { id: newExchangeId(), role: 'companion', text: local.text, at: Date.now(), ...(local.action ? { action: local.action } : {}) }])
      onReply()
      return
    }
    setPending(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const history = messages.slice(-contextTurns).map((message) => ({ role: message.role === 'user' ? 'user' as const : 'assistant' as const, content: message.text.slice(0, 2000) }))
      const reply = await askCompanion({ message: question, history, name, ...(grade ? { grade } : {}), ...(lessonId ? { lessonId } : {}) }, controller.signal)
      const sources = reply.sources.slice(0, 5).map((source) => ({ lessonId: source.lessonId ?? null, lessonTitle: source.lessonTitle, grade: source.grade, book: source.source.book, pageStart: source.source.pageStart, pageEnd: source.source.pageEnd }))
      commit([...withQuestion, { id: newExchangeId(), role: 'companion', text: reply.answer, at: Date.now(), ...(sources.length ? { sources } : {}), ...(reply.action ? { action: reply.action } : {}), ...(reply.notice ? { notice: reply.notice } : {}) }])
      onReply()
    } catch (problem) {
      setError(problem instanceof RateLimitError ? `Bạn hỏi hơi nhanh rồi. Đợi khoảng ${problem.retryAfter} giây rồi hỏi tiếp nhé.` : (problem as Error).name === 'AbortError' ? 'Mình nghĩ lâu quá. Bạn gửi lại câu hỏi nhé.' : (problem as Error).message)
    } finally {
      window.clearTimeout(timer)
      setPending(false)
    }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(draft) }

  return <div className="companion-chat">
    <div className="companion-log" ref={log} role="log" aria-live="polite" aria-label={`Trò chuyện với ${name}`}>
      <p className="companion-message">{greeting}</p>
      {messages.map((message) => message.role === 'user'
        ? <p key={message.id} className="companion-ask">{message.text}</p>
        : <div key={message.id} className="companion-message companion-answer">
          <p>{message.text}</p>
          {message.sources && <ol className="companion-sources" aria-label="Nguồn">
            {message.sources.map((source, index) => <li key={index}>{source.book} · Bài "{source.lessonTitle}" · trang {source.pageStart === source.pageEnd ? source.pageStart : `${source.pageStart}–${source.pageEnd}`}</li>)}
          </ol>}
          {message.action && <button type="button" className="companion-action" onClick={() => onAction(message.action!)}>{message.action.label} <ArrowRight size={14} /></button>}
          {message.notice && <small className="companion-notice">{message.notice}</small>}
        </div>)}
      {pending && <p className="companion-message companion-typing" role="status" aria-label={`${name} đang trả lời`}><span /><span /><span /></p>}
    </div>
    {!messages.length && <div className="companion-suggestions companion-starters" role="group" aria-label="Câu hỏi gợi ý">
      {companionSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}
    </div>}
    {error && <p className="companion-error" role="alert">{error}</p>}
    {unsaved && <p className="companion-hint">Trình duyệt chưa cho lưu cuộc trò chuyện, nên nó sẽ mất khi tải lại trang.</p>}
    <form className="companion-ask-form" onSubmit={submit}>
      <input id="companion-input" value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`Câu hỏi cho ${name}`} placeholder={`Hỏi ${name} điều gì đó…`} maxLength={1000} autoComplete="off" />
      <button type="submit" aria-label="Gửi" disabled={pending || !draft.trim()}><Send size={16} /></button>
    </form>
  </div>
}
