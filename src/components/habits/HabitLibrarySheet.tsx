import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Select } from '../ui/Input'
import { SectionHeader } from '../ui/SectionHeader'
import { HabitVisual } from './HabitVisual'
import { resolveHabitDomainStyle } from './HabitCategoryBadge'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { createHabit } from '../../data/habits'
import {
  HABIT_TEMPLATE_GROUPS,
  templatesInGroup,
  alreadyAddedKeys,
  HABIT_TEMPLATES,
  type HabitTemplate,
} from '../../lib/habitLibrary'
import type { Habit, LifeDomain } from '../../db/types'

/**
 * The habit library, as a picker.
 *
 * WHY IT EXISTS. Creating a habit meant facing an empty form and inventing
 * both the name and every setting behind it — schedule, type, whether it is
 * countable and in what unit. That is a lot of decisions for something the
 * user has not started doing yet, and it is the reason a tracker's habit
 * list often stays at two entries.
 *
 * WHAT IT DELIBERATELY IS NOT (Article 1). It does not preconfigure the
 * app, it is not applied on install, and it endorses nothing. Every pick
 * becomes an ordinary Habit row with no marker of where it came from —
 * rename it, reschedule it, delete it, and no code anywhere behaves
 * differently. It is a stack of prefilled forms.
 *
 * Multi-select rather than tap-to-add-immediately: setting up a routine is
 * one sitting, and closing the sheet after every single habit would make
 * adding five of them five round trips.
 */
export function HabitLibrarySheet({
  spaceId,
  domains,
  existingHabits,
  onClose,
  onAdded,
}: {
  spaceId: string
  domains: LifeDomain[]
  /** Used to mark templates the user already has, by name. */
  existingHabits: Habit[]
  onClose: () => void
  /** The ids actually created, so the caller can offer a real undo. */
  onAdded: (createdIds: string[]) => void
}) {
  const { t } = useTranslation()
  const styleMap = useCategoryStyleMap()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [domainId, setDomainId] = useState('')
  const [saving, setSaving] = useState(false)

  const nameOf = (tpl: HabitTemplate) => t(`habitLibrary.items.${tpl.key}`)
  const already = useMemo(
    () => alreadyAddedKeys(HABIT_TEMPLATES, existingHabits.map((h) => h.name), nameOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingHabits],
  )

  // The colour the new habits will actually take, so the preview badges in
  // the sheet match what lands on the grid.
  const previewColor = resolveHabitDomainStyle(domainId || undefined, domains, styleMap).color

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function addSelected() {
    if (saving || selected.size === 0) return
    setSaving(true)
    const chosen = HABIT_TEMPLATES.filter((tpl) => selected.has(tpl.key))
    const created: string[] = []
    for (const tpl of chosen) {
      const habit = await createHabit({
        spaceId,
        name: nameOf(tpl),
        habitType: tpl.habitType,
        domainId: domainId || undefined,
        emoji: tpl.emoji,
        icon: tpl.icon,
        schedule: tpl.schedule,
        reminderTimes: [],
        criticalReminder: false,
        ...(tpl.measurable
          ? {
              measurable: {
                targetValue: tpl.measurable.targetValue,
                unit: t(`habitLibrary.units.${tpl.measurable.unitKey}`),
              },
            }
          : {}),
      })
      created.push(habit.id)
    }
    onAdded(created)
  }

  return (
    <Sheet
      title={t('habitLibrary.title')}
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end items-center">
          {selected.size === 0 && (
            <span className="text-xs text-[var(--stoa-text-muted)] mr-auto">
              {t('habitLibrary.nothingSelected')}
            </span>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" disabled={saving || selected.size === 0} onClick={() => void addSelected()}>
            {/* "Add 0 habits" is a nonsense label and wrapped to two lines
                in the footer. With nothing picked the hint beside it already
                says what to do, so the button just reads "Add". */}
            {selected.size === 0 ? t('common.add') : t('habitLibrary.addSelected', { count: selected.size })}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-[var(--stoa-text-muted)]">{t('habitLibrary.subtitle')}</p>

        {domains.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs uppercase text-[var(--stoa-text-muted)]">
              {t('habitLibrary.domainLabel')}
            </span>
            <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">{t('habitLibrary.noDomain')}</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </Select>
          </label>
        )}

        {HABIT_TEMPLATE_GROUPS.map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <SectionHeader title={t(`habitLibrary.groups.${group}`)} />
            <div className="flex flex-col">
              {templatesInGroup(group).map((tpl) => {
                const isSelected = selected.has(tpl.key)
                const isAdded = already.has(tpl.key)
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    disabled={isAdded}
                    aria-pressed={isSelected}
                    onClick={() => toggle(tpl.key)}
                    className="flex items-center gap-3 py-2.5 px-1 text-left rounded-lg border-b border-[var(--stoa-border)] last:border-b-0 disabled:opacity-45 stoa-focusable"
                  >
                    <HabitVisual
                      habit={{ emoji: tpl.emoji, icon: tpl.icon }}
                      fallbackIcon={tpl.icon}
                      color={previewColor}
                      size={34}
                      rounded="rounded-xl"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-[var(--stoa-text)] truncate">{nameOf(tpl)}</span>
                      <span className="block text-[11px] text-[var(--stoa-text-muted)] truncate">
                        {tpl.habitType === 'avoid' ? t('habits.typeAvoid') : t('habits.typeBuild')}
                        {tpl.measurable
                          ? ` · ${tpl.measurable.targetValue} ${t(`habitLibrary.units.${tpl.measurable.unitKey}`)}`
                          : ''}
                      </span>
                    </span>
                    {isAdded ? (
                      <span className="text-[11px] text-[var(--stoa-text-muted)] shrink-0">
                        {t('habitLibrary.added')}
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                        style={{
                          border: isSelected ? 'none' : '1.5px solid var(--stoa-border)',
                          background: isSelected ? 'var(--stoa-accent)' : 'transparent',
                        }}
                      >
                        {isSelected && <Check size={13} strokeWidth={3} color="var(--stoa-bg)" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
