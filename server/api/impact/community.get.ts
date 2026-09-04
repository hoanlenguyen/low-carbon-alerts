import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Community impact: total estimated CO2 avoided across ALL users (and how many members
// have contributed). A global aggregate shown on every end-user's "Your impact" card.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const [row] = await db
    .select({
      totalG: sql<number>`coalesce(sum(${schema.applianceShifts.estimatedSavingG}), 0)`,
      userCount: sql<number>`count(distinct ${schema.applianceShifts.userId})`
    })
    .from(schema.applianceShifts)

  return { totalSavingG: row?.totalG ?? 0, userCount: row?.userCount ?? 0 }
})
