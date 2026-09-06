import { eq, desc, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Past Appliance Schedules for the user: per-day run count + total saving, newest first
// (excludes today — that's shown live on the page). A compact log of what they've shifted.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const today = helsinkiDay()

  const rows = await db
    .select({
      day: schema.applianceShifts.day,
      runs: sql<number>`count(*)`,
      totalG: sql<number>`coalesce(sum(${schema.applianceShifts.estimatedSavingG}), 0)`
    })
    .from(schema.applianceShifts)
    .where(eq(schema.applianceShifts.userId, session.user.id))
    .groupBy(schema.applianceShifts.day)
    .orderBy(desc(schema.applianceShifts.day))
    .limit(30)

  return { days: rows.filter(r => r.day !== today) }
})
