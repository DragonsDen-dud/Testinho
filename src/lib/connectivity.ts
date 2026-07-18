import { db } from '../db/db'
import { checkAiHealth } from './aiClient'

export type ConnectivityState = 'checking' | 'online' | 'offline'

/**
 * Article 44 — "app" health is a trivial round-trip against this app's own
 * local storage (IndexedDB via Dexie), not anything about the network.
 * This is a local-first app, so "is the app itself working" genuinely means
 * "can it read its own data" — distinct from network/Claude reachability.
 */
export async function checkAppHealth(): Promise<boolean> {
  try {
    await db.appSettings.toCollection().first()
    return true
  } catch {
    return false
  }
}

/**
 * "Network" health uses the browser's own online/offline signal. This is a
 * known, documented limitation, not an oversight: `navigator.onLine`
 * reflects whether the device believes it has a network adapter with a
 * route, not that any specific remote host is reachable — that's exactly
 * what the separate Claude API check is for. It's the standard zero-cost
 * signal for "does this device think it's on a network at all."
 */
export function checkNetworkHealth(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export interface ConnectivityStatuses {
  app: ConnectivityState
  network: ConnectivityState
  claudeApi: ConnectivityState
}

/** Article 44 — the three statuses a pull-to-refresh on Dashboard re-runs. */
export async function checkAllConnectivity(): Promise<ConnectivityStatuses> {
  const [appOk, claudeOk] = await Promise.all([checkAppHealth(), checkAiHealth()])
  return {
    app: appOk ? 'online' : 'offline',
    network: checkNetworkHealth() ? 'online' : 'offline',
    claudeApi: claudeOk ? 'online' : 'offline',
  }
}
