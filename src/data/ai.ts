import { db } from '../db/db'
import { todayKey } from '../lib/date'
import { nextUsageState } from '../lib/aiUsage'

/** Article 38 — call only after a successful Anthropic call; never on a failed one. */
export async function recordAiUsage(now: string = todayKey()): Promise<void> {
  const settings = await db.appSettings.get('singleton')
  if (!settings) return
  const aiUsage = nextUsageState(settings.aiUsage, now)
  await db.appSettings.update('singleton', { aiUsage })
}
