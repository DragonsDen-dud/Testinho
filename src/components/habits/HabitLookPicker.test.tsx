// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '../../i18n/i18n'
import { HabitLookPicker } from './HabitLookPicker'

const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}' // 👨‍👩‍👧
const THUMBS_MEDIUM = '\u{1F44D}\u{1F3FD}' // 👍🏽
const FLAG_UA = '\u{1F1FA}\u{1F1E6}' // 🇺🇦

function renderPicker(props: Partial<Parameters<typeof HabitLookPicker>[0]> = {}) {
  const onChange = vi.fn()
  render(<HabitLookPicker name="Squats" color="#3b82f6" icon="Dumbbell" onChange={onChange} {...props} />)
  return { onChange, typed: screen.getByLabelText('Type your own emoji') as HTMLInputElement }
}

afterEach(() => cleanup())

describe('HabitLookPicker — all three affordances are visible at once (STOA-8)', () => {
  it('shows the typed-emoji field, the photo button and the emoji grid without switching anything', () => {
    renderPicker()
    expect(screen.getByLabelText('Type your own emoji')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Choose a photo/ })).toBeTruthy()
    // A grid cell from the curated set, present on first render with an
    // emoji already chosen or not — no tab to open first.
    expect(screen.getByRole('button', { name: '🏃' })).toBeTruthy()
  })
})

describe('HabitLookPicker — the typed field writes the same emoji field the grid does', () => {
  it('a typed emoji becomes the habit emoji and drops any photo, exactly like a grid tap', () => {
    const { onChange, typed } = renderPicker({ image: new Blob(['x'], { type: 'image/jpeg' }) })
    fireEvent.change(typed, { target: { value: '🦑' } })
    expect(onChange).toHaveBeenCalledWith({ emoji: '🦑', image: undefined })

    onChange.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '🏃' }))
    expect(onChange).toHaveBeenCalledWith({ emoji: '🏃', image: undefined })
  })

  it('resolves text typed around an emoji, and several emoji, down to one whole emoji', () => {
    const { onChange, typed } = renderPicker()
    fireEvent.change(typed, { target: { value: `family ${FAMILY} time` } })
    expect(onChange).toHaveBeenLastCalledWith({ emoji: FAMILY, image: undefined })

    fireEvent.change(typed, { target: { value: `${THUMBS_MEDIUM}${FLAG_UA}` } })
    expect(onChange).toHaveBeenLastCalledWith({ emoji: THUMBS_MEDIUM, image: undefined })
  })

  it('a new emoji typed after the mirrored current one replaces it', () => {
    const { onChange, typed } = renderPicker({ emoji: '🏃' })
    expect(typed.value).toBe('🏃')
    fireEvent.change(typed, { target: { value: `🏃${FLAG_UA}` } })
    expect(onChange).toHaveBeenLastCalledWith({ emoji: FLAG_UA, image: undefined })
  })

  it('plain text is discarded: nothing changes and the field keeps the current emoji', () => {
    const { onChange, typed } = renderPicker({ emoji: '🏃' })
    fireEvent.change(typed, { target: { value: '🏃abc' } })
    fireEvent.change(typed, { target: { value: 'abc' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(typed.value).toBe('🏃')
  })

  it('emptying the field clears the emoji tier so the look falls back to the drawn icon', () => {
    const { onChange, typed } = renderPicker({ emoji: '🏃' })
    fireEvent.change(typed, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith({ emoji: undefined })
  })

  it('emptying an already-empty field is a no-op', () => {
    const { onChange, typed } = renderPicker()
    fireEvent.change(typed, { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
