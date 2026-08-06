import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const settings = await db.query.smartAlertSettings.findFirst({
    where: eq(schema.smartAlertSettings.id, 1)
  })

  if (!settings) {
    throw createError({ statusCode: 404, statusMessage: 'Settings not initialised' })
  }

  return settings
})
