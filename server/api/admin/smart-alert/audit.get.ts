import { eq, desc, count } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

const PAGE_SIZE = 10

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || PAGE_SIZE))
  const offset = (page - 1) * limit

  const db = useDrizzle(event)

  const [logs, [{ total }]] = await Promise.all([
    db.query.auditLogs.findMany({
      where: eq(schema.auditLogs.action, 'smart_alert.settings.update'),
      orderBy: desc(schema.auditLogs.createdAt),
      limit,
      offset,
    }),
    db.select({ total: count() })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, 'smart_alert.settings.update')),
  ])

  return {
    data: logs.map(l => ({
      id: l.id,
      userEmail: l.userEmail,
      before: l.before ? JSON.parse(l.before) : null,
      after: l.after ? JSON.parse(l.after) : null,
      createdAt: l.createdAt,
    })),
    total,
    page,
    pageSize: limit,
    pageCount: Math.ceil(total / limit),
  }
})
