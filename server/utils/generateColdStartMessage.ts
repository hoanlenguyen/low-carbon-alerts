import type { ColdStartFacts } from './buildColdStartRecommendation'
import type { RetrievedChunk } from './retrieveKnowledge'
import { renderPrompt } from './renderPrompt'

export interface ColdStartContext {
  name: string | null
  householdSize: number
  energyGoal: string
  appliances: string[]
  housingType?: string
  contractType?: string
  primaryHeating?: string
  knowledge?: RetrievedChunk[] // RAG-retrieved tips to ground the prose (prompts/03–05)
}

/**
 * Wraps the deterministic cold-start facts in a warm, welcoming one-liner
 * (prompts/02_cold_start.md). The LLM only phrases — it never chooses the
 * window, appliance, or numbers. Falls back to the deterministic headline
 * when no API key is configured or the response can't be parsed.
 */
export async function generateColdStartMessage(
  facts: ColdStartFacts,
  ctx: ColdStartContext,
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1',
  model = 'gpt-4o-mini'
): Promise<string> {
  // No forecast window, or no key → use the deterministic headline as-is.
  if (!apiKey || !facts.bestTime) return facts.recommendation

  const firstName = ctx.name?.split(' ')[0] ?? null
  const knowledgeBlock = ctx.knowledge?.length
    ? ctx.knowledge.map(k => `- ${k.title}: ${k.content}`).join('\n')
    : 'None'
  const prompt = renderPrompt('cold-start', {
    name: firstName ?? 'unknown',
    household_size: ctx.householdSize,
    housing_type: ctx.housingType ?? 'unknown',
    contract_type: ctx.contractType ?? 'unknown',
    primary_heating: ctx.primaryHeating ?? 'unknown',
    appliances: ctx.appliances.join(', ') || 'not specified',
    energy_goal: ctx.energyGoal,
    appliance: facts.appliance,
    best_time: facts.bestTime ?? '',
    carbon_intensity: facts.carbonIntensity ?? 'unknown',
    reason: facts.reason,
    knowledge: knowledgeBlock
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
        temperature: 0.7,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!res.ok) return facts.recommendation

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const content = json.choices[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(content) as { recommendation?: unknown }
    if (typeof parsed.recommendation === 'string' && parsed.recommendation.trim()) {
      return parsed.recommendation.trim()
    }
    return facts.recommendation
  } catch {
    // API error or malformed JSON — deterministic headline is always valid.
    return facts.recommendation
  }
}
