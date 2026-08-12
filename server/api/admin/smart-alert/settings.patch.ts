import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

const bodySchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().int().min(1).max(200),
  debounceHours: z.number().int().min(1).max(24),
  horizonHours: z.number().int().min(1).max(24)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const now = new Date()

  const before = await db.query.smartAlertSettings.findFirst({
    where: eq(schema.smartAlertSettings.id, 1)
  })

  await db.update(schema.smartAlertSettings)
    .set({ ...data, updatedAt: now, updatedById: session.user.id })
    .where(eq(schema.smartAlertSettings.id, 1))

  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    userEmail: session.user.email,
    action: 'smart_alert.settings.update',
    before: JSON.stringify({ enabled: before?.enabled, threshold: before?.threshold, debounceHours: before?.debounceHours, horizonHours: before?.horizonHours }),
    after: JSON.stringify(data),
    createdAt: now
  })

  return { ok: true }
})
