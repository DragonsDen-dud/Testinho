/**
 * A two-or-more-way segmented control.
 *
 * Introduced for the tile-grid redesign, where "what's left" and "what's
 * done" became two views of one grid rather than two stacked sections. A
 * segmented control rather than a scroll-to-find heading because the whole
 * point of the grid is that the day fits on one screen — a second section
 * below the fold would undo that.
 *
 * The moving indicator is a single absolutely-positioned pill translated
 * by index, so switching animates as one continuous movement rather than
 * two independent fades.
 */
export interface SegmentedTab {
  key: string
  label: string
  /** Optional trailing count, rendered muted inside the same pill. */
  count?: number
}

export function SegmentedTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: SegmentedTab[]
  value: string
  onChange: (key: string) => void
}) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === value),
  )

  return (
    <div
      role="tablist"
      className="relative flex rounded-2xl p-1 bg-[var(--stoa-surface)] border border-[var(--stoa-border)]"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-xl bg-[var(--stoa-accent-soft)] transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${tabs.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
          left: '0.25rem',
        }}
      />
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`relative flex-1 min-h-9 rounded-xl font-heading text-xs uppercase transition-colors duration-150 ${
              active ? 'text-[var(--stoa-text)]' : 'text-[var(--stoa-text-muted)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 tabular-nums opacity-60">{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
