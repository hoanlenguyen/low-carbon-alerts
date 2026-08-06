import { like, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const alerts = await db.query.messages.findMany({
    where: like(schema.messages.subject, '[smart-alert]%'),
    orderBy: desc(schema.messages.createdAt),
    limit: 50
  })

  return alerts.map(a => ({
    id: a.id,
    subject: a.subject.replace(/^\[smart-alert\]\s*/, ''),
    body: a.body,
    sentAt: a.sentAt
  }))
})
