import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Admin deletes a catalog appliance. Existing user_profiles.appliances keep the name
// as free text, so removing a catalog row only stops it appearing in onboarding.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing appliance id' })

  const db = useDrizzle(event)
  const existing = await db.query.appliances.findFirst({
    where: eq(schema.appliances.id, id),
    columns: { id: true }
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Appliance not found' })

  await db.delete(schema.appliances).where(eq(schema.appliances.id, id))
  invalidateAppliancesCache()
  return { id }
})
