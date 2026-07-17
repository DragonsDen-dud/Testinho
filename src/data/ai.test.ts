import { beforeEach, describe, expect, it } from 'vitest'
import { db, ensureAppSettings } from '../db/db'
import { recordAiUsage } from './ai'

beforeEach(async () => {
  await db.appSettings.clear()
  await ensureAppSettings()
})

describe('recordAiUsage (Article 38)', () => {
  it('starts usage at callCount 1 on the first recorded call', async () => {
    await recordAiUsage('2026-07-01')
    const settings = await db.appSettings.get('singleton')
    expect(settings?.aiUsage?.callCount).toBe(1)
  })

  it('increments callCount on each subsequent call within the same period', async () => {
    await recordAiUsage('2026-07-01')
    await recordAiUsage('2026-07-05')
    await recordAiUsage('2026-07-10')
    const settings = await db.appSettings.get('singleton')
    expect(settings?.aiUsage?.callCount).toBe(3)
  })

  it('resets after 30 days', async () => {
    await recordAiUsage('2026-06-01')
    await recordAiUsage('2026-07-05')
    const settings = await db.appSettings.get('singleton')
    expect(settings?.aiUsage?.callCount).toBe(1)
    expect(settings?.aiUsage?.currentPeriodStart).toBe('2026-07-05')
  })
})
