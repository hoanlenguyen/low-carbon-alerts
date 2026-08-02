import { eq, count, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403 })
  }

  const db = useDrizzle(event)

  const msgs = await db.query.messages.findMany({
    columns: { id: true, subject: true, type: true, sentAt: true, createdAt: true },
    orderBy: [desc(schema.messages.createdAt)],
    limit: 5
  })

  const results = await Promise.all(
    msgs.map(async (msg) => {
      const [rec] = await db
        .select({ count: count() })
        .from(schema.userMessages)
        .where(eq(schema.userMessages.messageId, msg.id))
      return { ...msg, recipients: rec?.count ?? 0 }
    })
  )

  return results
})
