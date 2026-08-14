import { eq, desc, count } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

const PAGE_SIZE = 10

// Sent smart-alert messages (type = 'smart-alert') with their recipient, via the
// messages → user_messages → users join. Each smart-alert message is per-user,
// so one row per message. Paginated. Admin-only.
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

  const [rows, [totals]] = await Promise.all([
    db
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
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(schema.messages)
      .leftJoin(schema.userMessages, eq(schema.userMessages.messageId, schema.messages.id))
      .where(eq(schema.messages.type, 'smart-alert'))
  ])

  const total = totals?.total ?? 0

  return {
    data: rows.map(r => ({
      id: r.userMessageId ?? r.messageId,
      subject: r.subject,
      body: r.body,
      sentAt: r.sentAt,
      recipient: r.email ?? null
    })),
    total,
    page,
    pageSize: limit,
    pageCount: Math.ceil(total / limit)
  }
})
