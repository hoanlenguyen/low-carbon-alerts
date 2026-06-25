import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({ token: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { token } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  await db.delete(schema.fcmTokens).where(
    and(eq(schema.fcmTokens.token, token), eq(schema.fcmTokens.userId, session.user.id))
  )
  return { ok: true }
})
