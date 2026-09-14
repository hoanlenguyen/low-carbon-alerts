import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { generateRecommendation } from '../../utils/generateRecommendation'

const bodySchema = z.object({
  housingType: z.string().min(1),
  householdSize: z.number().int().min(1).max(10),
  contractType: z.string().min(1),
  primaryHeating: z.string().min(1),
  appliances: z.array(z.string()),
  applianceRuntimes: z.record(z.string(), z.number().int().positive().max(1440)).default({}),
  activeHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  activeHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  energyGoal: z.string().min(1),
  notifStyle: z.enum(['detailed', 'simple']),
  maxAlertsPerDay: z.number().int().min(1).max(20).default(1)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const now = new Date()

  await db.insert(schema.userProfiles)
    .values({
      userId: session.user.id,
      housingType: data.housingType,
      householdSize: data.householdSize,
      contractType: data.contractType,
      primaryHeating: data.primaryHeating,
      appliances: JSON.stringify(data.appliances),
      applianceRuntimes: JSON.stringify(data.applianceRuntimes),
      activeHoursStart: data.activeHoursStart,
      activeHoursEnd: data.activeHoursEnd,
      energyGoal: data.energyGoal,
      notifStyle: data.notifStyle,
      maxAlertsPerDay: data.maxAlertsPerDay,
      createdAt: now
    })
    .onConflictDoUpdate({
      target: schema.userProfiles.userId,
      set: {
        housingType: data.housingType,
        householdSize: data.householdSize,
        contractType: data.contractType,
        primaryHeating: data.primaryHeating,
        appliances: JSON.stringify(data.appliances),
        applianceRuntimes: JSON.stringify(data.applianceRuntimes),
        activeHoursStart: data.activeHoursStart,
        activeHoursEnd: data.activeHoursEnd,
        energyGoal: data.energyGoal,
        notifStyle: data.notifStyle,
        maxAlertsPerDay: data.maxAlertsPerDay
      }
    })

  await db.update(schema.users)
    .set({ onboardingCompletedAt: now })
    .where(eq(schema.users.id, session.user.id))

  // Generate the user's first (cold-start) recommendation from the live forecast,
  // grounded in retrieved knowledge-base tips (RAG). Non-fatal: onboarding must
  // still succeed if the grid API, retrieval, or LLM is unavailable.
  // See prompts/02_cold_start.md and server/utils/generateRecommendation.ts.
  try {
    await generateRecommendation(event, {
      userId: session.user.id,
      name: session.user.name ?? null,
      appliances: data.appliances,
      activeHoursStart: data.activeHoursStart,
      activeHoursEnd: data.activeHoursEnd,
      householdSize: data.householdSize,
      energyGoal: data.energyGoal,
      housingType: data.housingType,
      contractType: data.contractType,
      primaryHeating: data.primaryHeating
    })
  } catch { /* non-fatal — first recommendation will be generated later if this fails */ }

  await setUserSession(event, {
    ...session,
    user: {
      ...session.user,
      onboardingCompletedAt: now.getTime()
    }
  })

  return { ok: true }
})
