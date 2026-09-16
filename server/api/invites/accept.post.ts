import { z } from 'zod'
import { and, eq, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { hashInviteToken } from '../../utils/inviteToken'

const bodySchema = z.object({
  token: z.string().min(1),
  userName: z.string().min(3, 'Username must be at least 3 characters').max(60),
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// Public: accept an admin invite. Re-validates the token, email availability and username
// uniqueness (race-safe), then creates an ADMIN user. No auto-login — the page sends the
// new admin to /admin-login.
export default defineEventHandler(async (event) => {
  const { token, userName, name, password } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const now = new Date()

  const invite = await db.query.adminInvites.findFirst({
    where: eq(schema.adminInvites.tokenHash, await hashInviteToken(token))
  })
  if (!invite || invite.status !== 'pending') throw createError({ statusCode: 400, statusMessage: 'This invitation is no longer valid' })
  if (invite.expiresAt.getTime() < now.getTime()) throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })

  const emailTaken = await db.query.users.findFirst({
    where: and(eq(schema.users.email, invite.email), ne(schema.users.email, '')),
    columns: { id: true }
  })
  if (emailTaken) throw createError({ statusCode: 409, statusMessage: 'A user with that email already exists' })

  const normalizedUserName = userName.trim().toLowerCase()
  const userNameTaken = await db.query.users.findFirst({
    where: eq(schema.users.userName, normalizedUserName),
    columns: { id: true }
  })
  if (userNameTaken) throw createError({ statusCode: 409, statusMessage: 'That username is taken' })

  const user = {
    id: crypto.randomUUID(),
    userName: normalizedUserName,
    email: invite.email,
    name,
    passwordHash: await hashPassword(password),
    role: 'admin' as const,
    googleId: null,
    avatarUrl: null,
    createdAt: now
  }
  await db.insert(schema.users).values(user)

  await db.update(schema.adminInvites)
    .set({ status: 'accepted', acceptedAt: now })
    .where(eq(schema.adminInvites.id, invite.id))

  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    userId: user.id,
    userEmail: user.email,
    action: 'admin_invite.accept',
    before: null,
    after: JSON.stringify({ inviteId: invite.id, userName: user.userName }),
    createdAt: now
  })

  return { ok: true }
})
