import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  housingType: z.string().min(1),
  householdSize: z.number().int().min(1).max(10),
  contractType: z.string().min(1),
  primaryHeating: z.string().min(1),
  appliances: z.array(z.string()),
  activeHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  activeHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  peakTimes: z.array(z.string()),
  notifTimes: z.array(z.string()),
  energyGoal: z.string().min(1),
  notifStyle: z.enum(['detailed', 'simple']),
  followsPrices: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const now = new Date()

  await db.insert(schema.userProfiles)
    .values({
      userId: session.user.id,
      housingType: data.housingType,
      householdSize: data.householdSize,
      contractType: data.contractType,
      primaryHeating: data.primaryHeating,
      appliances: JSON.stringify(data.appliances),
      activeHoursStart: data.activeHoursStart,
      activeHoursEnd: data.activeHoursEnd,
      peakTimes: JSON.stringify(data.peakTimes),
      notifTimes: JSON.stringify(data.notifTimes),
      energyGoal: data.energyGoal,
      notifStyle: data.notifStyle,
      followsPrices: data.followsPrices,
      createdAt: now
    })
    .onConflictDoUpdate({
      target: schema.userProfiles.userId,
      set: {
        housingType: data.housingType,
        householdSize: data.householdSize,
        contractType: data.contractType,
        primaryHeating: data.primaryHeating,
        appliances: JSON.stringify(data.appliances),
        activeHoursStart: data.activeHoursStart,
        activeHoursEnd: data.activeHoursEnd,
        peakTimes: JSON.stringify(data.peakTimes),
        notifTimes: JSON.stringify(data.notifTimes),
        energyGoal: data.energyGoal,
        notifStyle: data.notifStyle,
        followsPrices: data.followsPrices
      }
    })

  await db.update(schema.users)
    .set({ onboardingCompletedAt: now })
    .where(eq(schema.users.id, session.user.id))

  await setUserSession(event, {
    ...session,
    user: {
      ...session.user,
      onboardingCompletedAt: now.getTime()
    }
  })

  return { ok: true }
})
