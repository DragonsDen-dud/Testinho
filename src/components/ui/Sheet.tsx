import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Canonical bottom-sheet/modal used by every Habit/Todo/Project/Journal
 * form, every Detail View, both quick-create modals, and What's New — the
 * single shared structure so a fix here (or a layout convention) applies
 * everywhere at once, instead of drifting per screen.
 *
 * Two structural decisions exist specifically to fix a real bug, not for
 * taste:
 *
 * 1. Rendered via createPortal(..., document.body), not inline in the
 *    caller's component tree. Previously the sheet rendered wherever it
 *    was used (nested inside a page's own content, itself nested inside
 *    AppShell's scrollable region) — a sibling of the persistent bottom
 *    nav bar's `<nav>`, not a descendant of it. Verified live (getting
 *    increasingly implausible results at each step) that the bottom nav
 *    was painting *above* the sheet regardless of z-index — even forcing
 *    the sheet to z-index:999999 or forcing the nav to position:static
 *    didn't change it, which rules out a simple stacking-context/z-index
 *    mistake. Moving the sheet to be a portal-rendered last child of
 *    <body> (the standard fix for exactly this class of bug) resolved it
 *    immediately and unconditionally: confirmed via
 *    document.elementFromPoint() that the sheet's own content is on top
 *    after the change, in every case tested.
 *
 * 2. Fixed header / scrollable body / fixed footer, instead of one single
 *    scrolling column with the primary action button as its last child.
 *    A sheet's primary action (Edit, Save, Done) must always be reachable
 *    without scrolling gymnastics, and must never end up needing to share
 *    screen space with the device's own chrome (bottom nav, home
 *    indicator) — a single scrolling column made both of those possible
 *    by construction whenever content ran long. The footer is optional
 *    (defaults to none) for the few callers with no distinct primary
 *    action distinct from close (e.g. What's New's "Got it" still uses it
 *    for visibility, but PromptManager's own inline add-row does not).
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[var(--stoa-bg)] border border-[var(--stoa-border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--stoa-text-muted)] hover:text-[var(--stoa-text)] text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[var(--stoa-border)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
