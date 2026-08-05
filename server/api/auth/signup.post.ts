import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional()
})

export default defineEventHandler(async (event) => {
  const { email, password, name } = await readValidatedBody(event, bodySchema.parse)
  const normalizedEmail = email.toLowerCase()

  const db = useDrizzle(event)
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, normalizedEmail)
  })

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
  }

  const passwordHash = await hashPassword(password)
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: name ?? null,
    passwordHash,
    role: 'user' as const,
    googleId: null,
    avatarUrl: null,
    createdAt: new Date()
  }

  await db.insert(schema.users).values(user)

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl
    },
    loggedInAt: Date.now()
  })

  return { ok: true }
})
