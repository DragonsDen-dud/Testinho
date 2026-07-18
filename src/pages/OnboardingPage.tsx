import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'
import { SwatchPicker } from '../components/ui/SwatchPicker'
import { EmojiInput } from '../components/ui/EmojiInput'
import { PRESET_COLORS, PRESET_ICONS } from '../lib/presets'
import { createSpace } from '../data/spaces'
import { createDomain } from '../data/domains'
import { updateAppSettings, useAppSettings } from '../state/useAppSettings'

type Step = 'welcome' | 'space' | 'domain'

export function OnboardingPage() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  const [step, setStep] = useState<Step>('welcome')
  const [spaceName, setSpaceName] = useState('')
  const [spaceColor, setSpaceColor] = useState(PRESET_COLORS[0])
  const [spaceIcon, setSpaceIcon] = useState(PRESET_ICONS[0])
  const [domainName, setDomainName] = useState('')
  const [domainColor, setDomainColor] = useState(PRESET_COLORS[1])
  const [domainIcon, setDomainIcon] = useState(PRESET_ICONS[1])
  const [showSpaceExamples, setShowSpaceExamples] = useState(false)
  const [showDomainExamples, setShowDomainExamples] = useState(false)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function finishOnboarding(withDomain: boolean) {
    setSubmitting(true)
    let activeSpaceId = spaceId
    if (!activeSpaceId) {
      const space = await createSpace(
        {
          name: spaceName.trim() || t('onboarding.spaceExamples').split(',')[0].trim(),
          color: spaceColor,
          icon: spaceIcon,
        },
        settings?.language ?? 'en',
      )
      activeSpaceId = space.id
    }
    if (withDomain && domainName.trim()) {
      await createDomain({
        spaceId: activeSpaceId,
        name: domainName.trim(),
        color: domainColor,
        icon: domainIcon,
      })
    }
    await updateAppSettings({ activeSpaceId, onboardingComplete: true })
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
      {step === 'welcome' && (
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-2xl font-semibold">{t('onboarding.welcomeTitle')}</h1>
          <p className="text-sm text-[var(--stoa-text-muted)] leading-relaxed">
            {t('onboarding.welcomeSubtitle')}
          </p>
          <Button onClick={() => setStep('space')}>{t('onboarding.finish')}</Button>
        </div>
      )}

      {step === 'space' && (
        <form
          className="flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!spaceName.trim()) return
            const space = await createSpace(
              { name: spaceName.trim(), color: spaceColor, icon: spaceIcon },
              settings?.language ?? 'en',
            )
            setSpaceId(space.id)
            setStep('domain')
          }}
        >
          <div>
            <h1 className="text-xl font-semibold mb-1">{t('onboarding.createSpaceTitle')}</h1>
            <p className="text-sm text-[var(--stoa-text-muted)]">{t('onboarding.createSpaceHint')}</p>
          </div>
          <Field label={t('spaces.name')}>
            <Input
              autoFocus
              placeholder={t('onboarding.spaceNamePlaceholder')}
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              required
            />
          </Field>
          <Field label={t('spaces.icon')}>
            <SwatchPicker kind="icon" options={PRESET_ICONS} value={spaceIcon} onChange={setSpaceIcon} />
          </Field>
          <Field label={t('spaces.color')}>
            <SwatchPicker kind="color" options={PRESET_COLORS} value={spaceColor} onChange={setSpaceColor} />
          </Field>
          <button
            type="button"
            className="text-xs text-[var(--stoa-accent)] self-start"
            onClick={() => setShowSpaceExamples((v) => !v)}
          >
            {showSpaceExamples ? t('onboarding.hideExamples') : t('onboarding.showExamples')}
          </button>
          {showSpaceExamples && (
            <p className="text-xs text-[var(--stoa-text-muted)] -mt-3">
              {t('onboarding.examplesLabel')}: {t('onboarding.spaceExamples')}
            </p>
          )}
          <Button type="submit" disabled={!spaceName.trim()}>
            {t('common.add')}
          </Button>
        </form>
      )}

      {step === 'domain' && (
        <form
          className="flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault()
            await finishOnboarding(true)
          }}
        >
          <div>
            <h1 className="text-xl font-semibold mb-1">{t('onboarding.createDomainTitle')}</h1>
            <p className="text-sm text-[var(--stoa-text-muted)]">{t('onboarding.createDomainHint')}</p>
          </div>
          <Field label={t('domains.name')}>
            <Input
              autoFocus
              placeholder={t('onboarding.domainNamePlaceholder')}
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
            />
          </Field>
          <Field label={t('domains.icon')}>
            <EmojiInput value={domainIcon} onChange={setDomainIcon} />
          </Field>
          <Field label={t('spaces.color')}>
            <SwatchPicker kind="color" options={PRESET_COLORS} value={domainColor} onChange={setDomainColor} />
          </Field>
          <button
            type="button"
            className="text-xs text-[var(--stoa-accent)] self-start"
            onClick={() => setShowDomainExamples((v) => !v)}
          >
            {showDomainExamples ? t('onboarding.hideExamples') : t('onboarding.showExamples')}
          </button>
          {showDomainExamples && (
            <p className="text-xs text-[var(--stoa-text-muted)] -mt-3">
              {t('onboarding.examplesLabel')}: {t('onboarding.domainExamples')}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={submitting}
              onClick={() => finishOnboarding(false)}
            >
              {t('onboarding.skip')}
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || !domainName.trim()}>
              {t('onboarding.finish')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
