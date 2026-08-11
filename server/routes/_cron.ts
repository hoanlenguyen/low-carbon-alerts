import { eq, lte, and, gte, like } from 'drizzle-orm'
import { CronExpressionParser } from 'cron-parser'
import { useDrizzle, schema } from '../database'
import { sendNotification } from '../utils/sendNotification'
import { generateAlertMessage } from '../utils/generateAlertMessage'

const SYSTEM_SENDER_ID = 'system'
const SMART_ALERT_SUBJECT_PREFIX = '[smart-alert]'

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)
  const config = useRuntimeConfig()
  const now = new Date()

  // ── Scheduled jobs ──────────────────────────────────────────────────────────
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

    const nextRunAt = CronExpressionParser.parse(job.cronExpression).next().toDate()
    await db.update(schema.scheduledJobs)
      .set({ lastRunAt: now, nextRunAt })
      .where(eq(schema.scheduledJobs.id, job.id))
  }

  // ── Smart low-carbon alert ───────────────────────────────────────────────────
  let smartAlertSent = false
  if (config.openaiApiKey) {
    try {
      // Load settings from DB
      const alertSettings = await db.query.smartAlertSettings.findFirst({
        where: eq(schema.smartAlertSettings.id, 1)
      })
      const isEnabled = alertSettings?.enabled ?? true
      const threshold = alertSettings?.threshold ?? 20
      const debounceHours = alertSettings?.debounceHours ?? 3

      if (!isEnabled) return { processed: dueJobs.length, smartAlertSent: false }

      // Fetch live grid data
      const gridData = await $fetch<{
        current: number
        points: Array<{ time: number, value: number, isForecast: boolean }>
        forecastStartMs: number
      }>('/api/forecast/consumption_emissions', { baseURL: getRequestURL(event).origin })

      if (gridData.current < threshold) {
        // Debounce: skip if a smart alert was already sent within debounceHours
        const debounceFrom = new Date(now.getTime() - debounceHours * 3_600_000)
        const recent = await db.query.messages.findFirst({
          where: and(
            like(schema.messages.subject, `${SMART_ALERT_SUBJECT_PREFIX}%`),
            gte(schema.messages.sentAt, debounceFrom)
          )
        })

        if (!recent) {
          // Compute 24h average from history points
          const historyPoints = gridData.points.filter(p => !p.isForecast)
          const avg24h = historyPoints.length
            ? historyPoints.reduce((s, p) => s + p.value, 0) / historyPoints.length
            : gridData.current

          // Count consecutive forecast hours below threshold
          const forecastPoints = gridData.points
            .filter(p => p.isForecast)
            .sort((a, b) => a.time - b.time)
          let consecutiveLowHours = 0
          for (const p of forecastPoints) {
            if (p.value < threshold) consecutiveLowHours++
            else break
          }

          const forecastStartHelsinkiTime = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki'
          }).format(new Date(gridData.forecastStartMs))

          const { subject, body } = await generateAlertMessage(
            { current: gridData.current, avg24h, consecutiveLowHours, forecastStartHelsinkiTime },
            config.openaiApiKey,
            config.openaiBaseUrl || undefined,
            config.openaiLlmModel || undefined
          )

          await sendNotification(event, {
            subject: `${SMART_ALERT_SUBJECT_PREFIX} ${subject}`,
            body,
            type: 'broadcast',
            sentById: SYSTEM_SENDER_ID
          })

          smartAlertSent = true
        }
      }
    } catch { /* non-fatal — grid API or OpenAI may be temporarily unavailable */ }
  }

  return { processed: dueJobs.length, smartAlertSent }
})
