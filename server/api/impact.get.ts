import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import { computeImpact } from '../utils/impact'

// The current user's self-reported shift impact: this week / this month / all-time
// counts + estimated grams of CO2 avoided, plus a weekly streak. The math lives in
// server/utils/impact.ts (shared with the weekly digest).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const rows = await db.query.applianceShifts.findMany({
    where: eq(schema.applianceShifts.userId, session.user.id),
    orderBy: [desc(schema.applianceShifts.createdAt)]
  })

  return computeImpact(rows.map(r => ({ estimatedSavingG: r.estimatedSavingG, day: r.day, createdAt: r.createdAt })))
})
