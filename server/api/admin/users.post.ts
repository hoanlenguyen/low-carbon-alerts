import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  userName: z.string().min(3, 'Username must be at least 3 characters').max(60),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// Admin creates an end-user (consumer) account. Username is the login key; email is optional.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { name, userName, email, password } = await readValidatedBody(event, bodySchema.parse)
  const normalizedUserName = userName.trim().toLowerCase()

  const db = useDrizzle(event)
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.userName, normalizedUserName),
    columns: { id: true }
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That username is taken' })
  }

  const user = {
    id: crypto.randomUUID(),
    userName: normalizedUserName,
    email: email ? email.toLowerCase() : '',
    name,
    passwordHash: await hashPassword(password),
    role: 'user' as const,
    googleId: null,
    avatarUrl: null,
    isGenerated: true, // admin-created consumer (single add) — flagged like bulk-generated
    createdAt: new Date()
  }
  await db.insert(schema.users).values(user)

  return { id: user.id, userName: user.userName, email: user.email, name: user.name }
})
