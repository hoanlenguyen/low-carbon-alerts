import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  token: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional()
})

export default defineEventHandler(async (event) => {
  const { token, email, password, name } = await readValidatedBody(event, bodySchema.parse)

  const setupToken = useRuntimeConfig().setupToken
  if (!setupToken || token !== setupToken) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)
  const normalizedEmail = email.toLowerCase()
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, normalizedEmail)
  })

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
  }

  const passwordHash = await hashPassword(password)
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: name ?? null,
    passwordHash,
    role: 'admin',
    googleId: null,
    avatarUrl: null,
    createdAt: new Date()
  })

  return { ok: true }
})
