import { z } from 'zod'
import { eq, ne, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const data = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)

  if (data.email !== session.user.email) {
    const existing = await db.query.users.findFirst({
      where: and(
        eq(schema.users.email, data.email),
        ne(schema.users.id, session.user.id)
      )
    })
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
    }
  }

  await db.update(schema.users)
    .set({ name: data.name, email: data.email })
    .where(eq(schema.users.id, session.user.id))

  await replaceUserSession(event, {
    user: { ...session.user, name: data.name, email: data.email },
    loggedInAt: session.loggedInAt
  })

  return { ok: true }
})
