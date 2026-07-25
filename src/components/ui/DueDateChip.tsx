import type { DueDateTone } from '../../lib/dueDateChip'

/**
 * Part 3 (Tasks) — the one genuinely new visual element this round adds,
 * rather than reusing a Part 1/2 piece. Built reusable (not inlined in
 * TaskCard) since Journal/Planning may want the same "short, glanceable,
 * urgency-toned date pill" later — takes a pre-computed label/tone rather
 * than a Todo, so it has no dependency on the Todo type at all.
 *
 * All three tones reuse existing Tesla tokens (styles/tokens.css) rather
 * than inventing new colors:
 *  - overdue: the same alert hue + soft rgba backing TaskCard's old inline
 *    Chip already used for its overdue variant.
 *  - today: --color-accent-info — no dedicated "due today" hue exists
 *    anywhere in the app (checked the Today-screen vibrant system per the
 *    brief's own instruction before reusing this), so the existing
 *    Tesla-token info accent (already used for the priority-dot's medium
 *    tier and the swipe-reschedule action) stands in for "today,
 *    attention-worthy but not urgent."
 *  - neutral: the same muted chip background/text already used for every
 *    other quiet metadata chip in this system.
 */
export function DueDateChip({ label, tone }: { label: string; tone: DueDateTone }) {
  const TONE_STYLE: Record<DueDateTone, { background: string; color: string }> = {
    overdue: { background: 'rgba(224, 30, 44, 0.1)', color: 'var(--color-accent-alert)' },
    today: { background: 'rgba(62, 106, 225, 0.1)', color: 'var(--color-accent-info)' },
    neutral: { background: 'var(--color-chip)', color: 'var(--color-ink-muted)' },
  }
  return (
    <span
      className="text-task-meta rounded-pill px-2.5 py-1 shrink-0 tabular-nums whitespace-nowrap"
      style={TONE_STYLE[tone]}
    >
      {label}
    </span>
  )
}
