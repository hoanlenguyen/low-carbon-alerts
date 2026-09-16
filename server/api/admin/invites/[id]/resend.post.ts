import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'
import { generateInviteToken, hashInviteToken } from '../../../../utils/inviteToken'
import { inviteAcceptUrl, sendInviteEmail } from '../../../../utils/adminInvites'

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// Admin: re-issue a pending invite with a fresh token + extended expiry, and re-send it.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing invite id' })

  const db = useDrizzle(event)
  const invite = await db.query.adminInvites.findFirst({ where: eq(schema.adminInvites.id, id) })
  if (!invite) throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (invite.status === 'accepted') throw createError({ statusCode: 409, statusMessage: 'Invite already accepted' })

  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRY_MS)
  const rawToken = generateInviteToken()
  const tokenHash = await hashInviteToken(rawToken)

  await db.update(schema.adminInvites)
    .set({ tokenHash, expiresAt, status: 'pending' })
    .where(eq(schema.adminInvites.id, id))

  const acceptUrl = inviteAcceptUrl(event, rawToken)
  const emailed = await sendInviteEmail({
    to: invite.email, acceptUrl, inviterName: session.user.name ?? null, expiresAt
  })

  return { id, email: invite.email, expiresAt: expiresAt.getTime(), acceptUrl, emailed }
})
