import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Sent smart-alert messages (type = 'smart-alert') with their recipient, via the
// messages → user_messages → users join. Each smart-alert message is per-user,
// so one row per message. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const rows = await db
    .select({
      messageId: schema.messages.id,
      subject: schema.messages.subject,
      body: schema.messages.body,
      sentAt: schema.messages.sentAt,
      userMessageId: schema.userMessages.id,
      email: schema.users.email
    })
    .from(schema.messages)
    .leftJoin(schema.userMessages, eq(schema.userMessages.messageId, schema.messages.id))
    .leftJoin(schema.users, eq(schema.users.id, schema.userMessages.userId))
    .where(eq(schema.messages.type, 'smart-alert'))
    .orderBy(desc(schema.messages.createdAt))
    .limit(50)

  return rows.map(r => ({
    id: r.userMessageId ?? r.messageId,
    subject: r.subject,
    body: r.body,
    sentAt: r.sentAt,
    recipient: r.email ?? null
  }))
})
