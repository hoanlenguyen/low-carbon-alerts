import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Admin: pending admin invitations for the Members page.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const db = useDrizzle(event)
  const rows = await db.query.adminInvites.findMany({
    where: eq(schema.adminInvites.status, 'pending'),
    orderBy: [desc(schema.adminInvites.createdAt)]
  })
  const now = Date.now()
  return rows.map(r => ({
    id: r.id,
    email: r.email,
    createdAt: r.createdAt.getTime(),
    expiresAt: r.expiresAt.getTime(),
    expired: r.expiresAt.getTime() < now
  }))
})
