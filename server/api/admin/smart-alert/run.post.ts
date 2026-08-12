import { runSmartAlert } from '../../../utils/runSmartAlert'

// Manually trigger the forecast-based smart alert (bypasses the scheduled job's
// next-run gate). Debounce/enabled still apply inside runSmartAlert. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return await runSmartAlert(event)
})
