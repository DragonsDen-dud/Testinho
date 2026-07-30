import { addDays, toDateKey } from './date'

/** Combines a date (YYYY-MM-DD) with an HH:mm clock time into a real local
 * Date — same construction reminderTiming.ts's computeTodoReminderTrigger
 * already uses for the same "date string + HH:mm string" shape. */
function combineDateAndTime(dateKey: string, hhmm: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}

/**
 * Sleep tracking round — the entry form has one `date` field (the wake-up
 * day, matching how someone would naturally describe "last night's sleep"
 * the next morning) plus two HH:mm clock times, which alone isn't enough
 * to know which calendar day the bedtime actually fell on: a typical night
 * (bed 23:00, wake 07:00) has bedtime the day BEFORE `date`, but a same-day
 * nap (bed 14:00, wake 15:30) has both ON `date`. The rule: bedtime is on
 * the previous day only if its clock time is later in the day than wake
 * time's clock time (the standard "did this cross midnight" test, safe as
 * a plain string compare since both are zero-padded HH:mm) — otherwise
 * bedtime shares `date` itself. Returns real timestamps so every
 * downstream consumer (duration, charts, table) just reads two instants
 * and never re-derives which day either one fell on.
 */
export function computeSleepTimestamps(
  date: string,
  bedTimeHHMM: string,
  wakeTimeHHMM: string,
): { bedTime: string; wakeTime: string } {
  const bedDate = bedTimeHHMM > wakeTimeHHMM ? addDays(date, -1) : date
  return {
    bedTime: combineDateAndTime(bedDate, bedTimeHHMM).toISOString(),
    wakeTime: combineDateAndTime(date, wakeTimeHHMM).toISOString(),
  }
}

/** Hours slept between two real timestamps, one decimal place. */
export function computeHoursSlept(bedTime: string, wakeTime: string): number {
  const ms = new Date(wakeTime).getTime() - new Date(bedTime).getTime()
  return Math.round((ms / 3600000) * 10) / 10
}

/** HH:mm, local time — for redisplaying a stored timestamp in the edit form/table. */
export function formatClockTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The wake-up-day calendar key a timestamp's own local date falls on — used
 * to pre-fill the date field in the form when jumping straight to editing. */
export function dateKeyOf(iso: string): string {
  return toDateKey(new Date(iso))
}

/**
 * Fractional hour-of-day for chart plotting. `shiftAfterMidnight` (passed
 * true only for the bedtime series) adds 24 to any hour before noon, so a
 * late bedtime (23:30) and an even-later one (00:30) land next to each
 * other on a continuous evening→morning axis instead of wrapping to
 * opposite ends of a plain 0–24 scale — without this, the exact
 * relationship this chart exists to show (bedtime vs. wake time, night to
 * night) would be hidden behind a visual discontinuity every time bedtime
 * crosses midnight. Wake time is always plotted on the plain scale (never
 * shifted) since wake times cluster in the morning and don't have this
 * problem.
 */
export function timeOfDayForChart(iso: string, shiftAfterMidnight: boolean): number {
  const d = new Date(iso)
  const hour = d.getHours() + d.getMinutes() / 60
  return shiftAfterMidnight && hour < 12 ? hour + 24 : hour
}

/** Inverse of timeOfDayForChart's shift — formats a (possibly >24)
 * fractional hour back into a real "HH:mm" clock label for chart axes. */
export function formatChartHour(hour: number): string {
  const real = ((hour % 24) + 24) % 24
  const h = Math.floor(real)
  const m = Math.round((real - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
