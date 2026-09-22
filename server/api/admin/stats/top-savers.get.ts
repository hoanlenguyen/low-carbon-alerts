import { sql, eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Top consumers by total estimated CO2 saved (all-time). Admin-only. Used by the
// dashboard leaderboard.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const rows = await db
    .select({
      userId: schema.applianceShifts.userId,
      userName: schema.users.userName,
      name: schema.users.name,
      savingG: sql<number>`coalesce(sum(${schema.applianceShifts.estimatedSavingG}), 0)`,
      shifts: sql<number>`count(*)`
    })
    .from(schema.applianceShifts)
    .leftJoin(schema.users, eq(schema.users.id, schema.applianceShifts.userId))
    .groupBy(schema.applianceShifts.userId)
    .orderBy(desc(sql`sum(${schema.applianceShifts.estimatedSavingG})`))
    .limit(5)

  return rows.map(r => ({
    userId: r.userId,
    userName: r.userName ?? '—',
    name: r.name,
    savingG: r.savingG ?? 0,
    shifts: r.shifts ?? 0
  }))
})
