import { useTranslation } from 'react-i18next'
import { CATEGORY_ICON_GROUPS } from '../../lib/categoryStyle'
import { StoaIcon } from './icons/stoaIcons'
import { accessibleTextColor, gradientFromColor } from '../../styles/tokens'

// 44px — matches the touch-target floor CategoryStyleEditSheet established
// for this exact grid (Part 1's acceptance criterion 4).
const SWATCH_PX = 44

/**
 * Extracted from Pro Settings' CategoryStyleEditSheet (Part 1) so the habit
 * creation form's icon picker is the same control, not a second one —
 * CategoryStyleEditSheet renders this too.
 *
 * STOA-8 — three changes, all consequences of the set doubling to 40 and
 * gaining its own art:
 *
 *  1. Renders STOA's drawn icons rather than Lucide, so the picker shows
 *     the same glyphs the badge will actually use.
 *  2. Grouped into labelled sections. Forty unlabelled circles in one wrap
 *     is a wall to scan; grouping by what a habit *is* (movement, food,
 *     rest, mind, creative…) turns finding one into going to the right
 *     section. The grouping is presentation-only — see
 *     CATEGORY_ICON_GROUPS, which deliberately does not reorder the
 *     canonical array, whose indices are load-bearing.
 *  3. The selected swatch previews the real badge treatment — the same
 *     gradient fill and contrast-picked glyph colour ColorIconBadge uses.
 *     Choosing an icon on a flat grey circle and only then discovering how
 *     it looks on the habit is a needless round trip.
 */
export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string
  onChange: (icon: string) => void
  /** The category colour this icon will actually render on. Optional — the
   * picker falls back to a neutral swatch when a caller has no colour to
   * hand, which keeps every call site working unchanged. */
  color?: string
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      {CATEGORY_ICON_GROUPS.map((group) => (
        <div key={group.labelKey} className="flex flex-col gap-1.5">
          <span className="font-heading text-[10px] uppercase text-[var(--stoa-text-muted)]">{t(group.labelKey)}</span>
          <div className="flex flex-wrap gap-2">
            {group.icons.map((name) => {
              const selected = value === name
              const previewing = selected && !!color
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => onChange(name)}
                  aria-label={name}
                  aria-pressed={selected}
                  style={{
                    width: SWATCH_PX,
                    height: SWATCH_PX,
                    ...(previewing
                      ? { backgroundImage: gradientFromColor(color), backgroundColor: color }
                      : undefined),
                  }}
                  className={`flex items-center justify-center rounded-full border-2 transition-transform active:scale-90 ${
                    selected ? 'border-[var(--stoa-accent)] scale-105' : 'border-[var(--stoa-border)]'
                  } ${previewing ? '' : 'bg-[var(--stoa-surface)]'}`}
                >
                  <StoaIcon name={name} size={24} color={previewing ? accessibleTextColor(color) : undefined} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
