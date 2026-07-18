// Stage 2 — generic swipe-to-reveal wrapper for TaskCard. Trailing (swipe
// left): Complete + Reschedule. Leading (swipe right): Delete. Rubber-band
// resistance past the reveal width, snap-open/closed on release, tapping
// the card while open closes it instead of opening the edit sheet.
//
// Pointer Events (not touch-only) so this works with Playwright's mouse
// drag simulation as well as real touch — same event model either way.

import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

const TRAILING_WIDTH = 144 // Complete + Reschedule, 72px each
const LEADING_WIDTH = 72 // Delete
const OPEN_THRESHOLD = 0.4 // fraction of reveal width to cross before snapping open
const RUBBER_BAND = 0.28 // damping factor once past the reveal width
const MOVE_THRESHOLD = 8 // px of horizontal movement before a pointerdown becomes a drag, not a tap

function rubberBand(raw: number, max: number): number {
  const sign = Math.sign(raw)
  const abs = Math.abs(raw)
  if (abs <= max) return raw
  return sign * (max + (abs - max) * RUBBER_BAND)
}

function ActionButton({
  label,
  color,
  onClick,
  roundedEdge,
}: {
  label: string
  color: string
  onClick: () => void
  /** Rounds this button's own outer corner to match the card radius — the
   * outermost button on each side needs it, since the wrapper itself is no
   * longer clipped (see SwipeableCard's own comment for why). */
  roundedEdge?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`w-[72px] h-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
        roundedEdge === 'left' ? 'rounded-l-card' : roundedEdge === 'right' ? 'rounded-r-card' : ''
      }`}
      style={{ background: color }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function SwipeableCard({
  children,
  onComplete,
  onReschedule,
  onDelete,
  completeLabel,
  disabled,
}: {
  children: ReactNode
  onComplete: () => void
  onReschedule: () => void
  onDelete: () => void
  completeLabel: string
  disabled?: boolean
}) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const trackingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const startDragXRef = useRef(0)
  // The browser fires a synthetic "click" right after a mouse drag's
  // pointerup/mouseup, on the same element — without this, that click hit
  // the "tap while open closes it" handler below and immediately snapped
  // a just-opened reveal back shut before anyone could tap an action.
  const justDraggedRef = useRef(false)

  function close() {
    setDragX(0)
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    // Track the pointer, but don't commit to a drag (and critically, don't
    // setPointerCapture) until real horizontal movement confirms this is a
    // swipe and not a tap. Capturing immediately on every pointerdown —
    // including one that started on a nested button like the checkbox or
    // chevron — retargeted the eventual click away from that button, since
    // pointer capture redirects the whole gesture to the capturing element.
    // That silently broke every tap inside the card.
    trackingRef.current = true
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    startDragXRef.current = dragX
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!trackingRef.current) return
    const dx = e.clientX - startXRef.current
    const dy = e.clientY - startYRef.current

    if (!dragging) {
      if (Math.abs(dx) < MOVE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const raw = startDragXRef.current + dx
    const bounded = raw < 0 ? -rubberBand(-raw, TRAILING_WIDTH) : rubberBand(raw, LEADING_WIDTH)
    setDragX(bounded)
  }

  function handlePointerUp() {
    trackingRef.current = false
    if (!dragging) return // a plain tap — let the click through untouched
    justDraggedRef.current = true
    setDragging(false)
    if (dragX <= -TRAILING_WIDTH * OPEN_THRESHOLD) {
      setDragX(-TRAILING_WIDTH)
    } else if (dragX >= LEADING_WIDTH * OPEN_THRESHOLD) {
      setDragX(LEADING_WIDTH)
    } else {
      setDragX(0)
    }
  }

  const isOpen = dragX !== 0

  // No overflow-hidden/rounding on this wrapper: clipping a rounded corner
  // over absolutely-positioned, differently-colored siblings left a 1px
  // antialiasing fringe of the action colors bleeding through the card's
  // rounded corners even when closed (dragX===0). Rounding each action
  // row's own outer edge to match the card radius, and letting the
  // opaque foreground TaskCard's own rounding cover the rest, avoids the
  // clip/composite seam entirely.
  return (
    <div className="relative">
      <div className="absolute inset-y-0 right-0 flex" aria-hidden={dragX >= 0}>
        <ActionButton
          label={completeLabel}
          color="var(--color-action-complete)"
          onClick={() => {
            close()
            onComplete()
          }}
        />
        <ActionButton
          label="Reschedule"
          color="var(--color-accent-info)"
          roundedEdge="right"
          onClick={() => {
            close()
            onReschedule()
          }}
        />
      </div>
      <div className="absolute inset-y-0 left-0 flex" aria-hidden={dragX <= 0}>
        <ActionButton
          label="Delete"
          color="var(--color-action-delete)"
          roundedEdge="left"
          onClick={() => {
            close()
            onDelete()
          }}
        />
      </div>

      <div
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 220ms var(--ease-dot-fill)',
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={(e) => {
          if (justDraggedRef.current) {
            // The trailing synthetic click from the drag gesture that just
            // ended — not a real subsequent tap. Swallow it entirely rather
            // than treating it as either "open the edit sheet" or "tap to
            // close the reveal".
            justDraggedRef.current = false
            e.stopPropagation()
            return
          }
          if (isOpen) {
            e.stopPropagation()
            close()
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
