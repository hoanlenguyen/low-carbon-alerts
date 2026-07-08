import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const users = await db.query.users.findMany({
    columns: { id: true, name: true, email: true, role: true, avatarUrl: true },
    where: eq(schema.users.role, 'admin')
  })

  return users
})
