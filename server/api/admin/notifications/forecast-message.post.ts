import { buildForecastSummary } from '../../../utils/buildForecastSummary'
import { generateForecastMessage } from '../../../utils/generateForecastMessage'

// Generate the weekly electricity-forecast message from live grid data so an admin
// can preview it (and drop it into Send). Admin-only. Does NOT broadcast.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const config = useRuntimeConfig()
  const summary = await buildForecastSummary()
  const { subject, body } = await generateForecastMessage(
    summary,
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiLlmModel || undefined
  )

  return { subject, body, meta: summary }
})
