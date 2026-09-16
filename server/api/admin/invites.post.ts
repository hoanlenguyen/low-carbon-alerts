import { z } from 'zod'
import { and, eq, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { generateInviteToken, hashInviteToken } from '../../utils/inviteToken'
import { inviteAcceptUrl, sendInviteEmail } from '../../utils/adminInvites'

const bodySchema = z.object({ email: z.string().email('Invalid email') })
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// Admin creates an email invite to a NEW admin account. Token-based: only the hash is
// stored; the raw token goes out in the accept link. Blocks if the email already
// belongs to a user, and supersedes any prior pending invite for the same email.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { email } = await readValidatedBody(event, bodySchema.parse)
  const normalizedEmail = email.trim().toLowerCase()

  const db = useDrizzle(event)
  const existingUser = await db.query.users.findFirst({
    where: and(eq(schema.users.email, normalizedEmail), ne(schema.users.email, '')),
    columns: { id: true }
  })
  if (existingUser) throw createError({ statusCode: 409, statusMessage: 'A user with that email already exists' })

  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRY_MS)
  const rawToken = generateInviteToken()
  const tokenHash = await hashInviteToken(rawToken)

  // Supersede any prior pending invite for this email.
  await db.update(schema.adminInvites)
    .set({ status: 'revoked' })
    .where(and(eq(schema.adminInvites.email, normalizedEmail), eq(schema.adminInvites.status, 'pending')))

  const id = crypto.randomUUID()
  await db.insert(schema.adminInvites).values({
    id, email: normalizedEmail, tokenHash, invitedById: session.user.id,
    status: 'pending', expiresAt, acceptedAt: null, createdAt: now
  })

  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    userEmail: session.user.email || session.user.userName,
    action: 'admin_invite.create',
    before: null,
    after: JSON.stringify({ inviteId: id, email: normalizedEmail }),
    createdAt: now
  })

  const acceptUrl = inviteAcceptUrl(event, rawToken)
  const emailed = await sendInviteEmail({
    to: normalizedEmail, acceptUrl, inviterName: session.user.name ?? null, expiresAt
  })

  return { id, email: normalizedEmail, expiresAt: expiresAt.getTime(), acceptUrl, emailed }
})
