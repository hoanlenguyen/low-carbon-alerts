import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'

const bodySchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const id = getRouterParam(event, 'id')!
  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  await db.update(schema.scheduledJobs).set(data).where(eq(schema.scheduledJobs.id, id))
  return { ok: true }
})
