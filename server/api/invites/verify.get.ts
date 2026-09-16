import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { hashInviteToken } from '../../utils/inviteToken'

// Public: validate an invite token for the accept page. Returns the fixed email.
export default defineEventHandler(async (event) => {
  const token = getQuery(event).token
  if (typeof token !== 'string' || !token) throw createError({ statusCode: 400, statusMessage: 'Missing token' })

  const db = useDrizzle(event)
  const invite = await db.query.adminInvites.findFirst({
    where: eq(schema.adminInvites.tokenHash, await hashInviteToken(token))
  })
  if (!invite || invite.status !== 'pending') throw createError({ statusCode: 400, statusMessage: 'This invitation is no longer valid' })
  if (invite.expiresAt.getTime() < Date.now()) throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })

  return { email: invite.email }
})
