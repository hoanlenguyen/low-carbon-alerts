import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Undo a self-reported "I shifted it" for one message.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const messageId = getRouterParam(event, 'messageId')
  if (!messageId) throw createError({ statusCode: 400, statusMessage: 'Missing messageId' })

  const db = useDrizzle(event)
  await db.delete(schema.messageActions).where(
    and(
      eq(schema.messageActions.userId, session.user.id),
      eq(schema.messageActions.messageId, messageId)
    )
  )
  return { messageId }
})
