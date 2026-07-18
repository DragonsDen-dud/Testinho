export type ReportType = 'scheduled_template' | 'freeform_query'

export interface AiPromptContext {
  autoStats: Record<string, unknown>
  northStar?: string
  question?: string
  habitName?: string
  // Article 12/16 — the prior period's DiagnosticEntry.userFeedback for the
  // same Space+scope, scheduled_template only. Undefined/omitted whenever
  // there's no prior entry or it had no feedback — never a placeholder.
  priorFeedback?: string
}

// Article 16 — two separate system prompts, not one prompt with a mode flag.
// Both are told the autoStats numbers are already-computed ground truth
// (Articles 26/35), so the model states them rather than re-deriving guesses
// from raw counts it was never given anyway.

const SCHEDULED_SYSTEM_PROMPT = `You are STOA's local reflection assistant. You write a short, calm, non-judgmental periodic report about the user's own habit and task data, which they track privately for themselves. Never invent facts — use only the structured stats given to you. Structure your answer in exactly four sections, each starting with its heading on its own line:

Strengths
Weak spots
Concrete strategy for next period
Comparison to previous period

Under "Concrete strategy for next period", give 2-3 short bullet points, not paragraphs. Any weekday pattern, time-of-day pattern, or mood correlation numbers you're given have already been computed from the user's real data by a separate local process — state them as given facts, don't re-derive or second-guess them. Keep the whole response under 250 words.`

const FREEFORM_SYSTEM_PROMPT = `You are STOA's local reflection assistant, answering one specific question the user asked about their own private habit/task data. Use only the structured stats given to you — never invent facts, and say so plainly if the data given can't answer the question. Answer directly, in plain language, with no imposed section structure. Keep it under 150 words unless the question specifically calls for more detail.`

export function buildSystemPrompt(reportType: ReportType): string {
  return reportType === 'scheduled_template' ? SCHEDULED_SYSTEM_PROMPT : FREEFORM_SYSTEM_PROMPT
}

/**
 * Assembles the user-turn content. North Star text is only ever included
 * when `ctx.northStar` is passed — callers must gate that on the user's
 * explicit per-call opt-in (never a stored default), so its mere presence
 * here is the only condition, deliberately with no separate on/off flag to
 * get out of sync with the caller's decision.
 */
export function buildUserMessage(reportType: ReportType, ctx: AiPromptContext): string {
  const parts: string[] = []
  if (reportType === 'freeform_query') {
    parts.push(`Question: ${ctx.question ?? ''}`)
    if (ctx.habitName) parts.push(`This question is specifically about the habit "${ctx.habitName}".`)
  }
  parts.push(`Data (autoStats, computed locally ahead of time, treat as ground truth):\n${JSON.stringify(ctx.autoStats, null, 2)}`)
  // Placed right after autoStats, ahead of North Star: this is the user's
  // own reflection on the *same* reporting cycle the "Comparison to
  // previous period" section is about, a much tighter tie to this call's
  // purpose than North Star's broader, rarer, opt-in identity/goals context
  // — reportType-gated even though nothing currently calls this with
  // priorFeedback set for freeform_query, so the guard isn't just relying
  // on caller discipline.
  if (reportType === 'scheduled_template' && ctx.priorFeedback) {
    parts.push(
      `The user's own written reflection from the previous period (their own words — acknowledge it if it's relevant to this period's data, but don't force a reference if it doesn't naturally fit):\n${ctx.priorFeedback}`,
    )
  }
  if (ctx.northStar) {
    parts.push(
      `The user's North Star (their own stated long-term intent, included only because they explicitly opted in for this request):\n${ctx.northStar}`,
    )
  }
  return parts.join('\n\n')
}
