import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { usePrompts } from '../../state/useJournal'
import { createPrompt, updatePrompt, deletePrompt } from '../../data/journal'

export function PromptManager({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const prompts = usePrompts(spaceId)
  const [draft, setDraft] = useState('')

  return (
    <Sheet
      title={t('journal.managePrompts')}
      onClose={onClose}
      footer={
        <Button variant="secondary" className="w-full" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {prompts.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => updatePrompt(p.id, { active: e.target.checked })}
              title={t('journal.active')}
            />
            <Input
              defaultValue={p.text}
              onBlur={(e) => {
                const value = e.target.value.trim()
                if (value && value !== p.text) updatePrompt(p.id, { text: value })
              }}
              className="flex-1"
            />
            <button
              className="text-xs text-[var(--stoa-danger)] px-1"
              onClick={() => {
                if (confirm(t('journal.deletePromptConfirm'))) deletePrompt(p.id)
              }}
            >
              {t('common.delete')}
            </button>
          </div>
        ))}

        <div className="flex gap-2 pt-2 border-t border-[var(--stoa-border)]">
          <Input
            placeholder={t('journal.newPromptPlaceholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                e.preventDefault()
                createPrompt(spaceId, draft.trim())
                setDraft('')
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (draft.trim()) {
                createPrompt(spaceId, draft.trim())
                setDraft('')
              }
            }}
          >
            {t('common.add')}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
