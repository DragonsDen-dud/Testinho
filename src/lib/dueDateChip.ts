import type { TFunction } from 'i18next'
import { daysBetween, todayKey } from './date'

export type DueDateTone = 'overdue' | 'today' | 'neutral'

export interface DueDateInfo {
  label: string
  tone: DueDateTone
}

/**
 * Part 3 (Tasks) — short, glanceable due-date text shared by DueDateChip
 * (trailing slot) and the row subtitle (when the chip slot is already
 * occupied by a subtask ratio — see TaskCard's own comment on that).
 *
 * Deliberately never combines a date AND a time — a time only replaces
 * "Today" when the task is both due today AND has a specific
 * scheduledTime, since a bare time with no date context ("2:30 PM") would
 * be ambiguous for anything further out than today.
 */
export function computeDueDateInfo(
  dueDate: string,
  scheduledTime: string | undefined,
  locale: string,
  t: TFunction,
): DueDateInfo {
  const diff = daysBetween(todayKey(), dueDate)
  if (diff < 0) return { label: t('todos.dueChipOverdue', { count: -diff }), tone: 'overdue' }
  if (diff === 0) return { label: scheduledTime ?? t('common.today'), tone: 'today' }
  if (diff === 1) return { label: t('todos.rescheduleTomorrow'), tone: 'neutral' }
  const [y, m, d] = dueDate.split('-').map(Number)
  return { label: new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' }), tone: 'neutral' }
}
