import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import type { JournalEntry, JournalPrompt } from '../../db/types'

const MOODS = [1, 2, 3, 4, 5]
const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '🙂', 4: '😊', 5: '🤩' }

export function JournalEntryForm({
  prompt,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  prompt?: JournalPrompt
  initial?: JournalEntry
  onSave: (data: { text: string; mood?: number }) => void
  onClose: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(initial?.text ?? '')
  const [mood, setMood] = useState<number | undefined>(initial?.mood)

  return (
    <Sheet title={prompt ? prompt.text : t('journal.freeEntry')} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          onSave({ text: text.trim(), mood })
        }}
      >
        <Field label={t('journal.entryLabel')}>
          <TextArea
            autoFocus
            rows={5}
            placeholder={t('journal.entryPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </Field>

        <Field label={t('journal.mood')}>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? undefined : m)}
                className={`text-xl w-10 h-10 rounded-full border-2 transition-transform ${
                  mood === m ? 'border-[var(--stoa-accent)] scale-110' : 'border-transparent'
                }`}
              >
                {MOOD_EMOJI[m]}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-2 justify-between mt-2">
          {initial && onDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm(t('common.confirmDelete'))) onDelete()
              }}
            >
              {t('common.delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </div>
      </form>
    </Sheet>
  )
}
