import type { H3Event } from 'h3'
import { eq, and, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import type { ForecastData } from '../api/forecast/[series].get'
import { findWindowBelow, windowUrgency } from './lowCarbonWindow'
import { generatePushMessage } from './generatePushMessage'
import { pickFlexibleAppliance } from './buildColdStartRecommendation'
import { sendNotification } from './sendNotification'

const SYSTEM_SENDER_ID = 'system'
const MIN_WINDOW_HOURS = 3

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

// Does the low-carbon window overlap the user's active-hours interval? Both are
// times-of-day; the window's final hourly slot is included (+60 min), and active
// hours may wrap past midnight (e.g. 22:00–06:00).
function windowInActiveHours(windowStart: string, windowEnd: string, activeStart: string, activeEnd: string): boolean {
  const segs = (s: number, e: number): Array<[number, number]> => s <= e ? [[s, e]] : [[s, 1440], [0, e]]
  const win = segs(toMin(windowStart), Math.min(toMin(windowEnd) + 60, 1440))
  const active = segs(toMin(activeStart), toMin(activeEnd))
  for (const [w1, w2] of win) {
    for (const [a1, a2] of active) {
      if (w1 < a2 && a1 < w2) return true
    }
  }
  return false
}

export interface SmartAlertResult {
  windowFound: boolean
  sent: number
  reason?: string
}

// Forecast-based smart alert: find an upcoming low-carbon window and notify the
// end-users whose active hours overlap it. One run per cron tick; every run is
// recorded to smart_alert_runs (the trigger history).
export async function runSmartAlert(event: H3Event): Promise<SmartAlertResult> {
  const db = useDrizzle(event)
  const config = useRuntimeConfig()
  const now = new Date()

  const settings = await db.query.smartAlertSettings.findFirst({ where: eq(schema.smartAlertSettings.id, 1) })
  const enabled = settings?.enabled ?? true
  const threshold = settings?.threshold ?? 20
  const debounceHours = settings?.debounceHours ?? 3
  const horizonHours = settings?.horizonHours ?? 6

  if (!enabled) return { windowFound: false, sent: 0, reason: 'disabled' }

  const forecast = await $fetch<ForecastData>('/api/forecast/consumption_emissions', {
    baseURL: getRequestURL(event).origin
  })

  const window = findWindowBelow(forecast.points, threshold, horizonHours * 3_600_000, MIN_WINDOW_HOURS)

  // No qualifying window — record the run and stop.
  if (!window) {
    await db.insert(schema.smartAlertRuns).values({
      id: crypto.randomUUID(), ranAt: now, windowFound: false, recipientCount: 0
    })
    return { windowFound: false, sent: 0 }
  }

  // Debounce: skip sending if we already delivered to users within debounceHours.
  const debounceFrom = new Date(now.getTime() - debounceHours * 3_600_000)
  const recentSent = await db.query.smartAlertRuns.findFirst({
    where: and(gte(schema.smartAlertRuns.ranAt, debounceFrom), gte(schema.smartAlertRuns.recipientCount, 1)),
    orderBy: desc(schema.smartAlertRuns.ranAt)
  })
  if (recentSent) {
    await db.insert(schema.smartAlertRuns).values({
      id: crypto.randomUUID(), ranAt: now, windowFound: true,
      carbonIntensity: window.intensity, windowStart: window.start, windowEnd: window.end, recipientCount: 0
    })
    return { windowFound: true, sent: 0, reason: 'debounced' }
  }

  // Eligible users: active end-users whose active hours overlap the window.
  const users = await db.query.users.findMany({
    where: and(eq(schema.users.role, 'user'), eq(schema.users.status, 'active')),
    columns: { id: true, name: true }
  })
  const profiles = await db.query.userProfiles.findMany()
  const profileByUser = new Map(profiles.map(p => [p.userId, p]))

  const eligible = users
    .map(u => ({ user: u, profile: profileByUser.get(u.id) }))
    .filter(x => x.profile && windowInActiveHours(window.start, window.end, x.profile.activeHoursStart, x.profile.activeHoursEnd))

  const urgency = windowUrgency(window.startMs)
  const subject = `Clean energy window ${window.start}–${window.end}`

  // Each eligible user gets their OWN message, personalized to their name + a
  // flexible appliance from their profile (Prompt 7). Sent individually, typed
  // 'smart-alert' — recipients are recorded via messages → user_messages.
  let sent = 0
  for (const { user, profile } of eligible) {
    if (!profile) continue
    let appliances: string[] = []
    try { appliances = JSON.parse(profile.appliances) as string[] } catch { /* invalid JSON — leave empty */ }
    const appliance = appliances.length ? pickFlexibleAppliance(appliances) : 'Washing machine'

    const body = await generatePushMessage(
      { name: user.name ?? null, appliance, windowStart: window.start, windowEnd: window.end, carbonIntensity: window.intensity, urgency },
      config.openaiApiKey,
      config.openaiBaseUrl || undefined,
      config.openaiLlmModel || undefined
    )

    await sendNotification(event, {
      subject,
      body,
      type: 'smart-alert',
      sentById: SYSTEM_SENDER_ID,
      targetUserIds: [user.id]
    })
    sent++
  }

  await db.insert(schema.smartAlertRuns).values({
    id: crypto.randomUUID(), ranAt: now, windowFound: true,
    carbonIntensity: window.intensity, windowStart: window.start, windowEnd: window.end, recipientCount: sent
  })

  return { windowFound: true, sent }
}
