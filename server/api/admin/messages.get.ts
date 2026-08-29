import { desc, inArray, count, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const PAGE_SIZE = 10

// Paginated log of every sent message (view-only), newest first. Each row is one
// messages row with its recipient count — smart-alert messages appear individually
// (one per consumer). Admin-only.
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
    db.query.messages.findMany({
      columns: { id: true, subject: true, body: true, type: true, sentAt: true, createdAt: true },
      orderBy: [desc(schema.messages.sentAt), desc(schema.messages.createdAt)],
      limit,
      offset
    }),
    db.select({ total: count() }).from(schema.messages)
  ])

  // Recipient count for the whole page in one grouped query (no N+1).
  const ids = rows.map(r => r.id)
  const countById = new Map<string, number>()
  if (ids.length) {
    const counts = await db
      .select({ messageId: schema.userMessages.messageId, c: count() })
      .from(schema.userMessages)
      .where(inArray(schema.userMessages.messageId, ids))
      .groupBy(schema.userMessages.messageId)
    for (const row of counts) countById.set(row.messageId, row.c)
  }

  // For single-recipient messages (smart alerts, single targeted), resolve who it went
  // to via messages → user_messages → users. Skip broadcasts (many recipients).
  // NOTE (future change): if broadcasts should also show recipients, expand this to
  // list them (e.g. first few + "+N more", or a dedicated per-recipient drill-down)
  // instead of only resolving the single-recipient case.
  const singleIds = ids.filter(id => (countById.get(id) ?? 0) === 1)
  const recipientById = new Map<string, { name: string | null, email: string }>()
  if (singleIds.length) {
    const recs = await db
      .select({
        messageId: schema.userMessages.messageId,
        name: schema.users.name,
        email: schema.users.email
      })
      .from(schema.userMessages)
      .innerJoin(schema.users, eq(schema.users.id, schema.userMessages.userId))
      .where(inArray(schema.userMessages.messageId, singleIds))
    for (const r of recs) recipientById.set(r.messageId, { name: r.name, email: r.email })
  }

  const total = totals?.total ?? 0

  return {
    data: rows.map(r => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      type: r.type,
      recipients: countById.get(r.id) ?? 0,
      recipient: recipientById.get(r.id) ?? null,
      sentAt: r.sentAt
    })),
    total,
    page,
    pageSize: limit,
    pageCount: Math.ceil(total / limit)
  } satisfies Pagination<SentMessageRow>
})
