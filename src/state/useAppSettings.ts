import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { AppSettings } from '../db/types'

export function useAppSettings(): AppSettings | undefined {
  return useLiveQuery(() => db.appSettings.get('singleton'), [])
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<void> {
  await db.appSettings.update('singleton', patch)
}
