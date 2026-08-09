import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Pencil, SkipForward, StickyNote, Trash2 } from 'lucide-react'
import type { Habit, HabitLog } from '../../db/types'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { TextArea } from '../ui/Input'
import { MicButton } from '../ui/MicButton'
import { appendTranscript } from '../../lib/speechRecognition'
import { logHabit, clearHabitLog } from '../../data/habits'
import { formatHumanDate } from '../../lib/date'
import { haptic } from '../../lib/haptics'

/**
 * Everything you can do to a habit on one day that isn't "check it off".
 *
 * WHY A LONG-PRESS SHEET. The tile's body is the check-in and its corner is
 * History — the design is out of room, and it should be: a screen whose
 * primary action is one tap should not sprout four more buttons per tile.
 * Press-and-hold is the platform-standard way to ask for the rest, and it
 * costs the common case nothing.
 *
 * WHAT'S HERE, AND WHY EACH EARNS ITS PLACE:
 *  - Skip: `skip` is a real HabitLogStatus that existed in the schema and
 *    had no way to be set from the grid. A skipped day is not a miss (see
 *    computeHabitDayInfo), which is the whole point — an honest "not today,
 *    on purpose" instead of a false failure.
 *  - Note: HabitLog.note likewise existed and was only reachable from the
 *    detail sheet's day editor.
 *  - Clear: removes the day's log entirely, which is different from marking
 *    it not-done and previously required the detail sheet.
 *  - History / Edit: the two navigations, so the sheet is a complete answer
 *    rather than a partial one that sends you hunting.
 */
export function HabitQuickActions({
  habit,
  date,
  log,
  onClose,
  onOpenHistory,
  onEdit,
}: {
  habit: Habit
  /** The day being acted on — not necessarily today, since the grid can be
   * pointed at any day in the strip. */
  date: string
  log: HabitLog | undefined
  onClose: () => void
  onOpenHistory: () => void
  onEdit: () => void
}) {
  const { t, i18n } = useTranslation()
  const [note, setNote] = useState(log?.note ?? '')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    haptic('tap')
    await fn()
    onClose()
  }

  const rows: { key: string; icon: typeof History; label: string; onClick: () => void; danger?: boolean }[] = [
    {
      key: 'skip',
      icon: SkipForward,
      label: t('habits.quickSkip'),
      onClick: () => void run(() => logHabit(habit.id, date, 'skip')),
    },
    ...(log
      ? [
          {
            key: 'clear',
            icon: Trash2,
            label: t('habits.quickClear'),
            onClick: () => void run(() => clearHabitLog(habit.id, date)),
            danger: true,
          },
        ]
      : []),
    { key: 'history', icon: History, label: t('habits.quickHistory'), onClick: onOpenHistory },
    { key: 'edit', icon: Pencil, label: t('habits.quickEdit'), onClick: onEdit },
  ]

  return (
    <Sheet
      title={habit.name}
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={busy || note === (log?.note ?? '')}
            onClick={() =>
              void run(async () => {
                // Preserve the day's existing status; a note must never
                // silently mark an unlogged day as done.
                await logHabit(habit.id, date, log?.status ?? 'not_done', { note: note.trim() || undefined })
              })
            }
          >
            {t('habits.quickSaveNote')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-[var(--stoa-text-muted)]">
          {formatHumanDate(date, i18n.language)}
        </p>

        <div className="flex flex-col">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={row.onClick}
              disabled={busy}
              className="flex items-center gap-3 py-3 text-left text-sm border-b border-[var(--stoa-border)] last:border-b-0 disabled:opacity-50 stoa-focusable rounded-lg px-1"
              style={{ color: row.danger ? 'var(--stoa-danger)' : undefined }}
            >
              <row.icon size={17} strokeWidth={1.75} aria-hidden className="shrink-0 text-[var(--stoa-text-muted)]" />
              {row.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 font-heading text-xs uppercase text-[var(--stoa-text-muted)]">
            <StickyNote size={13} strokeWidth={2} aria-hidden />
            {t('habits.quickNote')}
          </span>
          <div className="flex gap-2 items-start">
            <TextArea
              rows={3}
              value={note}
              placeholder={t('habits.quickNotePlaceholder')}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1"
            />
            <MicButton
              lang={i18n.language}
              onTranscript={(transcript) => setNote((prev) => appendTranscript(prev, transcript))}
            />
          </div>
        </label>
      </div>
    </Sheet>
  )
}
