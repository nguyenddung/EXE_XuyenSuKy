import { useEffect, useRef, useState } from 'react'
import { ConversationProvider, useConversationClientTool, useConversationControls, useConversationInput, useConversationMode, useConversationStatus, type MessagePayload } from '@elevenlabs/react'
import { LoaderCircle, Mic, MicOff, PhoneOff } from 'lucide-react'
import type { Character } from '../types'
import type { CharacterActivity } from '../lib/animatedCharacters'
import { CharacterVoicePanel } from './CharacterVoicePanel'
import '../live-voice.css'

// Live, hands-free conversation with the character's ElevenLabs voice agent: the student talks, the character answers
// out loud, turn after turn, until one of them ends the call. The server hands out a one-time signed URL per call.

interface Props { character: Character; onFallback: () => void; onShowText: () => void }
interface Line { id: number; role: 'user' | 'agent'; text: string }
type SearchHit = { lessonTitle: string; sectionTitle: string; grade: number; text: string }

class SessionError extends Error {}
async function requestSignedUrl(characterId: string) {
  const response = await fetch(`/api/characters/${characterId}/voice-session`, { method: 'POST', headers: { Accept: 'application/json' } })
  if (response.status === 429) throw new SessionError(`Em đang gọi hơi nhiều. Hãy thử lại sau ${Number(response.headers.get('Retry-After')) || 60} giây.`)
  const body = await response.json().catch(() => null) as { signedUrl?: string; error?: { message?: string } } | null
  if (!response.ok || !body?.signedUrl) throw new SessionError(body?.error?.message || `Chưa mở được cuộc trò chuyện (HTTP ${response.status}).`)
  return body.signedUrl
}

// The agent calls this browser-side tool before stating facts, so its answers come from the same textbook dataset as the chat.
async function searchTextbook({ query }: { query?: unknown }) {
  const q = typeof query === 'string' ? query.trim().slice(0, 200) : ''
  if (q.length < 2) return JSON.stringify({ ket_qua: [], ghi_chu: 'Từ khóa quá ngắn.' })
  const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=4`, { headers: { Accept: 'application/json' } })
  if (!response.ok) return JSON.stringify({ ket_qua: [], ghi_chu: 'Không tra cứu được sách lúc này.' })
  const { items } = await response.json() as { items: SearchHit[] }
  return JSON.stringify({ ket_qua: items.map((hit) => ({ bai: hit.lessonTitle, muc: hit.sectionTitle, lop: hit.grade, noi_dung: hit.text.slice(0, 700) })), ghi_chu: items.length ? undefined : 'Sách giáo khoa không có đoạn nào khớp.' })
}

export default function CharacterLiveVoice(props: Props) {
  const [lines, setLines] = useState<Line[]>([])
  const [failure, setFailure] = useState('')
  const onMessage = ({ message, role, event_id: id }: MessagePayload) => { if (message.trim()) setLines((previous) => [...previous.filter((line) => !(line.id === id && line.role === role)), { id, role, text: message }].slice(-6)) }
  return <ConversationProvider onMessage={onMessage} onError={(message) => setFailure(message || 'Cuộc trò chuyện bị gián đoạn.')}>
    <LiveVoice {...props} lines={lines} failure={failure} setFailure={setFailure} clearLines={() => setLines([])} />
  </ConversationProvider>
}

function LiveVoice({ character, onFallback, onShowText, lines, failure, setFailure, clearLines }: Props & { lines: Line[]; failure: string; setFailure: (text: string) => void; clearLines: () => void }) {
  const { startSession, endSession, getInputVolume } = useConversationControls()
  const { status } = useConversationStatus()
  const { isSpeaking } = useConversationMode()
  const { isMuted, setMuted } = useConversationInput()
  const [opening, setOpening] = useState(false)
  const [lookups, setLookups] = useState(0)
  const [studentSpeaking, setStudentSpeaking] = useState(false)
  const startButton = useRef<HTMLButtonElement>(null)
  const connected = status === 'connected'

  useConversationClientTool('tra_cuu_sach_giao_khoa', async (parameters: { query?: unknown }) => {
    setLookups((count) => count + 1)
    try { return await searchTextbook(parameters) } finally { setLookups((count) => count - 1) }
  })
  useEffect(() => { startButton.current?.focus() }, [])
  useEffect(() => () => endSession(), [endSession])
  // Drives the portrait's "student is talking" animation from the microphone level.
  useEffect(() => {
    if (!connected || isSpeaking || isMuted) { setStudentSpeaking(false); return }
    const timer = window.setInterval(() => setStudentSpeaking(getInputVolume() > 0.06), 150)
    return () => window.clearInterval(timer)
  }, [connected, isSpeaking, isMuted, getInputVolume])

  async function start() {
    if (opening || connected) return
    setFailure(''); clearLines(); setOpening(true)
    try { startSession({ signedUrl: await requestSignedUrl(character.id) }) }
    catch (error) { setFailure(error instanceof SessionError ? error.message : 'Chưa mở được cuộc trò chuyện. Kiểm tra kết nối mạng rồi thử lại.') }
    finally { setOpening(false) }
  }

  const busy = opening || status === 'connecting'
  const activity: CharacterActivity = busy ? 'loading' : !connected ? 'idle' : isSpeaking ? 'speaking' : lookups > 0 ? 'thinking' : 'listening'
  const statusText = busy ? 'Đang kết nối… Hãy cho phép dùng micro khi trình duyệt hỏi.'
    : !connected ? 'Nhấn “Bắt đầu trò chuyện”, rồi cứ nói tự nhiên như gọi điện. Nhân vật sẽ trả lời bằng giọng nói.'
    : isSpeaking ? `${character.name} đang nói… Em có thể nói chen vào bất cứ lúc nào.`
    : lookups > 0 ? `${character.name} đang lật sách tra cứu…`
    : isMuted ? 'Micro đang tắt. Bật lại để nói tiếp.' : 'Đang lắng nghe em…'

  return <>
    <CharacterVoicePanel character={character} activity={activity} studentSpeaking={studentSpeaking}>
      <span className="voice-kicker">TRÒ CHUYỆN TRỰC TIẾP</span>
      {lines.length ? <ol className="live-voice-lines" aria-live="polite">{lines.map((line) => <li key={`${line.role}-${line.id}`} className={`live-voice-line live-voice-line--${line.role}`}><span>{line.role === 'user' ? 'Em' : character.name}</span><p>{line.text}</p></li>)}</ol>
        : <p className="voice-answer">{character.greeting}</p>}
      {!connected && <div className="voice-prompts" aria-label="Gợi ý câu hỏi">{character.suggestions.map((question) => <p key={question} className="live-voice-hint">“{question}”</p>)}</div>}
    </CharacterVoicePanel>
    <div className="voice-dock">
      <p className="live-voice-status" role="status">{busy && <LoaderCircle size={16} className="voice-spinner" />}{statusText}</p>
      {failure && <div className="chat-error" role="alert"><p>{failure}</p><button type="button" onClick={onFallback}>Hỏi từng câu bằng mic</button></div>}
      <div className="voice-main-controls">
        {connected ? <>
          <button type="button" className="voice-send" aria-pressed={isMuted} onClick={() => setMuted(!isMuted)}>{isMuted ? <MicOff size={20} /> : <Mic size={20} />}{isMuted ? 'Bật micro' : 'Tắt micro'}</button>
          <button type="button" className="voice-mic is-listening" onClick={endSession}><PhoneOff size={20} /> Kết thúc</button>
        </> : <button ref={startButton} type="button" className="voice-mic" disabled={busy} onClick={() => void start()}><Mic size={24} /><span>{busy ? 'Đang kết nối…' : lines.length ? 'Trò chuyện tiếp' : 'Bắt đầu trò chuyện'}</span></button>}
      </div>
      <div className="chat-voice-controls"><button type="button" onClick={onShowText}>Nhắn tin kèm nguồn sách</button><button type="button" disabled={connected || busy} onClick={onFallback}>Hỏi từng câu bằng mic</button><span>Nhân vật mô phỏng · Giọng ElevenLabs</span></div>
    </div>
  </>
}
