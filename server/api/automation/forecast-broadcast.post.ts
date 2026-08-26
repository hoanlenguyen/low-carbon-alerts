import { and, eq, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { buildForecastSummary } from '../../utils/buildForecastSummary'
import { generateForecastMessage } from '../../utils/generateForecastMessage'
import { sendNotification } from '../../utils/sendNotification'

const SYSTEM_SENDER_ID = 'system'
const DEBOUNCE_HOURS = 48

// Machine-callable (e.g. n8n) endpoint: generates the weekly electricity-forecast
// message from live grid data and broadcasts it to all consumers as an in-app
// notification. Secured by a bearer secret. Idempotent within DEBOUNCE_HOURS so a
// retry can't double-send. Email delivery is a later addition.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const secret = config.automationSecret
  if (!secret || getHeader(event, 'authorization') !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = useDrizzle(event)

  // Idempotency: skip if a forecast broadcast already went out recently.
  const since = new Date(Date.now() - DEBOUNCE_HOURS * 3_600_000)
  const recent = await db.query.messages.findFirst({
    where: and(eq(schema.messages.type, 'forecast'), gte(schema.messages.createdAt, since)),
    orderBy: desc(schema.messages.createdAt)
  })
  if (recent) {
    return { ok: true, skipped: true, reason: `already sent within ${DEBOUNCE_HOURS}h` }
  }

  const summary = await buildForecastSummary()
  const { subject, body } = await generateForecastMessage(
    summary,
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiLlmModel || undefined
  )

  const res = await sendNotification(event, { subject, body, type: 'forecast', sentById: SYSTEM_SENDER_ID })

  return { ok: true, subject, recipients: res.recipients }
})
