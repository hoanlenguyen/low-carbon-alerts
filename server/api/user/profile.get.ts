import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = useDrizzle(event)
  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, session.user.id)
  })

  if (!profile) return null

  return {
    ...profile,
    appliances: JSON.parse(profile.appliances) as string[],
    peakTimes: JSON.parse(profile.peakTimes) as string[],
    notifTimes: JSON.parse(profile.notifTimes) as string[]
  }
})
