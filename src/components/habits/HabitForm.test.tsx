// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '../../i18n/i18n'
import { HabitForm } from './HabitForm'
import { db, ensureAppSettings } from '../../db/db'
import { createSpace } from '../../data/spaces'
import { updateAppSettings } from '../../state/useAppSettings'
import type { Habit } from '../../db/types'
import type { NewHabitInput } from '../../data/habits'

/**
 * STOA-8 — HabitForm is the single habit creation *and* edit flow. These
 * tests pin the two things that round established: the spine order at the
 * top of the form (Name → Look → Type), and that an emoji typed into the
 * look picker's own field is submitted through exactly the same `emoji`
 * field a grid tap would write. Real Dexie (fake-indexeddb), not mocks, so
 * the domain/time-block live queries behave as they do for a user.
 */
let spaceId = ''

beforeEach(async () => {
  await db.appSettings.clear()
  await db.spaces.clear()
  await db.lifeDomains.clear()
  await db.timeBlocks.clear()
  await db.habits.clear()
  await ensureAppSettings()
  const space = await createSpace({ name: 'Test Space', color: '#000', icon: '🏠' })
  spaceId = space.id
  await updateAppSettings({ activeSpaceId: space.id })
})

afterEach(() => cleanup())

function precedes(a: Element, b: Element) {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

describe('HabitForm — the spine comes first', () => {
  it('renders Name, then Look, then Type, ahead of every configurable field', () => {
    render(<HabitForm spaceId={spaceId} onSave={() => {}} onClose={() => {}} />)
    const name = screen.getByText('Name')
    const look = screen.getByText('Look')
    const type = screen.getByText('Type')
    const domain = screen.getByText('Domain')
    const schedule = screen.getByText('Schedule')
    expect(precedes(name, look)).toBe(true)
    expect(precedes(look, type)).toBe(true)
    expect(precedes(type, domain)).toBe(true)
    expect(precedes(type, schedule)).toBe(true)
  })

  it('keeps the look in the spine even when a stored field config from before STOA-8 hid "icon"', async () => {
    // A pre-existing habitFieldConfig may still name 'icon' in `hidden` —
    // the look is no longer a catalog field, so it renders regardless.
    await updateAppSettings({ habitFieldConfig: { hidden: ['icon'], order: ['icon', 'domain'] } })
    render(<HabitForm spaceId={spaceId} onSave={() => {}} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Look')).toBeTruthy())
    expect(screen.getByLabelText('Type your own emoji')).toBeTruthy()
  })
})

describe('HabitForm — a typed emoji is saved through the same field as a grid-picked one', () => {
  it('submits a typed multi-codepoint emoji whole, in Habit.emoji', () => {
    const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}'
    const onSave = vi.fn<(data: NewHabitInput) => void>()
    render(<HabitForm spaceId={spaceId} onSave={onSave} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('e.g. Read 10 pages'), { target: { value: 'Family dinner' } })
    fireEvent.change(screen.getByLabelText('Type your own emoji'), { target: { value: `dinner ${FAMILY}` } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][0]
    expect(saved.name).toBe('Family dinner')
    expect(saved.emoji).toBe(FAMILY)
    expect(saved.image).toBeUndefined()
  })

  it('submits a grid-tapped emoji through the very same field', () => {
    const onSave = vi.fn<(data: NewHabitInput) => void>()
    render(<HabitForm spaceId={spaceId} onSave={onSave} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('e.g. Read 10 pages'), { target: { value: 'Run' } })
    fireEvent.click(screen.getByRole('button', { name: '🏃' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave.mock.calls[0][0].emoji).toBe('🏃')
  })

  it('editing an existing habit pre-fills the typed field with its emoji and lets it be replaced', () => {
    const habit: Habit = {
      id: 'h1',
      spaceId,
      name: 'Read',
      habitType: 'build',
      emoji: '📖',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const onSave = vi.fn<(data: NewHabitInput) => void>()
    render(<HabitForm spaceId={spaceId} initial={habit} onSave={onSave} onClose={() => {}} />)

    const typed = screen.getByLabelText('Type your own emoji') as HTMLInputElement
    expect(typed.value).toBe('📖')
    fireEvent.change(typed, { target: { value: '📖🦑' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave.mock.calls[0][0].emoji).toBe('🦑')
    expect(onSave.mock.calls[0][0].name).toBe('Read')
  })
})
