import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CATEGORY_ICONS } from '../../lib/categoryStyle'

// 44px — matches the touch-target floor CategoryStyleEditSheet established
// for this exact grid (Part 1's acceptance criterion 4).
const SWATCH_PX = 44

/**
 * Extracted from Pro Settings' CategoryStyleEditSheet (Part 1) so Habits
 * 2.0's creation-form icon picker (Part A) is the same control, not a
 * second one — CategoryStyleEditSheet now renders this too, unchanged
 * visually/behaviorally.
 */
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_ICONS.map((name) => {
        const Icon: LucideIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[name]
        const selected = value === name
        return (
          <button
            type="button"
            key={name}
            onClick={() => onChange(name)}
            aria-label={name}
            aria-pressed={selected}
            style={{ width: SWATCH_PX, height: SWATCH_PX }}
            className={`flex items-center justify-center rounded-full border-2 bg-[var(--stoa-surface)] transition-transform ${
              selected ? 'border-[var(--stoa-accent)] scale-105' : 'border-[var(--stoa-border)]'
            }`}
          >
            <Icon size={20} strokeWidth={2} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
