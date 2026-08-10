// Prompt 3 — RAG query rewriting (prompts/03_rag_query_rewriting.md).
// Turns the user's context into a compact search query for the vector store.
// Falls back to a deterministic keyword query when no key / on failure, so
// retrieval always has something to search with.

import { renderPrompt } from './renderPrompt'

export interface RagQueryContext {
  appliances: string[]
  timeOfDay: string // e.g. 'evening'
  carbonIntensity: number | null // gCO₂/kWh right now
  energyGoal: string
}

function fallbackQuery(ctx: RagQueryContext): string {
  const parts = [
    ...ctx.appliances,
    ctx.timeOfDay,
    'low carbon',
    'off-peak scheduling',
    ctx.energyGoal
  ]
  return parts.filter(Boolean).join(' ').toLowerCase().slice(0, 200)
}

export async function rewriteRagQuery(
  ctx: RagQueryContext,
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1',
  model = 'gpt-4o-mini'
): Promise<string> {
  if (!apiKey) return fallbackQuery(ctx)

  const prompt = renderPrompt('rag-query', {
    appliances: ctx.appliances.join(', ') || 'not specified',
    time_of_day: ctx.timeOfDay,
    carbon_intensity: ctx.carbonIntensity ?? 'unknown',
    energy_goal: ctx.energyGoal
  })

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 60,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!res.ok) return fallbackQuery(ctx)

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const content = json.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') ?? ''
    return content || fallbackQuery(ctx)
  } catch {
    return fallbackQuery(ctx)
  }
}
