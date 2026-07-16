import { db } from '../db/db'
import { newId } from '../lib/id'
import type { JournalPrompt, JournalEntry } from '../db/types'

export async function listPrompts(spaceId: string): Promise<JournalPrompt[]> {
  const rows = await db.journalPrompts.where('spaceId').equals(spaceId).toArray()
  return rows.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function createPrompt(spaceId: string, text: string): Promise<JournalPrompt> {
  const count = await db.journalPrompts.where('spaceId').equals(spaceId).count()
  const prompt: JournalPrompt = { id: newId(), spaceId, text, active: true, sortOrder: count }
  await db.journalPrompts.add(prompt)
  return prompt
}

export async function updatePrompt(id: string, patch: Partial<JournalPrompt>): Promise<void> {
  await db.journalPrompts.update(id, patch)
}

/** Prompts aren't in Article 20's Trash scope — just config, safe to hard-delete. */
export async function deletePrompt(id: string): Promise<void> {
  await db.journalPrompts.delete(id)
}

export type NewJournalEntryInput = Omit<JournalEntry, 'id' | 'createdAt'>

export async function createJournalEntry(data: NewJournalEntryInput): Promise<JournalEntry> {
  const entry: JournalEntry = { ...data, id: newId(), createdAt: new Date().toISOString() }
  await db.journalEntries.add(entry)
  return entry
}

export async function updateJournalEntry(id: string, patch: Partial<JournalEntry>): Promise<void> {
  await db.journalEntries.update(id, patch)
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await db.journalEntries.delete(id)
}

export async function listJournalEntries(spaceId: string): Promise<JournalEntry[]> {
  const rows = await db.journalEntries.where('spaceId').equals(spaceId).toArray()
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
