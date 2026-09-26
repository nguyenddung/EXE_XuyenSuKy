import { useEffect, useRef, useState } from 'react'
import { ArrowUp, MessageCircle, X } from 'lucide-react'
import type { Character } from '../types'

interface Props { character: Character; onClose: () => void }
const demoReply = 'Đây là bản demo. Tính năng AI nhân vật lịch sử sẽ được tích hợp ở phiên bản tiếp theo.'

export function CharacterChatModal({ character, onClose }: Props) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', handleEscape); document.body.style.overflow = previousOverflow }
  }, [onClose])

  function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    const question = input.trim()
    if (!question) return
    setMessages(previous => [...previous, question])
    setInput('')
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="chat-title" className="chat-modal">
      <div className="chat-header"><div className={`chat-avatar portrait-${character.tone}`}>{character.avatar}</div><div><span>TRÒ CHUYỆN CÙNG</span><h2 id="chat-title">{character.name}</h2></div><button type="button" onClick={onClose} aria-label="Đóng trò chuyện"><X size={21} /></button></div>
      <div className="chat-body" aria-live="polite"><div className="chat-note"><MessageCircle size={14} /> Bản xem thử · Câu trả lời được mô phỏng</div><div className="chat-bubble character-bubble">{character.greeting}</div>{messages.map((message, index) => <div className="chat-exchange" key={`${index}-${message}`}><div className="chat-bubble user-bubble">{message}</div><div className="chat-bubble character-bubble">{demoReply}</div></div>)}</div>
      <form onSubmit={sendMessage} className="chat-form"><label htmlFor="chat-input" className="sr-only">Nhập câu hỏi cho nhân vật</label><input id="chat-input" ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Hãy hỏi một điều bạn tò mò..." /><button type="submit" aria-label="Gửi câu hỏi" disabled={!input.trim()}><ArrowUp size={20} /></button></form>
    </section>
  </div>
}
