// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import '../../i18n/i18n'
import { FeedbackField } from './FeedbackField'

const { updateDiagnosticFeedbackMock } = vi.hoisted(() => ({ updateDiagnosticFeedbackMock: vi.fn() }))

vi.mock('../../data/diagnostics', () => ({
  updateDiagnosticFeedback: updateDiagnosticFeedbackMock,
}))

afterEach(() => {
  cleanup()
  updateDiagnosticFeedbackMock.mockReset()
})

/**
 * The requirement is explicit that the Save button must be the actual
 * persistence mechanism, not decorative on top of an autosave — these
 * verify typing alone never calls updateDiagnosticFeedback, only clicking
 * Save does, and that the button's enabled/disabled state tracks whether
 * there's an actual unsaved edit.
 */
describe('FeedbackField', () => {
  it('Save is disabled with no edit yet (nothing to save)', () => {
    render(<FeedbackField entryId="entry-1" initialValue="" />)
    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('typing alone never persists — Save is the only mechanism', () => {
    render(<FeedbackField entryId="entry-1" initialValue="" />)
    fireEvent.change(screen.getByPlaceholderText(/reaction to this report/i), { target: { value: 'Felt good.' } })

    expect(updateDiagnosticFeedbackMock).not.toHaveBeenCalled()
    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('clicking Save persists the current draft to the given entryId', async () => {
    updateDiagnosticFeedbackMock.mockResolvedValue(undefined)
    render(<FeedbackField entryId="entry-42" initialValue="" />)
    fireEvent.change(screen.getByPlaceholderText(/reaction to this report/i), { target: { value: 'Felt good.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateDiagnosticFeedbackMock).toHaveBeenCalledWith('entry-42', 'Felt good.'))
  })

  it('shows a "Saved" confirmation after a successful save, and Save becomes disabled again', async () => {
    updateDiagnosticFeedbackMock.mockResolvedValue(undefined)
    render(<FeedbackField entryId="entry-1" initialValue="" />)
    fireEvent.change(screen.getByPlaceholderText(/reaction to this report/i), { target: { value: 'Felt good.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByText('Saved')).toBeTruthy())
    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('editing again after a save returns Save to an actionable state and clears the confirmation', async () => {
    updateDiagnosticFeedbackMock.mockResolvedValue(undefined)
    render(<FeedbackField entryId="entry-1" initialValue="" />)
    fireEvent.change(screen.getByPlaceholderText(/reaction to this report/i), { target: { value: 'Felt good.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByText('Saved')).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText(/reaction to this report/i), { target: { value: 'Felt good, then tired.' } })

    expect(screen.queryByText('Saved')).toBeNull()
    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})
