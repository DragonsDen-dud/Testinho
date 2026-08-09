/**
 * "Flag, don't fork": `action` is optional and every existing caller keeps
 * its exact previous rendering. It exists because an empty state that only
 * describes the emptiness makes the user go and find the way out of it —
 * on a first run, the grid's "nothing here yet" was a dead end with the
 * only route being a floating + button in the opposite corner.
 */
export function EmptyState({
  text,
  action,
}: {
  text: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="text-center py-10 px-4 text-sm text-[var(--stoa-text-muted)] flex flex-col items-center gap-3">
      <span>{text}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-full px-4 py-2 text-sm font-medium bg-[var(--stoa-accent-soft)] text-[var(--stoa-text)] active:scale-95 transition-transform stoa-focusable"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
