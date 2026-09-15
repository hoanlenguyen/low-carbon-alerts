import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Toggle the current user's weekly-digest email opt-in (from /app/settings).
const bodySchema = z.object({ weeklyEmailOptIn: z.boolean() })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { weeklyEmailOptIn } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  await db.update(schema.userProfiles)
    .set({ weeklyEmailOptIn })
    .where(eq(schema.userProfiles.userId, session.user.id))

  return { ok: true, weeklyEmailOptIn }
})
