import type { ColdStartFacts } from './buildColdStartRecommendation'
import type { RetrievedChunk } from './retrieveKnowledge'

export interface ColdStartContext {
  name: string | null
  householdSize: number
  energyGoal: string
  appliances: string[]
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
  const prompt = `You are a personalized energy advisor welcoming a NEW user to a Finnish residential energy app called "Low Carbon Alerts". This is their very first recommendation — they have no usage history yet.

## User (just onboarded)
- Name: ${firstName ?? 'unknown'}
- Household size: ${ctx.householdSize}
- Appliances: ${ctx.appliances.join(', ') || 'not specified'}
- Energy goal: ${ctx.energyGoal}

## The recommendation to phrase (already computed from the live forecast — do not change these)
- Appliance: ${facts.appliance}
- Best time: ${facts.bestTime} (Helsinki)
- Carbon intensity then: ${facts.carbonIntensity} gCO₂/kWh
- Why: ${facts.reason}

## Relevant energy-saving knowledge (optional context — weave in at most one practical detail if it fits naturally)
${knowledgeBlock}

## Rules
1. Write ONE welcoming sentence (max 2 short sentences) recommending they run the ${facts.appliance} around ${facts.bestTime}.
2. Use ONLY the appliance, time, and figures above — do not invent numbers or windows.
3. You may draw ONE natural, practical detail from the knowledge above, but do not list tips or change the recommended appliance/time.
4. Warm and welcoming since it's their first tip; do not claim to know their habits yet.
5. Friendly, plain language, no technical jargon.
6. Return JSON only, no preamble: {"recommendation":"string"}`

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
