import { useCallback, useRef } from 'react'

/** Long enough not to fire on a normal tap, short enough that it doesn't
 * feel broken. 500ms is the platform convention on both iOS and Android. */
export const LONG_PRESS_MS = 500

/** How far a finger may drift before the gesture is treated as a scroll
 * rather than a press. Without this, any list scroll started on a tile
 * would open the quick-actions sheet. */
export const LONG_PRESS_SLOP_PX = 10

/**
 * Long-press as a secondary action on a control whose primary action is a
 * tap.
 *
 * THE PROBLEM IT SOLVES. The habit tile's whole body is the check-in, which
 * is exactly right for the common case and leaves nowhere to put anything
 * else. Long-press is the standard mobile answer: press-and-hold reveals
 * the rest, and the tap stays a tap.
 *
 * THE PART THAT IS EASY TO GET WRONG. After the hold fires, the finger
 * lifting must NOT also trigger the click — otherwise opening the sheet
 * also checks the habit off. `consumedRef` latches when the timer fires and
 * the returned `onClick` wrapper swallows exactly one click.
 */
export function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  { delay = LONG_PRESS_MS }: { delay?: number } = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consumed = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const start = useCallback(
    (x: number, y: number) => {
      consumed.current = false
      origin.current = { x, y }
      clear()
      timer.current = setTimeout(() => {
        consumed.current = true
        timer.current = null
        onLongPress()
      }, delay)
    },
    [clear, delay, onLongPress],
  )

  const move = useCallback(
    (x: number, y: number) => {
      if (!origin.current || timer.current === null) return
      const dx = Math.abs(x - origin.current.x)
      const dy = Math.abs(y - origin.current.y)
      if (dx > LONG_PRESS_SLOP_PX || dy > LONG_PRESS_SLOP_PX) clear()
    },
    [clear],
  )

  return {
    onPointerDown: (e: React.PointerEvent) => start(e.clientX, e.clientY),
    onPointerMove: (e: React.PointerEvent) => move(e.clientX, e.clientY),
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    // Suppress the OS text-selection/callout menu that a hold otherwise
    // raises on the tile's own label.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (consumed.current) {
        consumed.current = false
        return
      }
      onClick()
    },
  }
}
