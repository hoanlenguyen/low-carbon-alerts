import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'
import type { ForecastData } from '../../forecast/[series].get'
import { findLowCarbonWindow, windowUrgency, next24hAverage, formatWindowRange } from '../../../utils/lowCarbonWindow'
import { flexibleAppliances } from '../../../utils/buildColdStartRecommendation'
import { getFlexibleAppliancePriority, getApplianceCatalog } from '../../../utils/appliancesCache'
import { generatePushMessage } from '../../../utils/generatePushMessage'
import { sendNotification } from '../../../utils/sendNotification'

// Generate a personalized Prompt 7 smart-alert for one user (using their name +
// profile appliances + the live forecast) and send it to them — so an admin can
// verify the real message content. Admin-only.
const bodySchema = z.object({ userId: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { userId } = await readValidatedBody(event, bodySchema.parse)
  const config = useRuntimeConfig()
  const db = useDrizzle(event)

  // Only active end-users (role 'user') can be alert targets — never admins or inactive accounts.
  const user = await db.query.users.findFirst({
    where: and(eq(schema.users.id, userId), eq(schema.users.role, 'user'), eq(schema.users.status, 'active'))
  })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Active end-user not found' })
  }
  const profile = await db.query.userProfiles.findFirst({ where: eq(schema.userProfiles.userId, userId) })

  const carbon = await $fetch<ForecastData>('/api/forecast/consumption_emissions', { baseURL: getRequestURL(event).origin })
  const win = findLowCarbonWindow(carbon)
  if (!win) {
    throw createError({ statusCode: 422, statusMessage: 'No low-carbon window in the next 24h to alert on' })
  }

  let appliances: string[] = []
  if (profile) {
    try { appliances = JSON.parse(profile.appliances) as string[] } catch { appliances = [] }
  }
  const appliancePriority = await getFlexibleAppliancePriority(event)
  const options = appliances.length ? flexibleAppliances(appliances, appliancePriority) : ['Washing machine']
  const urgency = windowUrgency(win.startMs)
  const display = formatWindowRange(win.startMs, win.endMs)

  const body = await generatePushMessage(
    { name: user.name ?? null, appliances: options, windowStart: display.start, windowEnd: display.end, carbonIntensity: win.intensity, avg24h: next24hAverage(carbon.points), urgency, notifStyle: profile?.notifStyle ?? 'detailed' },
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiLlmModel || undefined
  )
  const subject = `Clean energy window ${display.start} – ${display.end}`

  // Record this as a one-consumer smart-alert run so it reads as a smart alert
  // everywhere (Sent messages list + grouped in the dashboard), like the cron.
  const runId = crypto.randomUUID()
  const now = new Date()

  const { messageId } = await sendNotification(event, {
    subject,
    body,
    type: 'smart-alert',
    sentById: session.user.id,
    targetUserIds: [userId],
    smartAlertRunId: runId
  })

  await db.insert(schema.smartAlertRuns).values({
    id: runId,
    ranAt: now,
    windowFound: true,
    carbonIntensity: win.intensity,
    windowStart: win.start,
    windowEnd: win.end,
    recipientCount: 1
  })

  // Mark this test send as a smart alert + remember the suggested appliance so the
  // consumer can schedule it from /app/alerts.
  const catalog = await getApplianceCatalog(event)
  const slugByName = new Map(catalog.map(a => [a.name.toLowerCase(), a.slug]))
  await db.insert(schema.smartAlertContext).values({
    messageId,
    suggestedApplianceSlug: slugByName.get(options[0]!.toLowerCase()) ?? null,
    createdAt: new Date()
  })

  return {
    sent: true,
    to: user.name || user.userName,
    subject,
    body,
    meta: { appliances: options, windowStart: win.start, windowEnd: win.end, carbonIntensity: win.intensity, urgency }
  }
})
