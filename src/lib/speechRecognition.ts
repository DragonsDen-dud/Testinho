/**
 * Article 10 — feature-detected once, centrally, not per-component. Every
 * mic button in the app imports this same constant rather than re-running
 * the check, so there's exactly one source of truth for "does this browser
 * support voice input" and it's computed exactly once.
 */
export const SPEECH_RECOGNITION_SUPPORTED =
  typeof window !== 'undefined' && typeof window.webkitSpeechRecognition !== 'undefined'

/**
 * "Augments the existing text input — never replaces it": a transcript is
 * appended after whatever's already there, never overwriting it. Callers
 * apply this inside a functional setState update (`setValue(prev =>
 * appendTranscript(prev, transcript))`), so it always operates on the
 * latest value — including one the user edited by hand mid-listening —
 * never a stale snapshot captured when listening started.
 */
export function appendTranscript(current: string, transcript: string): string {
  const trimmed = current.trimEnd()
  return trimmed ? `${trimmed} ${transcript}` : transcript
}
