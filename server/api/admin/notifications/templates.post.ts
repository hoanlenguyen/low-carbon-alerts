import { z } from 'zod'
import { useDrizzle, schema } from '../../../database'

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
  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const id = crypto.randomUUID()
  await db.insert(schema.messageTemplates).values({ id, ...data, createdAt: new Date() })
  return { id }
})
