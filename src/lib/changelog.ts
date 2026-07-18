/**
 * Article 56 — a manually maintained list, not generated from commit
 * history, per the article's own spec. Newest entry last isn't required by
 * anything here, but keeping newest-first makes CHANGELOG[0] always "the
 * current version" without a separate sort step.
 */
export interface ChangelogEntry {
  version: string
  bullets: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    bullets: [
      'Photo attachments on habit check-ins, tasks, and journal entries — compressed automatically before saving.',
      'Full app backup and restore from Settings, including photos.',
      'A Data Integrity Check in Settings to find and fix orphaned records.',
    ],
  },
  {
    version: '1.0.0',
    bullets: [
      'Voice input, a quick-add shortcut, and search across your habits, tasks, and journal.',
      'Smarter reminders: quiet hours, a follow-up nudge, and a morning digest.',
      'Calendar export for critical reminders, and CSV export of a habit’s history.',
    ],
  },
]

export const CURRENT_VERSION = CHANGELOG[0].version

/** Article 56 — shows once per version change: true whenever the stored
 * "last seen" version doesn't match the current one, including when
 * nothing has ever been seen (undefined). Once dismissed, the caller
 * persists lastSeenChangelogVersion = CURRENT_VERSION, which makes this
 * false again for the same version — no separate "already shown this
 * session" flag needed. */
export function shouldShowWhatsNew(lastSeenVersion: string | undefined): boolean {
  return lastSeenVersion !== CURRENT_VERSION
}
