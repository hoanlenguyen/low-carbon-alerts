import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { generateRecommendation } from '../../utils/generateRecommendation'

// Regenerate the current user's recommendation from the latest forecast + KB.
// Loads their stored profile and re-runs the RAG pipeline.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = useDrizzle(event)
  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, session.user.id)
  })
  if (!profile) {
    throw createError({ statusCode: 409, statusMessage: 'Complete onboarding first' })
  }

  let appliances: string[]
  try {
    appliances = JSON.parse(profile.appliances) as string[]
  } catch {
    appliances = []
  }

  const values = await generateRecommendation(event, {
    userId: session.user.id,
    name: session.user.name ?? null,
    appliances,
    activeHoursStart: profile.activeHoursStart,
    activeHoursEnd: profile.activeHoursEnd,
    householdSize: profile.householdSize,
    energyGoal: profile.energyGoal
  })

  return values
})
