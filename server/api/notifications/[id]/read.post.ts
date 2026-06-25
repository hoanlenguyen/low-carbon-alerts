import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = getRouterParam(event, 'id')!
  const db = useDrizzle(event)
  await db.update(schema.userMessages)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(schema.userMessages.id, id),
      eq(schema.userMessages.userId, session.user.id)
    ))
  return { ok: true }
})
