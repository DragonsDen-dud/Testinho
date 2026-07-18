import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useActivePrompts, usePrompts, useJournalEntries } from '../state/useJournal'
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../data/journal'
import { JournalEntryForm } from '../components/journal/JournalEntryForm'
import { PromptManager } from '../components/journal/PromptManager'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { todayKey, formatHumanDate } from '../lib/date'
import type { JournalEntry, JournalPrompt } from '../db/types'

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '🙂', 4: '😊', 5: '🤩' }

export function JournalPage() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const spaceId = settings?.activeSpaceId
  const activePrompts = useActivePrompts(spaceId)
  const allPrompts = usePrompts(spaceId)
  const entries = useJournalEntries(spaceId)
  const [composing, setComposing] = useState<{ prompt?: JournalPrompt; entry?: JournalEntry } | null>(null)
  const [managingPrompts, setManagingPrompts] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Article 49 — the FAB's "Journal entry" option opens the same free-entry
  // composer as the "+ Free entry" button, via ?new=1.
  // Article 48 — a search result for a specific entry deep-links here via
  // ?entry=<id>, since this page (not a per-entry route) is JournalEntry's
  // real screen.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setComposing({})
      setSearchParams((prev) => {
        prev.delete('new')
        return prev
      })
      return
    }
    const entryId = searchParams.get('entry')
    if (entryId) {
      const entry = entries.find((e) => e.id === entryId)
      if (entry) {
        setComposing({ prompt: promptFor(entry), entry })
        setSearchParams((prev) => {
          prev.delete('entry')
          return prev
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, entries])

  function promptFor(entry: JournalEntry): JournalPrompt | undefined {
    return entry.promptId ? allPrompts.find((p) => p.id === entry.promptId) : undefined
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('journal.title')}</h1>
        <Button variant="ghost" onClick={() => setManagingPrompts(true)}>
          {t('journal.managePrompts')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {activePrompts.map((p) => (
          <button
            key={p.id}
            className="text-left text-sm rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3"
            onClick={() => setComposing({ prompt: p })}
          >
            {p.text}
          </button>
        ))}
        <Button variant="secondary" onClick={() => setComposing({})}>
          + {t('journal.freeEntry')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--stoa-text-muted)]">{t('journal.entriesTitle')}</h2>
        {entries.length === 0 && <EmptyState text={t('journal.empty')} />}
        {entries.map((entry) => {
          const prompt = promptFor(entry)
          return (
            <button
              key={entry.id}
              className="text-left rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3 flex flex-col gap-1"
              onClick={() => setComposing({ prompt, entry })}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--stoa-text-muted)]">
                  {entry.date === todayKey() ? t('common.today') : formatHumanDate(entry.date, i18n.language)}
                  {' · '}
                  {prompt ? prompt.text : t('journal.freeEntry')}
                </span>
                {entry.mood && <span>{MOOD_EMOJI[entry.mood]}</span>}
              </div>
              <p className="text-sm line-clamp-3">{entry.text}</p>
            </button>
          )
        })}
      </div>

      {composing && spaceId && (
        <JournalEntryForm
          prompt={composing.prompt}
          initial={composing.entry}
          onClose={() => setComposing(null)}
          onSave={async (data) => {
            if (composing.entry) {
              await updateJournalEntry(composing.entry.id, data)
            } else {
              await createJournalEntry({
                spaceId,
                date: todayKey(),
                promptId: composing.prompt?.id,
                ...data,
              })
            }
            setComposing(null)
          }}
          onDelete={
            composing.entry
              ? async () => {
                  await deleteJournalEntry(composing.entry!.id)
                  setComposing(null)
                }
              : undefined
          }
        />
      )}

      {managingPrompts && spaceId && (
        <PromptManager spaceId={spaceId} onClose={() => setManagingPrompts(false)} />
      )}
    </div>
  )
}
