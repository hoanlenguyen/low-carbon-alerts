import { eq, lte, and } from 'drizzle-orm'
import { CronExpressionParser } from 'cron-parser'
import { useDrizzle, schema } from '../database'
import { sendNotification } from '../utils/sendNotification'
import { runSmartAlert } from '../utils/runSmartAlert'
import { runWeeklyDigest } from '../utils/runWeeklyDigest'

export default defineEventHandler(async (event) => {
  // Only the scheduler (the standalone cron Worker) may trigger job processing.
  // Requires `Authorization: Bearer <NUXT_CRON_SECRET>`. If no secret is
  // configured, the endpoint is locked down rather than left open.
  const cronSecret = useRuntimeConfig(event).cronSecret
  const authorized = cronSecret
    && getHeader(event, 'authorization') === `Bearer ${cronSecret}`
  if (!authorized) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

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
    } else if (job.targetType === 'weeklyDigest') {
      // Only actually send at Monday 08:00 Helsinki; other ticks just re-schedule
      // (covers the seeded next_run_at=0 so the first tick doesn't send off-schedule).
      const hp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', weekday: 'short', hour: '2-digit', hour12: false })
        .formatToParts(now).reduce((a, x) => { a[x.type] = x.value; return a }, {} as Record<string, string>)
      if (hp.weekday === 'Mon' && hp.hour === '08') {
        await runWeeklyDigest(event)
      }
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

    const nextRunAt = CronExpressionParser.parse(job.cronExpression, { tz: 'Europe/Helsinki' }).next().toDate()
    await db.update(schema.scheduledJobs)
      .set({ lastRunAt: now, nextRunAt })
      .where(eq(schema.scheduledJobs.id, job.id))
  }

  return { processed: dueJobs.length, smartAlertRan, smartAlertSent }
})
