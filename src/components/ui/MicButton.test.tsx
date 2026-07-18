// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { useState } from 'react'
import '../../i18n/i18n'

/**
 * Article 10 verification bar:
 *  - the feature-detect gate itself (button absent when the API isn't
 *    present, present when it is)
 *  - a manually-typed edit while "listening" is never overwritten/discarded
 *    by a late transcription result
 *
 * SPEECH_RECOGNITION_SUPPORTED is computed once at module load from
 * `window.webkitSpeechRecognition`, so each case here sets that global
 * before a fresh dynamic import (after vi.resetModules()) rather than
 * trying to toggle an already-evaluated constant.
 */

class MockSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((event: unknown) => void) | null = null
  onerror: (() => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  constructor() {
    mockInstances.push(this)
  }
}

let mockInstances: MockSpeechRecognition[] = []

beforeEach(() => {
  mockInstances = []
  vi.resetModules()
})

afterEach(() => {
  cleanup()
  delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
})

describe('MicButton feature-detect gate', () => {
  it('renders nothing when the browser has no webkitSpeechRecognition', async () => {
    delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    const { MicButton } = await import('./MicButton')
    const { container } = render(<MicButton onTranscript={() => {}} lang="en" />)
    expect(container.innerHTML).toBe('')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders a mic button when webkitSpeechRecognition is present', async () => {
    window.webkitSpeechRecognition = MockSpeechRecognition as unknown as typeof window.webkitSpeechRecognition
    const { MicButton } = await import('./MicButton')
    render(<MicButton onTranscript={() => {}} lang="en" />)
    expect(screen.getByRole('button')).toBeTruthy()
  })
})

describe('manual edit during listening is never clobbered by a late transcript', () => {
  it('preserves text the user typed by hand after listening started, merging the transcript after it', async () => {
    window.webkitSpeechRecognition = MockSpeechRecognition as unknown as typeof window.webkitSpeechRecognition
    const { useSpeechToText } = await import('../../lib/useSpeechToText')
    const { appendTranscript } = await import('../../lib/speechRecognition')

    function Harness() {
      const [text, setText] = useState('')
      const { toggle } = useSpeechToText((transcript) => setText((prev) => appendTranscript(prev, transcript)), 'en')
      return (
        <div>
          <input aria-label="note" value={text} onChange={(e) => setText(e.target.value)} />
          <button onClick={toggle}>toggle</button>
        </div>
      )
    }

    render(<Harness />)
    const input = screen.getByLabelText('note') as HTMLInputElement
    const toggleButton = screen.getByText('toggle')

    // Start "listening".
    fireEvent.click(toggleButton)
    expect(mockInstances).toHaveLength(1)

    // The user keeps typing by hand while recognition is still active —
    // this is a real edit to the same field the transcript will land in.
    fireEvent.change(input, { target: { value: 'Manually typed note' } })
    expect(input.value).toBe('Manually typed note')

    // A transcription result arrives late, after the manual edit.
    const recognition = mockInstances[0]
    act(() => {
      recognition.onresult?.({
        results: [{ 0: { transcript: 'and a voice addition' }, isFinal: true }],
      })
    })

    // The manual edit must still be there — appended to, not replaced.
    expect(input.value).toBe('Manually typed note and a voice addition')
  })

  it('does not discard the manual edit even if the transcript event fires before any typing is read back', async () => {
    window.webkitSpeechRecognition = MockSpeechRecognition as unknown as typeof window.webkitSpeechRecognition
    const { useSpeechToText } = await import('../../lib/useSpeechToText')
    const { appendTranscript } = await import('../../lib/speechRecognition')

    function Harness() {
      const [text, setText] = useState('start')
      const { toggle } = useSpeechToText((transcript) => setText((prev) => appendTranscript(prev, transcript)), 'en')
      return (
        <div>
          <input aria-label="note" value={text} onChange={(e) => setText(e.target.value)} />
          <button onClick={toggle}>toggle</button>
        </div>
      )
    }

    render(<Harness />)
    fireEvent.click(screen.getByText('toggle'))
    const recognition = mockInstances[0]

    act(() => {
      recognition.onresult?.({ results: [{ 0: { transcript: 'voice text' }, isFinal: true }] })
    })

    const input = screen.getByLabelText('note') as HTMLInputElement
    expect(input.value).toBe('start voice text')
  })
})
