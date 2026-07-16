import { useLiveQuery } from 'dexie-react-hooks'
import { listPrompts, listJournalEntries } from '../data/journal'
import type { JournalPrompt, JournalEntry } from '../db/types'

export function usePrompts(spaceId: string | null | undefined): JournalPrompt[] {
  return useLiveQuery(() => (spaceId ? listPrompts(spaceId) : []), [spaceId]) ?? []
}

export function useActivePrompts(spaceId: string | null | undefined): JournalPrompt[] {
  return usePrompts(spaceId).filter((p) => p.active)
}

export function useJournalEntries(spaceId: string | null | undefined): JournalEntry[] {
  return useLiveQuery(() => (spaceId ? listJournalEntries(spaceId) : []), [spaceId]) ?? []
}
