import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'

// Admin: revoke a pending invite (its token stops working immediately).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing invite id' })

  const db = useDrizzle(event)
  const invite = await db.query.adminInvites.findFirst({ where: eq(schema.adminInvites.id, id) })
  if (!invite) throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (invite.status === 'accepted') throw createError({ statusCode: 409, statusMessage: 'Invite already accepted' })

  await db.update(schema.adminInvites).set({ status: 'revoked' }).where(eq(schema.adminInvites.id, id))
  return { ok: true }
})
