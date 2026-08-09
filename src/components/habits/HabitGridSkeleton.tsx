/**
 * The grid's shape, before the grid exists.
 *
 * Dexie resolves in a few frames, but during those frames Today rendered
 * its header and then nothing — so the whole page jumped downward the
 * instant habits arrived, moving the first tile out from under a thumb that
 * was already travelling toward it. Reserving the space is the actual fix.
 *
 * Deliberately mirrors HabitTile's real geometry (min-h-[172px], the 26px
 * radius, the two-column 10px gap) rather than being a generic grey box, so
 * the swap is a fill rather than a reflow.
 */
export function HabitGridSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5" aria-hidden>
      {Array.from({ length: tiles }, (_, i) => (
        <div
          key={i}
          className="stoa-skeleton rounded-[26px] min-h-[172px] border border-[var(--stoa-border)]"
          // Staggered so the row doesn't pulse as one block, which reads as
          // a broken screen rather than a loading one.
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}
