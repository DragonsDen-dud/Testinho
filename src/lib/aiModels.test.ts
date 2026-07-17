import { describe, expect, it } from 'vitest'
import { resolveModelId } from './aiModels'

describe('resolveModelId (Article 38 — model preference respected)', () => {
  it('maps haiku to the haiku model id', () => {
    expect(resolveModelId('haiku')).toBe('claude-haiku-4-5-20251001')
  })

  it('maps sonnet to the sonnet model id', () => {
    expect(resolveModelId('sonnet')).toBe('claude-sonnet-5')
  })
})
