import { z } from 'zod'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({ token: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { token } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)

  // An FCM token is per-browser, not per-user: whoever is currently signed in on
  // this browser should own it. Atomic upsert on the unique `token` avoids the
  // find-then-insert race (which threw a unique-constraint 500) and reassigns
  // ownership when a different account signs in on the same browser.
  await db.insert(schema.fcmTokens)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      token,
      createdAt: new Date()
    })
    .onConflictDoUpdate({
      target: schema.fcmTokens.token,
      set: { userId: session.user.id, createdAt: new Date() }
    })

  return { ok: true }
})
