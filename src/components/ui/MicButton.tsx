import { useTranslation } from 'react-i18next'
import { SPEECH_RECOGNITION_SUPPORTED } from '../../lib/speechRecognition'
import { useSpeechToText } from '../../lib/useSpeechToText'

/**
 * Article 10 — augments a text field, never replaces it. Renders nothing at
 * all when the browser doesn't support speech recognition: no disabled
 * state, no tooltip explaining why it's missing, per spec.
 */
export function MicButton({
  onTranscript,
  lang,
  className,
}: {
  onTranscript: (transcript: string) => void
  lang: string
  className?: string
}) {
  const { t } = useTranslation()
  const { listening, toggle } = useSpeechToText(onTranscript, lang)

  if (!SPEECH_RECOGNITION_SUPPORTED) return null

  return (
    <button
      type="button"
      aria-label={listening ? t('voice.stopListening') : t('voice.startListening')}
      aria-pressed={listening}
      onClick={toggle}
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors ${
        listening
          ? 'bg-[var(--stoa-danger)]/15 text-[var(--stoa-danger)]'
          : 'bg-[var(--stoa-border)]/50 text-[var(--stoa-text-muted)] hover:text-[var(--stoa-text)]'
      } ${className ?? ''}`}
    >
      {listening ? '●' : '🎤'}
    </button>
  )
}
