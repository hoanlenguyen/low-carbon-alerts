import type { H3Event } from 'h3'
import { useDrizzle, schema } from '../database'
import type { CarbonData } from '../api/carbon.get'
import { buildColdStartRecommendation } from './buildColdStartRecommendation'
import { rewriteRagQuery } from './rewriteRagQuery'
import { retrieveKnowledge } from './retrieveKnowledge'
import { generateColdStartMessage } from './generateColdStartMessage'
import { ensureKbIndexed } from './indexKnowledgeBase'

export interface RecommendationProfileInput {
  userId: string
  name: string | null
  appliances: string[]
  activeHoursStart: string
  activeHoursEnd: string
  householdSize: number
  energyGoal: string
}

function helsinkiTimeOfDay(): string {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Helsinki'
    }).format(new Date())
  )
  if (h < 6) return 'night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 22) return 'evening'
  return 'night'
}

/**
 * Build, RAG-ground, and persist a user's recommendation.
 *
 * Pipeline: live forecast → deterministic facts (buildColdStartRecommendation)
 * → query rewrite (Prompt 3) → knowledge retrieval (retrieveKnowledge)
 * → warm prose grounded in the retrieved tips (generateColdStartMessage).
 *
 * Best-effort throughout: retrieval and the LLM are optional; the deterministic
 * facts always produce a valid recommendation. Returns the persisted row.
 */
export async function generateRecommendation(
  event: H3Event,
  profile: RecommendationProfileInput
) {
  const config = useRuntimeConfig()

  const carbon = await $fetch<CarbonData>('/api/carbon', {
    baseURL: getRequestURL(event).origin
  })

  const facts = buildColdStartRecommendation(carbon, {
    appliances: profile.appliances,
    activeHoursStart: profile.activeHoursStart,
    activeHoursEnd: profile.activeHoursEnd
  })

  // Self-heal the knowledge base if the bundled tips changed since last embed
  // (best-effort — no manual reindex needed after a deploy that edited them).
  await ensureKbIndexed(event)

  // RAG: rewrite the user's context into a query, then retrieve matching tips.
  const query = await rewriteRagQuery(
    {
      appliances: profile.appliances,
      timeOfDay: helsinkiTimeOfDay(),
      carbonIntensity: carbon.current.value,
      energyGoal: profile.energyGoal
    },
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiLlmModel || undefined
  )
  const knowledge = await retrieveKnowledge(event, query, 3)

  const recommendation = await generateColdStartMessage(
    facts,
    {
      name: profile.name,
      householdSize: profile.householdSize,
      energyGoal: profile.energyGoal,
      appliances: profile.appliances,
      knowledge
    },
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiLlmModel || undefined
  )

  const values = {
    userId: profile.userId,
    recommendation,
    appliance: facts.appliance,
    bestTime: facts.bestTime,
    carbonIntensity: facts.carbonIntensity,
    carbonSaving: facts.carbonSaving,
    reason: facts.reason,
    tip: knowledge[0]?.content ?? null,
    isColdStart: true,
    generatedAt: new Date()
  }

  const db = useDrizzle(event)
  await db.insert(schema.recommendations)
    .values(values)
    .onConflictDoUpdate({
      target: schema.recommendations.userId,
      set: {
        recommendation: values.recommendation,
        appliance: values.appliance,
        bestTime: values.bestTime,
        carbonIntensity: values.carbonIntensity,
        carbonSaving: values.carbonSaving,
        reason: values.reason,
        tip: values.tip,
        isColdStart: values.isColdStart,
        generatedAt: values.generatedAt
      }
    })

  return values
}
