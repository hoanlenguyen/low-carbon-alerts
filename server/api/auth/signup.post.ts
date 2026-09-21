import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  userName: z.string().min(3, 'Username must be at least 3 characters').max(60),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8),
  name: z.string().min(1).optional()
})

export default defineEventHandler(async (event) => {
  const { userName, email, password, name } = await readValidatedBody(event, bodySchema.parse)
  const normalizedUserName = userName.trim().toLowerCase()

  const db = useDrizzle(event)
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.userName, normalizedUserName),
    columns: { id: true }
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That username is taken' })
  }

  const passwordHash = await hashPassword(password)
  const user = {
    id: crypto.randomUUID(),
    userName: normalizedUserName,
    email: email ? email.toLowerCase() : '',
    name: name ?? null,
    passwordHash,
    role: 'user' as const,
    googleId: null,
    avatarUrl: null,
    createdAt: new Date(),
    lastLoginAt: new Date() // registering logs the user in → count it as their first login
  }

  await db.insert(schema.users).values(user)

  await setUserSession(event, {
    user: {
      id: user.id,
      userName: user.userName,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      onboardingCompletedAt: null
    },
    loggedInAt: Date.now()
  })

  return { ok: true }
})
