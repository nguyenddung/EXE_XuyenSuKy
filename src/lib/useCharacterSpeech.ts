import { useCallback, useEffect, useRef, useState } from 'react'
import profiles from '../../shared/character-voices.json'

type Phase = 'idle' | 'loading' | 'speaking'
const spokenText = (text: string) => text.replace(/\[\d+\]/g, '').trim()

// Voice lists can arrive asynchronously on first use in Chrome.
async function vietnameseVoice(signal: AbortSignal): Promise<SpeechSynthesisVoice | undefined> {
  const synth = window.speechSynthesis
  const choose = () => synth.getVoices().find((voice) => /^vi(?:-|_)?/i.test(voice.lang))
  if (choose()) return choose()
  await new Promise<void>((resolve) => {
    const finish = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', changed); signal.removeEventListener('abort', finish); resolve() }
    const changed = () => { if (choose()) finish() }
    const timer = window.setTimeout(finish, 1200)
    synth.addEventListener('voiceschanged', changed)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted) finish()
  })
  return choose()
}

export function useCharacterSpeech(characterId: string) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeMessage, setActiveMessage] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState<'azure' | 'browser' | null>(null)
  const generation = useRef(0)
  const pending = useRef<AbortController | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const objectUrl = useRef<string | null>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const browserOnly = useRef(false)

  const release = useCallback(() => {
    generation.current++
    pending.current?.abort(); pending.current = null
    if (audio.current) { audio.current.onplaying = null; audio.current.onended = null; audio.current.onerror = null; audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); audio.current = null }
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null }
    if (utterance.current) { utterance.current.onstart = null; utterance.current.onend = null; utterance.current.onerror = null; utterance.current = null; window.speechSynthesis.cancel() }
  }, [])
  const stop = useCallback(() => { release(); setPhase('idle'); setActiveMessage(null) }, [release])
  useEffect(() => { browserOnly.current = false; return release }, [characterId, release])

  const play = useCallback(async (answer: string, message: number) => {
    stop(); setError(''); setProvider(null)
    const text = spokenText(answer)
    if (!text || text.length > 6000) { setError('Câu trả lời quá dài để đọc. Bạn có thể đọc nội dung trên màn hình.'); return }
    const id = generation.current
    const controller = new AbortController()
    pending.current = controller
    setPhase('loading'); setActiveMessage(message)
    const current = () => generation.current === id && !controller.signal.aborted
    const finish = () => { if (current()) stop() }
    const profile = (profiles as Record<string, { voice: string; rate: number; pitch: number }>)[characterId]
    let timeout: number | undefined

    async function playBrowser() {
      if (!('speechSynthesis' in window)) throw new Error('Trình duyệt chưa hỗ trợ đọc giọng nói. Hãy cấu hình Azure để sử dụng chức năng này.')
      const voice = await vietnameseVoice(controller.signal)
      if (!current()) return
      if (!voice) throw new Error('Máy chưa có giọng đọc tiếng Việt. Hãy cài giọng tiếng Việt hoặc cấu hình Azure Speech.')
      setProvider('browser')
      // Short utterances avoid the long-text cutoff in some browser speech engines.
      const words = text.split(/\s+/)
      const chunks: string[] = []
      let chunk = ''
      for (const word of words) {
        if (chunk && chunk.length + word.length > 220) { chunks.push(chunk); chunk = '' }
        chunk += `${chunk ? ' ' : ''}${word}`
      }
      if (chunk) chunks.push(chunk)
      function next(index: number) {
        if (!current()) return
        if (index === chunks.length) { finish(); return }
        const speech = new SpeechSynthesisUtterance(chunks[index])
        utterance.current = speech
        speech.voice = voice!; speech.lang = 'vi-VN'; speech.rate = profile?.rate ?? 1; speech.pitch = profile?.pitch ?? 1
        speech.onstart = () => { if (current()) setPhase('speaking') }
        speech.onend = () => next(index + 1)
        speech.onerror = () => { if (current()) { setError('Chưa phát được giọng đọc. Hãy nhấn Nghe câu trả lời để thử lại.'); finish() } }
        window.speechSynthesis.speak(speech)
      }
      next(0)
    }

    try {
      if (browserOnly.current) { await playBrowser(); return }
      timeout = window.setTimeout(() => controller.abort(), 20000)
      const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: controller.signal })
      if (!current()) return
      if (!response.ok) {
        const body = await response.json().catch((failure) => { if (controller.signal.aborted) throw failure; return null }) as { error?: { code?: string; message?: string } } | null
        if (!current()) return
        if (response.status === 503 && body?.error?.code === 'SPEECH_NOT_CONFIGURED') {
          browserOnly.current = true
          await playBrowser(); return
        }
        throw new Error(body?.error?.message || 'Chưa tạo được giọng đọc. Hãy thử lại sau.')
      }
      const blob = await response.blob()
      clearTimeout(timeout)
      if (!current()) return
      if (!blob.size || !blob.type.startsWith('audio/')) throw new Error('Chưa nhận được âm thanh phù hợp.')
      const url = URL.createObjectURL(blob)
      objectUrl.current = url
      const player = new Audio(url)
      audio.current = player
      setProvider('azure')
      player.onplaying = () => { if (current()) setPhase('speaking') }
      player.onended = finish
      player.onerror = () => { if (current()) { setError('Không phát được âm thanh. Hãy nhấn Nghe câu trả lời để thử lại.'); finish() } }
      await player.play()
    } catch (failure) {
      if (generation.current !== id) return
      setError(controller.signal.aborted ? 'Tạo giọng đọc mất quá nhiều thời gian. Hãy thử lại.' : (failure as Error).name === 'NotAllowedError' ? 'Trình duyệt đang chặn tự phát âm thanh. Hãy nhấn Nghe câu trả lời.' : (failure as Error).message)
      stop()
    } finally {
      clearTimeout(timeout)
    }
  }, [characterId, stop])

  return { phase, activeMessage, provider, error, play, stop, clearError: () => setError('') }
}
