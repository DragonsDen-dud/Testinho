import { CURRENT_VERSION, type ChangelogEntry } from './changelog'

const CHANGELOG_URL = '/changelog.json'

/**
 * The page that's about to show the "update available" banner is still
 * running the OLD build — its own compiled-in CHANGELOG (lib/changelog.ts)
 * only knows about the version it was built as, not the new one a waiting
 * service worker is about to install. To find out what's actually in the
 * incoming update, this fetches changelog.json straight off the network.
 *
 * That works reliably because changelog.json is deliberately NOT in vite
 * config's Workbox globPatterns (only js/css/html/svg/png/ico are
 * precached) — it's never intercepted by the still-active old service
 * worker, so a plain fetch always reaches whatever is currently deployed,
 * i.e. the new build's data, even before the user taps Refresh.
 * `cache: 'no-store'` additionally bypasses the browser's own HTTP cache,
 * in case a CDN/browser cache-control header would otherwise serve a
 * stale copy within the same session.
 *
 * The newest entry in that freshly-fetched file is compared against this
 * bundle's own CURRENT_VERSION (the version already running): if they
 * match, nothing actually changed in the changelog for this release (a
 * hotfix with no user-facing notes) and undefined is returned so the
 * banner falls back to its generic text. No separate build-hash/version
 * lookup is needed — the changelog's own version field, old vs.
 * freshly-fetched, is enough to tell the two cases apart.
 */
export async function fetchIncomingChangelogEntry(): Promise<ChangelogEntry | undefined> {
  try {
    const res = await fetch(`${CHANGELOG_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return undefined
    const entries = (await res.json()) as ChangelogEntry[]
    const incoming = entries[0]
    if (!incoming || incoming.version === CURRENT_VERSION) return undefined
    return incoming
  } catch {
    return undefined
  }
}
