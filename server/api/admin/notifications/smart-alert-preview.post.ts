import { z } from 'zod'
import type { CarbonData } from '../../carbon.get'
import { generatePushMessage } from '../../../utils/generatePushMessage'

// Builds a Prompt 7 smart-alert message from the live forecast so an admin can
// review it and send to specific users via the normal Send flow. Admin-only.
const bodySchema = z.object({ appliance: z.string().min(1).optional() })

const TZ = 'Europe/Helsinki'

function hhmm(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
  }).format(new Date(ms))
}

// First run of ≥2 consecutive forecast hours below a threshold (tiered from
// cleanest to merely-good), searching the next 24h.
function findLowWindow(carbon: CarbonData) {
  const now = Date.now()
  const fc = carbon.points
    .filter(p => p.isForecast && p.time >= now && p.time <= now + 24 * 3_600_000)
    .sort((a, b) => a.time - b.time)
  if (fc.length < 2) return null

  for (const threshold of [20, 30, 50]) {
    let start = -1
    for (let i = 0; i < fc.length; i++) {
      if (fc[i]!.value < threshold) {
        if (start < 0) start = i
      } else {
        if (start >= 0 && i - start >= 2) return build(fc, start, i - 1)
        start = -1
      }
    }
    if (start >= 0 && fc.length - start >= 2) return build(fc, start, fc.length - 1)
  }
  return null
}

function build(fc: CarbonData['points'], s: number, e: number) {
  let min = fc[s]!.value
  for (let i = s; i <= e; i++) min = Math.min(min, fc[i]!.value)
  return {
    startMs: fc[s]!.time,
    start: hhmm(fc[s]!.time),
    end: hhmm(fc[e]!.time),
    intensity: Math.round(min * 10) / 10
  }
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const raw = await readBody(event).catch(() => ({}))
  const { appliance: applianceOverride } = bodySchema.parse(raw && typeof raw === 'object' ? raw : {})
  const config = useRuntimeConfig()

  const carbon = await $fetch<CarbonData>('/api/carbon', {
    baseURL: getRequestURL(event).origin
  })

  const win = findLowWindow(carbon)
  if (!win) {
    throw createError({ statusCode: 422, statusMessage: 'No low-carbon window in the next 24h to alert on' })
  }

  const appliance = applianceOverride ?? 'Washing machine'
  const hoursAway = (win.startMs - Date.now()) / 3_600_000
  const urgency: 'low' | 'medium' | 'high' = hoursAway <= 3 ? 'high' : hoursAway <= 8 ? 'medium' : 'low'

  const body = await generatePushMessage(
    {
      name: null,
      appliance,
      windowStart: win.start,
      windowEnd: win.end,
      carbonIntensity: win.intensity,
      urgency
    },
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiLlmModel || undefined
  )

  return {
    subject: `Clean energy window ${win.start}–${win.end}`,
    body,
    meta: { appliance, windowStart: win.start, windowEnd: win.end, carbonIntensity: win.intensity, urgency }
  }
})
