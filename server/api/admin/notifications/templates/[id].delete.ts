import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle(event)
  await db.delete(schema.messageTemplates).where(eq(schema.messageTemplates.id, id))
  return { ok: true }
})
