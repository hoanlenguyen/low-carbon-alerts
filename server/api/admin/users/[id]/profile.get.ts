import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'

// Admin: fetch one consumer's onboarding energy profile (for the profile modal).
// Returns { profile: null } when the user hasn't completed onboarding.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const db = useDrizzle(event)
  const p = await db.query.userProfiles.findFirst({ where: eq(schema.userProfiles.userId, id) })
  if (!p) return { profile: null }

  const parseArr = (s: string): string[] => {
    try {
      const v = JSON.parse(s)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  }
  const parseObj = (s: string): Record<string, number> => {
    try {
      const v = JSON.parse(s)
      return v && typeof v === 'object' ? v : {}
    } catch {
      return {}
    }
  }

  return {
    profile: {
      housingType: p.housingType,
      householdSize: p.householdSize,
      contractType: p.contractType,
      primaryHeating: p.primaryHeating,
      appliances: parseArr(p.appliances),
      applianceRuntimes: parseObj(p.applianceRuntimes),
      activeHoursStart: p.activeHoursStart,
      activeHoursEnd: p.activeHoursEnd,
      energyGoal: p.energyGoal,
      notifStyle: p.notifStyle,
      maxAlertsPerDay: p.maxAlertsPerDay,
      weeklyEmailOptIn: p.weeklyEmailOptIn,
      createdAt: p.createdAt
    }
  }
})
