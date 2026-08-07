import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'

// Returns the current user's active recommendation, or null if none yet.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = useDrizzle(event)
  const row = await db.query.recommendations.findFirst({
    where: eq(schema.recommendations.userId, session.user.id)
  })

  return row ?? null
})
