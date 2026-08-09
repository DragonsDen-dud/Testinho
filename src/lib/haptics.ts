/**
 * A single, very small haptic vocabulary.
 *
 * WHY IT EXISTS. Checking a habit off is the one action this app is built
 * around, and on a phone it currently gives only visual feedback — you have
 * to look at the screen to know it registered. A short tick closes that
 * loop, which is what makes a web app feel like an app rather than a page.
 *
 * WHY IT IS THIS SMALL. Two patterns, both under 30ms, and nothing that
 * buzzes on a passive event. Haptics that fire on things the user did not
 * do are the fastest way to make an app feel cheap — and under Article 6
 * they must never read as a reward for completing something, only as
 * confirmation that a tap landed. The 'undo' pattern is deliberately the
 * same weight as 'tap': undoing is not a punishment.
 *
 * REALITY CHECK, disclosed rather than assumed: `navigator.vibrate` is not
 * implemented in Safari on iOS, which is this project's stated target
 * (Article 43). So on Denys's own phone this is currently a no-op. It is
 * still worth having — it works today in Chrome on Android and in installed
 * PWAs there, it costs nothing when absent, and the call sites are correct
 * for whenever WebKit ships it. Nothing in the UI depends on it firing.
 */

export type HapticPattern = 'tap' | 'undo'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 12,
  undo: 12,
}

export function haptic(pattern: HapticPattern): void {
  try {
    // Feature-detected every call rather than cached: `navigator` can be
    // absent entirely under SSR/test environments.
    const nav = typeof navigator === 'undefined' ? undefined : navigator
    if (!nav || typeof nav.vibrate !== 'function') return
    nav.vibrate(PATTERNS[pattern])
  } catch {
    // Some browsers throw when vibrate is called without a user gesture, or
    // when the page is hidden. A failed confirmation buzz must never be
    // able to interrupt the write it was confirming.
  }
}
