import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// Admin creates an end-user (consumer) account with an email + password.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { name, email, password } = await readValidatedBody(event, bodySchema.parse)
  const normalizedEmail = email.toLowerCase()

  const db = useDrizzle(event)
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, normalizedEmail)
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name,
    passwordHash: await hashPassword(password),
    role: 'user' as const,
    googleId: null,
    avatarUrl: null,
    createdAt: new Date()
  }
  await db.insert(schema.users).values(user)

  return { id: user.id, email: user.email, name: user.name }
})
