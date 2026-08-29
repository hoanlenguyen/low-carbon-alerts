import { asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Full appliance catalog (incl. inactive) for the admin management view. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  return db.query.appliances.findMany({
    orderBy: [asc(schema.appliances.sortOrder), asc(schema.appliances.name)]
  })
})
