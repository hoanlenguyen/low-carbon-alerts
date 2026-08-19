import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Identified by messageId (messages.id) — the stable identity shared by the
  // inbox, SSE, and FCM payloads, so pushed and loaded messages mark read alike.
  const messageId = getRouterParam(event, 'id')!
  const db = useDrizzle(event)
  await db.update(schema.userMessages)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(schema.userMessages.messageId, messageId),
      eq(schema.userMessages.userId, session.user.id)
    ))
  return { ok: true }
})
