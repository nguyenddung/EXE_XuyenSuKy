import { useCallback, useEffect, useRef, useState } from 'react'

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
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
  const [hearingSpeech, setHearingSpeech] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<Recognition | null>(null)
  const quietTimer = useRef<number | undefined>(undefined)
  const callback = useRef(onTranscript)
  callback.current = onTranscript
  const release = useCallback((abort = true) => {
    window.clearTimeout(quietTimer.current)
    const recognition = active.current
    active.current = null
    if (recognition) {
      recognition.onresult = null; recognition.onerror = null; recognition.onend = null
      recognition.onspeechstart = null; recognition.onspeechend = null
      if (abort) recognition.abort()
    }
  }, [])
  const stop = useCallback(() => { release(); setListening(false); setHearingSpeech(false) }, [release])
  useEffect(() => release, [release])

  function start(existingText: string) {
    stop(); setError('')
    const Constructor = recognitionConstructor()
    if (!Constructor) { setError('Trình duyệt chưa hỗ trợ nhập bằng mic. Bạn vẫn có thể nhập câu hỏi.'); return }
    const recognition = new Constructor()
    let tracksSpeech = false
    active.current = recognition
    recognition.lang = 'vi-VN'; recognition.continuous = false; recognition.interimResults = true
    const speechEnded = () => {
      if (active.current !== recognition) return
      window.clearTimeout(quietTimer.current)
      setHearingSpeech(false)
    }
    recognition.onspeechstart = () => {
      if (active.current !== recognition) return
      tracksSpeech = true
      window.clearTimeout(quietTimer.current)
      setHearingSpeech(true)
    }
    recognition.onspeechend = () => { tracksSpeech = true; speechEnded() }
    recognition.onresult = (event) => {
      if (active.current !== recognition) return
      // Some recognizers omit speechstart/speechend. Interim results still give feedback,
      // with a short quiet timeout so the mouth cannot stay open after recognition stalls.
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ')
      if (!tracksSpeech && transcript.trim()) {
        setHearingSpeech(true)
        window.clearTimeout(quietTimer.current)
        quietTimer.current = window.setTimeout(speechEnded, 1000)
      }
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
    recognition.onend = () => {
      if (active.current !== recognition) return
      release(false); setListening(false); setHearingSpeech(false)
    }
    try { recognition.start(); setListening(true) } catch { stop(); setError('Chưa bật được mic. Hãy kiểm tra quyền microphone rồi thử lại.') }
  }

  return { supported: !!recognitionConstructor(), listening, hearingSpeech, error, start, stop, clearError: () => setError('') }
}
