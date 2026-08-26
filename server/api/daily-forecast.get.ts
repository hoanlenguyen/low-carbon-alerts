import { getDailyForecast } from '../utils/getDailyForecast'

// The shared daily electricity-forecast for the end-user dashboard card.
// Cached once per Helsinki day (see getDailyForecast). Any signed-in user.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return await getDailyForecast(event)
})
