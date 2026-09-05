import type { H3Event } from 'h3'
import { eq, and, gte } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import type { ForecastData } from '../api/forecast/[series].get'
import {
  findWindowBelowInActiveHours,
  windowUrgency,
  next24hAverage,
  formatWindowRange
} from './lowCarbonWindow'
import { generatePushMessage } from './generatePushMessage'
import { flexibleAppliances } from './buildColdStartRecommendation'
import { getFlexibleAppliancePriority, getApplianceCatalog } from './appliancesCache'
import { sendNotification } from './sendNotification'

const SYSTEM_SENDER_ID = 'system'
const MIN_WINDOW_HOURS = 3

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export interface SmartAlertResult {
  windowFound: boolean
  sent: number
  reason?: string
}

// Forecast-based smart alert, detected PER CONSUMER: for each active end-user we
// find the best low-carbon window inside their own active hours and alert them
// about that window (debounced per consumer). One run per cron tick is recorded
// to smart_alert_runs (the trigger history).
export async function runSmartAlert(event: H3Event): Promise<SmartAlertResult> {
  const db = useDrizzle(event)
  const config = useRuntimeConfig()
  const now = new Date()

  const settings = await db.query.smartAlertSettings.findFirst({
    where: eq(schema.smartAlertSettings.id, 1)
  })
  const enabled = settings?.enabled ?? true
  const threshold = settings?.threshold ?? 20
  const debounceHours = settings?.debounceHours ?? 3
  const horizonHours = settings?.horizonHours ?? 6

  if (!enabled) return { windowFound: false, sent: 0, reason: 'disabled' }

  const forecast = await $fetch<ForecastData>(
    '/api/forecast/consumption_emissions',
    { baseURL: getRequestURL(event).origin }
  )
  const horizonMs = horizonHours * 3_600_000
  const avg24h = next24hAverage(forecast.points) // global grid metric, same for all consumers

  // Active end-users with a profile (active hours drive per-consumer detection).
  const users = await db.query.users.findMany({
    where: and(
      eq(schema.users.role, 'user'),
      eq(schema.users.status, 'active')
    ),
    columns: { id: true, name: true }
  })
  const profiles = await db.query.userProfiles.findMany()
  const profileByUser = new Map(profiles.map(p => [p.userId, p]))

  // Catalog-driven appliance shiftability order — loaded once for the whole run.
  const appliancePriority = await getFlexibleAppliancePriority(event)
  // Name → slug map so we can persist the suggested appliance as a catalog slug.
  const catalog = await getApplianceCatalog(event)
  const slugByName = new Map(catalog.map(a => [a.name.toLowerCase(), a.slug]))

  // Per-consumer debounce: users who already got a smart-alert within the window.
  const debounceFrom = new Date(now.getTime() - debounceHours * 3_600_000)
  const recentRows = await db
    .select({ userId: schema.userMessages.userId })
    .from(schema.userMessages)
    .innerJoin(
      schema.messages,
      eq(schema.messages.id, schema.userMessages.messageId)
    )
    .where(
      and(
        eq(schema.messages.type, 'smart-alert'),
        gte(schema.userMessages.createdAt, debounceFrom)
      )
    )
  const recentlyAlerted = new Set(recentRows.map(r => r.userId))

  let sent = 0
  let anyWindow = false

  // Run id created up front so every per-consumer message can reference it (grouping).
  const runId = crypto.randomUUID()

  for (const user of users) {
    const profile = profileByUser.get(user.id)
    if (!profile) continue

    // The best low-carbon window inside THIS consumer's active hours.
    // TODO: window length is fixed by MIN_WINDOW_HOURS / the horizon. Later, size it
    // from the picked appliance's `typicalDurationMin` (catalog) so the window matches
    // how long the load actually runs. Not wired yet — see appliances table.
    const window = findWindowBelowInActiveHours(
      forecast.points,
      threshold,
      horizonMs,
      MIN_WINDOW_HOURS,
      toMin(profile.activeHoursStart),
      toMin(profile.activeHoursEnd)
    )
    if (!window) continue
    anyWindow = true

    if (recentlyAlerted.has(user.id)) continue // already alerted recently

    let appliances: string[] = []
    try {
      appliances = JSON.parse(profile.appliances) as string[]
    } catch {
      /* invalid JSON — leave empty */
    }
    const options = appliances.length
      ? flexibleAppliances(appliances, appliancePriority)
      : ['Washing machine']

    const win = formatWindowRange(window.startMs, window.endMs)

    const body = await generatePushMessage(
      {
        name: user.name ?? null,
        appliances: options,
        windowStart: win.start,
        windowEnd: win.end,
        carbonIntensity: window.intensity,
        avg24h,
        urgency: windowUrgency(window.startMs),
        notifStyle: profile.notifStyle
      },
      config.openaiApiKey,
      config.openaiBaseUrl || undefined,
      config.openaiLlmModel || undefined
    )

    const { messageId } = await sendNotification(event, {
      subject: `Clean energy window ${win.start} – ${win.end}`,
      body,
      type: 'smart-alert',
      sentById: SYSTEM_SENDER_ID,
      targetUserIds: [user.id],
      smartAlertRunId: runId
    })

    // Mark this as a smart alert + remember the suggested appliance so /app/alerts can
    // offer to schedule it.
    await db.insert(schema.smartAlertContext).values({
      messageId,
      suggestedApplianceSlug: slugByName.get(options[0]!.toLowerCase()) ?? null,
      createdAt: now
    })
    sent++
  }

  // One run row per tick. Windows differ per consumer, so the window columns stay
  // null; windowFound marks whether any consumer had a qualifying window.
  await db.insert(schema.smartAlertRuns).values({
    id: runId,
    ranAt: now,
    windowFound: anyWindow,
    recipientCount: sent
  })

  if (!anyWindow) return { windowFound: false, sent: 0 }
  return {
    windowFound: true,
    sent,
    reason: sent === 0 ? 'debounced' : undefined
  }
}
