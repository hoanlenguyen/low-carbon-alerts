import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'

const bodySchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const id = getRouterParam(event, 'id')!
  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  await db.update(schema.messageTemplates).set(data).where(eq(schema.messageTemplates.id, id))
  return { ok: true }
})
