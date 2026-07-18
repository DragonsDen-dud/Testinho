import { useCallback, useRef, useState } from 'react'
import { SPEECH_RECOGNITION_SUPPORTED } from './speechRecognition'

/**
 * Article 10 — recognition lifecycle only. Merging the transcript into a
 * text field's state is the caller's job (via `appendTranscript` inside a
 * functional setState updater), so this hook stays agnostic of where the
 * text actually lands.
 */
export function useSpeechToText(onTranscript: (transcript: string) => void, lang: string) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const toggle = useCallback(() => {
    if (!SPEECH_RECOGNITION_SUPPORTED) return

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const Ctor = window.webkitSpeechRecognition!
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      if (last?.isFinal && last[0]?.transcript) {
        onTranscriptRef.current(last[0].transcript.trim())
      }
    }
    // Fail silently (Article 10): permission denied, no mic, or a network
    // hiccup on browsers that route recognition through a server all land
    // here. No error toast — manual typing / the native keyboard's own
    // dictation is always right there as the real fallback.
    recognition.onerror = () => {
      recognitionRef.current = null
      setListening(false)
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [lang])

  return { listening, toggle }
}
