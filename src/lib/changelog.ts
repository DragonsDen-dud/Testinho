import changelogData from '../../public/changelog.json'

/**
 * Article 56 — a manually maintained list, not generated from commit
 * history, per the article's own spec. Newest entry last isn't required by
 * anything here, but keeping newest-first makes CHANGELOG[0] always "the
 * current version" without a separate sort step.
 *
 * The data itself lives in public/changelog.json, not inline here, so it
 * can double as a plain static asset the running (pre-update) app can
 * fetch fresh off the network to see what a waiting service-worker update
 * contains — see lib/pwaChangelog.ts. Importing it here still bundles it
 * into the JS (this module's own CURRENT_VERSION/CHANGELOG reflect
 * whatever build produced them, same as before), it just isn't a
 * duplicated copy of the data anymore.
 */
export interface ChangelogEntry {
  version: string
  bullets: string[]
}

export const CHANGELOG: ChangelogEntry[] = changelogData

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
