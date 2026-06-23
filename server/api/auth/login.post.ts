import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const db = useDrizzle(event)
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase())
  })

  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

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

  return { ok: true, role: user.role }
})
