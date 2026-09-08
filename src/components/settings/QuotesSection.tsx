import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Field, Input, TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { MicButton } from '../ui/MicButton'
import { appendTranscript } from '../../lib/speechRecognition'
import { useAppSettings } from '../../state/useAppSettings'
import { useQuotes } from '../../state/useQuotes'
import { createQuote, deleteQuote, normalizeQuoteText } from '../../data/quotes'
import { showUndoToast } from '../../state/toast'
import { restoreQuote } from '../../data/quotes'

/**
 * The user's own collection of lines worth keeping.
 *
 * ARTICLE 1 IS THE WHOLE DESIGN. STOA ships no quotes and recommends none:
 * a built-in list would be the app encoding somebody's particular
 * influences, which the spec rules out, and it would also mean STOA
 * asserting that named people said specific words. Here the user supplies
 * the text and makes the attribution, about something they chose.
 *
 * ARTICLE 19 is the reason this is opt-in and understated. The tone rule
 * bans motivational slogans and manufactured enthusiasm in STOA's *own*
 * copy — it does not stop the user keeping a line that means something to
 * them, but it does mean the app must not cheer, decorate or moralise
 * around it. So: one line, quiet type, no exclamation, no emoji, and
 * nothing shown at all when the collection is empty.
 */
export function QuotesSection() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const quotes = useQuotes(settings?.activeSpaceId)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [source, setSource] = useState('')

  async function submit() {
    const clean = normalizeQuoteText(text)
    if (!clean || !settings?.activeSpaceId) return
    await createQuote({
      spaceId: settings.activeSpaceId,
      text: clean,
      author: author.trim() || undefined,
      source: source.trim() || undefined,
    })
    setText('')
    setAuthor('')
    setSource('')
    setAdding(false)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-sm uppercase text-[var(--stoa-text-muted)]">{t('quotes.title')}</h2>
        {quotes.length > 0 && (
          <span className="text-xs text-[var(--stoa-text-muted)] tabular-nums">
            {t('quotes.countLabel', { count: quotes.length })}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--stoa-text-muted)]">{t('quotes.sectionHint')}</p>

      {quotes.length === 0 && !adding && (
        <p className="text-sm text-[var(--stoa-text-muted)]">{t('quotes.empty')}</p>
      )}

      <ul className="flex flex-col gap-2">
        {quotes.map((q) => (
          <li key={q.id} className="rounded-card bg-canvas px-3.5 py-3 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--stoa-text)] break-words">{q.text}</p>
              {(q.author || q.source) && (
                <p className="text-xs text-[var(--stoa-text-muted)] mt-1 break-words">
                  {[q.author, q.source].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label={t('common.delete')}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[var(--stoa-text-muted)] stoa-focusable"
              onClick={async () => {
                await deleteQuote(q.id)
                // Article 20/50 — the same restore path Trash itself uses,
                // so Undo produces an identical result to a manual restore.
                showUndoToast(t('common.deletedToast'), () => restoreQuote(q.id))
              }}
            >
              <Trash2 size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex flex-col gap-3 rounded-card bg-canvas px-3.5 py-3">
          <Field label={t('quotes.textLabel')}>
            <div className="flex gap-2 items-start">
              <TextArea
                rows={3}
                autoFocus
                value={text}
                placeholder={t('quotes.textPlaceholder')}
                onChange={(e) => setText(e.target.value)}
                className="flex-1"
              />
              <MicButton
                lang={i18n.language}
                onTranscript={(transcript) => setText((prev) => appendTranscript(prev, transcript))}
              />
            </div>
          </Field>
          <Field label={t('quotes.authorLabel')}>
            <Input
              value={author}
              placeholder={t('quotes.authorPlaceholder')}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </Field>
          <Field label={t('quotes.sourceLabel')}>
            <Input
              value={source}
              placeholder={t('quotes.sourcePlaceholder')}
              onChange={(e) => setSource(e.target.value)}
            />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={!normalizeQuoteText(text)} onClick={() => void submit()}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-full px-3.5 py-2 text-sm bg-[var(--stoa-accent-soft)] flex items-center gap-1.5 active:scale-95 transition-transform stoa-focusable"
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          {t('quotes.add')}
        </button>
      )}
    </section>
  )
}
