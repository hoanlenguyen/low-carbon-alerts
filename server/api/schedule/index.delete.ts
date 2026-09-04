import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Clear today's Appliance Schedule (all of the current Helsinki day's runs).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const day = helsinkiDay()
  await db.delete(schema.applianceShifts).where(
    and(eq(schema.applianceShifts.userId, session.user.id), eq(schema.applianceShifts.day, day))
  )
  return { day }
})
