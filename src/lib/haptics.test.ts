import { describe, expect, it, afterEach, vi } from 'vitest'
import { haptic } from './haptics'

describe('haptic', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing, and does not throw, when the API is absent (iOS Safari)', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptic('tap')).not.toThrow()
  })

  it('fires a short pattern when the API exists', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic('tap')
    expect(vibrate).toHaveBeenCalledTimes(1)
    // The value matters: anything long enough to be felt as a buzz rather
    // than a tick would read as a reward, which Article 6 rules out.
    expect(vibrate.mock.calls[0][0]).toBeLessThanOrEqual(30)
  })

  it('gives undo the same weight as a tap, never a heavier "error" buzz', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic('tap')
    haptic('undo')
    expect(vibrate.mock.calls[0][0]).toEqual(vibrate.mock.calls[1][0])
  })

  it('swallows a throwing vibrate rather than breaking the action it confirms', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('NotAllowedError')
      },
    })
    expect(() => haptic('tap')).not.toThrow()
  })
})
