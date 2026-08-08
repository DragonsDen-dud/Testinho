import { ChevronDown } from 'lucide-react'

/**
 * The one small uppercase label that titles a section on a screen.
 *
 * Extracted because Today had grown three hand-rolled copies of the same
 * `font-heading text-xs uppercase px-1` line (the Brief, Tasks, and the
 * catch-up header on Habits), which is exactly how a design system starts
 * to drift — one of them picks up a different size or colour in a later
 * round and nobody notices.
 *
 * "Flag, don't fork": collapsing is an optional prop, not a second
 * component. Passing `onToggle` turns the header into a disclosure button
 * with a rotating chevron; leaving it off renders the plain label exactly
 * as before, so existing callers are unchanged.
 */
export function SectionHeader({
  title,
  trailing,
  expanded,
  onToggle,
  controls,
}: {
  title: string
  /** Optional right-hand summary — a count, a status, a short fact. */
  trailing?: string
  /** Present only on a collapsible section. */
  expanded?: boolean
  onToggle?: () => void
  /** id of the region this header controls, for aria-controls. */
  controls?: string
}) {
  const label = (
    <>
      <span className="font-heading text-xs uppercase text-[var(--stoa-text-muted)] tracking-wide">{title}</span>
      {trailing && (
        <span className="text-xs text-[var(--stoa-text-muted)] truncate min-w-0 opacity-80">{trailing}</span>
      )}
    </>
  )

  if (!onToggle) {
    return <div className="flex items-center gap-2 px-1">{label}</div>
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className="w-full flex items-center gap-2 px-1 py-0.5 text-left active:opacity-70 transition-opacity"
    >
      {label}
      <ChevronDown
        size={15}
        strokeWidth={2}
        aria-hidden
        className="ml-auto shrink-0 text-[var(--stoa-text-muted)] transition-transform duration-200"
        style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
      />
    </button>
  )
}
