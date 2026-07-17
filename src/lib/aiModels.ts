import type { ClaudeModelChoice } from '../db/types'

/** Article 38 — resolves the user's haiku/sonnet preference to a real model id. */
export function resolveModelId(choice: ClaudeModelChoice): string {
  return choice === 'sonnet' ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001'
}
