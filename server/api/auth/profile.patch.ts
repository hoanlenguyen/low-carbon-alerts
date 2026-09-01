import { z } from 'zod'
import { and, eq, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal(''))
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const data = await readValidatedBody(event, bodySchema.parse)
  const email = data.email ? data.email.toLowerCase() : '' // optional (blank allowed)
  const db = useDrizzle(event)

  // Only enforce uniqueness when an email is actually provided — blank/empty is skipped.
  if (email) {
    const clash = await db.query.users.findFirst({
      where: and(eq(schema.users.email, email), ne(schema.users.id, session.user.id)),
      columns: { id: true }
    })
    if (clash) {
      throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
    }
  }

  await db.update(schema.users)
    .set({ name: data.name, email })
    .where(eq(schema.users.id, session.user.id))

  await replaceUserSession(event, {
    user: { ...session.user, name: data.name, email },
    loggedInAt: session.loggedInAt
  })

  return { ok: true }
})
