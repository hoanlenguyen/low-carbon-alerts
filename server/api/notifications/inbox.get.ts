import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const rows = await db
    .select({
      id: schema.userMessages.id,
      messageId: schema.userMessages.messageId,
      read: schema.userMessages.read,
      createdAt: schema.userMessages.createdAt,
      subject: schema.messages.subject,
      body: schema.messages.body
    })
    .from(schema.userMessages)
    .innerJoin(schema.messages, eq(schema.userMessages.messageId, schema.messages.id))
    .where(eq(schema.userMessages.userId, session.user.id))
    .orderBy(desc(schema.userMessages.createdAt))
    .limit(50)

  return rows
})
