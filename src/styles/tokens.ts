// JS-side companions to src/styles/tokens.css (Mission Control direction).

export const MOTION = {
  micro: { durationMs: 150, curve: 'var(--mc-ease-snap)' }, // checkbox, dot state change
  card: { durationMs: 200, curve: 'var(--mc-ease-snap)' }, // subtask expand, segment fill
} as const

// PriorityLevel (src/db/types.ts) has no `color` field — same discrepancy
// as the prior direction. Mission Control reserves color strictly for
// function (brief: "never decoration"), so only the top two priority
// tiers by sortOrder get an alert color; everything else reads as neutral
// white — an LED panel doesn't have a distinct color for every priority
// tier, just alert / caution / normal.
export type StatusLedColor = 'critical' | 'caution' | 'nominal'

export function priorityStatusColor(sortOrder: number): StatusLedColor {
  if (sortOrder <= 0) return 'critical'
  if (sortOrder === 1) return 'caution'
  return 'nominal'
}

export const STATUS_LED_COLOR_VAR: Record<StatusLedColor, string> = {
  critical: 'var(--color-status-critical)',
  caution: 'var(--color-status-caution)',
  nominal: 'var(--color-status-nominal)',
}
