// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import '../../i18n/i18n'
import { AskAiHabitPanel } from './AskAiHabitPanel'
import type { Habit } from '../../db/types'

const { runFreeformQueryMock } = vi.hoisted(() => ({ runFreeformQueryMock: vi.fn() }))

vi.mock('../../data/aiReports', () => ({
  runFreeformQuery: runFreeformQueryMock,
}))

vi.mock('../../state/useAppSettings', () => ({
  useAppSettings: () => ({ id: 'singleton', activeSpaceId: 'space-1', claudeApiKey: 'sk-ant-test' }),
}))

afterEach(() => {
  cleanup()
  runFreeformQueryMock.mockReset()
})

const habit: Habit = {
  id: 'habit-1',
  spaceId: 'space-1',
  name: 'Meditate',
  habitType: 'build',
  schedule: { type: 'daily', params: {} },
  reminderTimes: [],
  criticalReminder: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

/**
 * The generic "couldn't reach the AI service" message alone previously
 * discarded which of several very different failure modes actually
 * happened (blocked by the proxy's origin check, a bad key, rate-limited,
 * a network failure...) — this is the regression test for surfacing the
 * real code from `result.error` on screen instead of just the static copy.
 */
describe('AskAiHabitPanel error surfacing', () => {
  it('shows the underlying error code alongside the friendly message on failure', async () => {
    runFreeformQueryMock.mockResolvedValue({ ok: false, error: 'origin_not_allowed' })
    render(<AskAiHabitPanel habit={habit} />)

    fireEvent.change(screen.getByPlaceholderText(/why do i keep missing/i), { target: { value: 'Why?' } })
    fireEvent.click(screen.getByRole('button', { name: /ask/i }))

    await waitFor(() => expect(screen.queryByText(/origin_not_allowed/)).toBeTruthy())
    expect(screen.getByText(/couldn't reach the ai service/i)).toBeTruthy()
  })

  it('shows a different error code for a different failure, not a fixed string', async () => {
    runFreeformQueryMock.mockResolvedValue({ ok: false, error: 'invalid_api_key' })
    render(<AskAiHabitPanel habit={habit} />)

    fireEvent.change(screen.getByPlaceholderText(/why do i keep missing/i), { target: { value: 'Why?' } })
    fireEvent.click(screen.getByRole('button', { name: /ask/i }))

    await waitFor(() => expect(screen.queryByText(/invalid_api_key/)).toBeTruthy())
  })

  it('does not show an error code at all on success', async () => {
    runFreeformQueryMock.mockResolvedValue({ ok: true, text: 'Here is your answer.' })
    render(<AskAiHabitPanel habit={habit} />)

    fireEvent.change(screen.getByPlaceholderText(/why do i keep missing/i), { target: { value: 'Why?' } })
    fireEvent.click(screen.getByRole('button', { name: /ask/i }))

    await waitFor(() => expect(screen.queryByText('Here is your answer.')).toBeTruthy())
    expect(screen.queryByText(/couldn't reach the ai service/i)).toBeNull()
  })
})
