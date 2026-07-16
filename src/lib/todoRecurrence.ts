import { addDays, toDateKey } from './date'
import type { TodoRecurrence } from '../db/types'

/**
 * Article 28 — always computed relative to the completed instance's own
 * `dueDate`, never "today". A late completion must not compress the next
 * interval: finishing a weekly task 3 days late still schedules the next
 * one 7 days after the *original* due date.
 */
export function computeNextDueDate(dueDate: string, recurrence: TodoRecurrence): string {
  const interval = recurrence.params.interval ?? 1
  switch (recurrence.type) {
    case 'daily':
    case 'custom':
      return addDays(dueDate, interval)
    case 'weekly':
      return addDays(dueDate, interval * 7)
    case 'monthly': {
      const [y, m, d] = dueDate.split('-').map(Number)
      const target = new Date(y, m - 1 + interval, 1)
      const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
      target.setDate(Math.min(d, lastDayOfTargetMonth))
      return toDateKey(target)
    }
  }
}
