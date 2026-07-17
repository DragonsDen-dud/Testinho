import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings, updateAppSettings } from '../state/useAppSettings'
import { useTimeBlocks } from '../state/useTimeBlocks'
import { createTimeBlock, updateTimeBlock, setTimeBlockRange, clearTimeBlockRange, deleteTimeBlock } from '../data/timeBlocks'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'

export function TimeBlocksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const timeBlocks = useTimeBlocks(settings?.activeSpaceId)
  const [draft, setDraft] = useState('')

  const allTimed = timeBlocks.length > 0 && timeBlocks.every((tb) => tb.approxTimeRange)
  const showHint = !allTimed && !settings?.timeBlockRangeHintDismissed

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('timeBlocks.title')}</h1>
        <div className="w-10" />
      </div>

      {showHint && (
        <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex items-start justify-between gap-2">
          <span>{t('timeBlocks.rangeHint')}</span>
          <button
            aria-label={t('common.close')}
            className="text-[var(--stoa-text-muted)] px-1 shrink-0"
            onClick={() => updateAppSettings({ timeBlockRangeHintDismissed: true })}
          >
            ×
          </button>
        </div>
      )}

      {timeBlocks.length === 0 && <EmptyState text={t('timeBlocks.empty')} />}

      <div className="flex flex-col gap-2">
        {timeBlocks.map((tb) => (
          <div key={tb.id} className="rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                defaultValue={tb.name}
                className="flex-1"
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== tb.name) updateTimeBlock(tb.id, { name: value })
                }}
              />
              <button
                className="text-xs text-[var(--stoa-danger)] px-2"
                onClick={() => {
                  if (confirm(t('timeBlocks.deleteConfirm'))) deleteTimeBlock(tb.id)
                }}
              >
                {t('common.delete')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={tb.approxTimeRange?.start ?? ''}
                onChange={(e) => setTimeBlockRange(tb.id, e.target.value, tb.approxTimeRange?.end ?? e.target.value)}
                className="flex-1"
              />
              <span className="text-xs text-[var(--stoa-text-muted)]">{t('timeBlocks.to')}</span>
              <Input
                type="time"
                value={tb.approxTimeRange?.end ?? ''}
                onChange={(e) => setTimeBlockRange(tb.id, tb.approxTimeRange?.start ?? e.target.value, e.target.value)}
                className="flex-1"
              />
              {tb.approxTimeRange && (
                <button
                  className="text-xs text-[var(--stoa-text-muted)] px-1 shrink-0"
                  onClick={() => clearTimeBlockRange(tb.id)}
                >
                  {t('common.clear')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={t('timeBlocks.newPlaceholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim() && settings?.activeSpaceId) {
              e.preventDefault()
              createTimeBlock(settings.activeSpaceId, draft.trim())
              setDraft('')
            }
          }}
        />
        <Button
          variant="secondary"
          disabled={!settings?.activeSpaceId}
          onClick={() => {
            if (draft.trim() && settings?.activeSpaceId) {
              createTimeBlock(settings.activeSpaceId, draft.trim())
              setDraft('')
            }
          }}
        >
          {t('common.add')}
        </Button>
      </div>
    </div>
  )
}
