import { z } from 'zod'
import { eq, or } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  identity: z.string().min(1), // username or email
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { identity, password } = await readValidatedBody(event, bodySchema.parse)
  const key = identity.trim().toLowerCase()

  const db = useDrizzle(event)
  const user = await db.query.users.findFirst({
    where: or(eq(schema.users.userName, key), eq(schema.users.email, key))
  })

  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const now = new Date()
  await db.update(schema.users).set({ lastLoginAt: now }).where(eq(schema.users.id, user.id))

  await setUserSession(event, {
    user: {
      id: user.id,
      userName: user.userName,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      onboardingCompletedAt: user.onboardingCompletedAt?.getTime() ?? null
    },
    loggedInAt: Date.now()
  })

  return { ok: true, role: user.role }
})
