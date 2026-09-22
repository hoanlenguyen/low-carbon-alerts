import { eq, count, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403 })
  }

  const db = useDrizzle(event)

  const [users, messages, jobs, unread, carbon] = await Promise.all([
    db.select({ count: count() }).from(schema.users).where(eq(schema.users.role, 'user')),
    db.select({ count: count() }).from(schema.messages),
    db.select({ count: count() }).from(schema.scheduledJobs).where(eq(schema.scheduledJobs.enabled, true)),
    db.select({ count: count() }).from(schema.userMessages).where(eq(schema.userMessages.read, false)),
    db.select({
      totalG: sql<number>`coalesce(sum(${schema.applianceShifts.estimatedSavingG}), 0)`,
      shifts: sql<number>`count(*)`,
      shifters: sql<number>`count(distinct ${schema.applianceShifts.userId})`
    }).from(schema.applianceShifts)
  ])

  return {
    totalUsers: users[0]?.count ?? 0,
    totalMessages: messages[0]?.count ?? 0,
    activeJobs: jobs[0]?.count ?? 0,
    unreadMessages: unread[0]?.count ?? 0,
    totalSavingG: carbon[0]?.totalG ?? 0,
    totalShifts: carbon[0]?.shifts ?? 0,
    activeShifters: carbon[0]?.shifters ?? 0
  }
})
