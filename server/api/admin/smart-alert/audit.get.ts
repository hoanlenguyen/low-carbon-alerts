import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const logs = await db.query.auditLogs.findMany({
    where: eq(schema.auditLogs.action, 'smart_alert.settings.update'),
    orderBy: desc(schema.auditLogs.createdAt),
    limit: 50
  })

  return logs.map(l => ({
    id: l.id,
    userEmail: l.userEmail,
    before: l.before ? JSON.parse(l.before) : null,
    after: l.after ? JSON.parse(l.after) : null,
    createdAt: l.createdAt
  }))
})
