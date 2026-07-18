import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('SPEECH_RECOGNITION_SUPPORTED (Article 10)', () => {
  const originalWebkitSpeechRecognition = (globalThis as { window?: Window }).window?.webkitSpeechRecognition

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (typeof window !== 'undefined') {
      if (originalWebkitSpeechRecognition === undefined) {
        delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
      } else {
        window.webkitSpeechRecognition = originalWebkitSpeechRecognition
      }
    }
  })

  it('is false when the browser has no webkitSpeechRecognition', async () => {
    // This test file runs under the default 'node' environment (no `window`
    // global at all in most cases) — the constant must still resolve to
    // false rather than throwing.
    const { SPEECH_RECOGNITION_SUPPORTED } = await import('./speechRecognition')
    expect(SPEECH_RECOGNITION_SUPPORTED).toBe(false)
  })

  it('is true once webkitSpeechRecognition is present on window at module load time', async () => {
    ;(globalThis as { window: { webkitSpeechRecognition?: unknown } }).window = {
      ...(globalThis as { window?: object }).window,
      webkitSpeechRecognition: class {},
    }
    const { SPEECH_RECOGNITION_SUPPORTED } = await import('./speechRecognition')
    expect(SPEECH_RECOGNITION_SUPPORTED).toBe(true)
    // Cleanup this test's own global patch so it doesn't leak into others —
    // `window` itself didn't exist before this test under the node
    // environment, so remove it entirely rather than leaving a stub behind.
    delete (globalThis as { window?: unknown }).window
  })
})

describe('appendTranscript (Article 10)', () => {
  it('sets the transcript directly when the field starts empty', async () => {
    const { appendTranscript } = await import('./speechRecognition')
    expect(appendTranscript('', 'hello world')).toBe('hello world')
  })

  it('appends after existing text with a single separating space', async () => {
    const { appendTranscript } = await import('./speechRecognition')
    expect(appendTranscript('Buy milk', 'and eggs')).toBe('Buy milk and eggs')
  })

  it('trims trailing whitespace from the existing text before appending, never duplicating spaces', async () => {
    const { appendTranscript } = await import('./speechRecognition')
    expect(appendTranscript('Buy milk   ', 'and eggs')).toBe('Buy milk and eggs')
  })

  it('never discards or overwrites the existing text — it only ever appends', async () => {
    const { appendTranscript } = await import('./speechRecognition')
    const manuallyTyped = 'Something the user typed by hand'
    const result = appendTranscript(manuallyTyped, 'a late transcript')
    expect(result.startsWith(manuallyTyped)).toBe(true)
    expect(result).toContain('a late transcript')
  })
})
