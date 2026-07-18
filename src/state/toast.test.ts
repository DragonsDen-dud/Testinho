// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { showUndoToast, dismissToast, useToast } from './toast'

describe('undo toast store (Article 50)', () => {
  beforeEach(() => {
    dismissToast() // reset any leftover state/timer between tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    dismissToast()
    vi.useRealTimers()
  })

  it('shows the toast immediately with its message and undo handler', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current).toBeNull()

    const onUndo = vi.fn()
    act(() => showUndoToast('Deleted.', onUndo))

    expect(result.current?.message).toBe('Deleted.')
    expect(result.current?.onUndo).toBe(onUndo)
  })

  it('auto-dismisses after 5 seconds with no further action needed', () => {
    const { result } = renderHook(() => useToast())
    act(() => showUndoToast('Deleted.', vi.fn()))
    expect(result.current).not.toBeNull()

    act(() => vi.advanceTimersByTime(4999))
    expect(result.current).not.toBeNull()

    act(() => vi.advanceTimersByTime(2))
    expect(result.current).toBeNull()
  })

  it('a second delete while one toast is showing replaces it and restarts the 5s window', () => {
    const { result } = renderHook(() => useToast())
    const firstUndo = vi.fn()
    const secondUndo = vi.fn()

    act(() => showUndoToast('Deleted.', firstUndo))
    act(() => vi.advanceTimersByTime(3000))
    act(() => showUndoToast('Deleted.', secondUndo))

    // If the first 5s timer weren't cleared, it would fire 2s from now and
    // clear state out from under the second toast.
    act(() => vi.advanceTimersByTime(2500)) // 5.5s since first call, 2.5s since second
    expect(result.current?.onUndo).toBe(secondUndo)

    act(() => vi.advanceTimersByTime(2500)) // 5s since the second call
    expect(result.current).toBeNull()
  })

  it('dismissToast clears the toast immediately and cancels the pending auto-dismiss timer', () => {
    const { result } = renderHook(() => useToast())
    act(() => showUndoToast('Deleted.', vi.fn()))
    expect(result.current).not.toBeNull()

    act(() => dismissToast())
    expect(result.current).toBeNull()

    // A stray timer firing after manual dismiss must not throw or resurrect state.
    act(() => vi.advanceTimersByTime(10000))
    expect(result.current).toBeNull()
  })
})
