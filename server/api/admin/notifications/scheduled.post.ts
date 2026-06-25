import { z } from 'zod'
import { parseExpression } from 'cron-parser'
import { useDrizzle, schema } from '../../../database'

const bodySchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  targetType: z.enum(['broadcast', 'targeted']),
  targetUserIds: z.array(z.string()).optional(),
  cronExpression: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const data = await readValidatedBody(event, bodySchema.parse)

  let nextRunAt: Date
  try {
    nextRunAt = parseExpression(data.cronExpression).next().toDate()
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cron expression' })
  }

  const db = useDrizzle(event)
  const id = crypto.randomUUID()
  await db.insert(schema.scheduledJobs).values({
    id,
    name: data.name,
    subject: data.subject,
    body: data.body,
    targetType: data.targetType,
    targetUserIds: data.targetUserIds ? JSON.stringify(data.targetUserIds) : null,
    cronExpression: data.cronExpression,
    nextRunAt,
    enabled: true,
    createdById: session.user.id,
    createdAt: new Date()
  })
  return { id }
})
