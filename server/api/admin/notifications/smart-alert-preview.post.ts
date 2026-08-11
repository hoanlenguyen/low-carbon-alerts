import { z } from 'zod'
import type { ForecastData } from '../../forecast/[series].get'
import { findLowCarbonWindow, windowUrgency } from '../../../utils/lowCarbonWindow'
import { generatePushMessage } from '../../../utils/generatePushMessage'

// Builds a Prompt 7 smart-alert message from the live forecast so an admin can
// review it and send to specific users via the normal Send flow. Admin-only.
const bodySchema = z.object({ appliance: z.string().min(1).optional() })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const raw = await readBody(event).catch(() => ({}))
  const { appliance: applianceOverride } = bodySchema.parse(raw && typeof raw === 'object' ? raw : {})
  const config = useRuntimeConfig()

  const carbon = await $fetch<ForecastData>('/api/forecast/consumption_emissions', {
    baseURL: getRequestURL(event).origin
  })

  const win = findLowCarbonWindow(carbon)
  if (!win) {
    throw createError({ statusCode: 422, statusMessage: 'No low-carbon window in the next 24h to alert on' })
  }

  const appliance = applianceOverride ?? 'Washing machine'
  const urgency = windowUrgency(win.startMs)

  const body = await generatePushMessage(
    { name: null, appliance, windowStart: win.start, windowEnd: win.end, carbonIntensity: win.intensity, urgency },
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
