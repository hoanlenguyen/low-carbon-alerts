import { eq, lte, and } from 'drizzle-orm'
import { CronExpressionParser } from 'cron-parser'
import { useDrizzle, schema } from '../database'
import { sendNotification } from '../utils/sendNotification'
import { runSmartAlert } from '../utils/runSmartAlert'

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)
  const now = new Date()

  // Due scheduled jobs (includes the seeded 'smartAlert' job).
  const dueJobs = await db.query.scheduledJobs.findMany({
    where: and(
      eq(schema.scheduledJobs.enabled, true),
      lte(schema.scheduledJobs.nextRunAt, now)
    )
  })

  let smartAlertRan = false
  let smartAlertSent = 0

  for (const job of dueJobs) {
    if (job.targetType === 'smartAlert') {
      const result = await runSmartAlert(event)
      smartAlertRan = true
      smartAlertSent = result.sent
    } else {
      const targetUserIds = job.targetUserIds ? JSON.parse(job.targetUserIds) as string[] : undefined
      await sendNotification(event, {
        subject: job.subject,
        body: job.body,
        type: job.targetType,
        sentById: job.createdById,
        targetUserIds
      })
    }

    const nextRunAt = CronExpressionParser.parse(job.cronExpression).next().toDate()
    await db.update(schema.scheduledJobs)
      .set({ lastRunAt: now, nextRunAt })
      .where(eq(schema.scheduledJobs.id, job.id))
  }

  return { processed: dueJobs.length, smartAlertRan, smartAlertSent }
})
