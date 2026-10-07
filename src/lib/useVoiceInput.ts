import { useCallback, useEffect, useRef, useState } from 'react'

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}
type RecognitionConstructor = new () => Recognition
function recognitionConstructor() {
  const browser = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return browser.SpeechRecognition || browser.webkitSpeechRecognition
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<Recognition | null>(null)
  const callback = useRef(onTranscript)
  callback.current = onTranscript
  const release = useCallback(() => {
    const recognition = active.current
    active.current = null
    if (recognition) { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.abort() }
  }, [])
  const stop = useCallback(() => { release(); setListening(false) }, [release])
  useEffect(() => release, [release])

  function start(existingText: string) {
    stop(); setError('')
    const Constructor = recognitionConstructor()
    if (!Constructor) { setError('Trình duyệt chưa hỗ trợ nhập bằng mic. Bạn vẫn có thể nhập câu hỏi.'); return }
    const recognition = new Constructor()
    active.current = recognition
    recognition.lang = 'vi-VN'; recognition.continuous = false; recognition.interimResults = true
    recognition.onresult = (event) => {
      if (active.current !== recognition) return
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ')
      callback.current(`${existingText.trim()}${existingText.trim() ? ' ' : ''}${transcript}`.slice(0, 1000))
    }
    recognition.onerror = (event) => {
      if (active.current !== recognition) return
      const messages: Record<string, string> = {
        'not-allowed': 'Chưa được phép dùng mic. Hãy cho phép microphone trong cài đặt trình duyệt.',
        'service-not-allowed': 'Trình duyệt chưa cho phép nhận dạng giọng nói.',
        'audio-capture': 'Không tìm thấy mic. Hãy kiểm tra kết nối microphone.',
        'no-speech': 'Chưa nghe rõ câu hỏi. Hãy nhấn mic để nói lại.',
        network: 'Nhận dạng giọng nói cần kết nối mạng. Hãy thử lại.',
      }
      if (event.error !== 'aborted') setError(messages[event.error] || 'Chưa nhận dạng được câu hỏi. Bạn có thể nhập bằng bàn phím.')
      stop()
    }
    recognition.onend = () => { if (active.current === recognition) { active.current = null; setListening(false) } }
    try { recognition.start(); setListening(true) } catch { stop(); setError('Chưa bật được mic. Hãy kiểm tra quyền microphone rồi thử lại.') }
  }

  return { supported: !!recognitionConstructor(), listening, error, start, stop, clearError: () => setError('') }
}
