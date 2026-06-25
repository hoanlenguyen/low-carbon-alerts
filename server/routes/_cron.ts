import { eq, lte, and } from 'drizzle-orm'
import { parseExpression } from 'cron-parser'
import { useDrizzle, schema } from '../database'
import { sendNotification } from '../utils/sendNotification'

export default defineEventHandler(async (event) => {
  // Cloudflare Cron Triggers call this route via scheduled handler
  const db = useDrizzle(event)
  const now = new Date()

  const dueJobs = await db.query.scheduledJobs.findMany({
    where: and(
      eq(schema.scheduledJobs.enabled, true),
      lte(schema.scheduledJobs.nextRunAt, now)
    )
  })

  for (const job of dueJobs) {
    const targetUserIds = job.targetUserIds ? JSON.parse(job.targetUserIds) as string[] : undefined

    await sendNotification(event, {
      subject: job.subject,
      body: job.body,
      type: job.targetType,
      sentById: job.createdById,
      targetUserIds
    })

    const nextRunAt = parseExpression(job.cronExpression).next().toDate()
    await db.update(schema.scheduledJobs)
      .set({ lastRunAt: now, nextRunAt })
      .where(eq(schema.scheduledJobs.id, job.id))
  }

  return { processed: dueJobs.length }
})
