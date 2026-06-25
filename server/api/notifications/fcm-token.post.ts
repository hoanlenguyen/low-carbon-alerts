import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({ token: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { token } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)

  const existing = await db.query.fcmTokens.findFirst({
    where: eq(schema.fcmTokens.token, token)
  })
  if (!existing) {
    await db.insert(schema.fcmTokens).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      token,
      createdAt: new Date()
    })
  }
  return { ok: true }
})
