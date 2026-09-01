import { z } from 'zod'
import { eq } from 'drizzle-orm'
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
  const email = data.email ? data.email.toLowerCase() : '' // optional; no longer unique
  const db = useDrizzle(event)

  await db.update(schema.users)
    .set({ name: data.name, email })
    .where(eq(schema.users.id, session.user.id))

  await replaceUserSession(event, {
    user: { ...session.user, name: data.name, email },
    loggedInAt: session.loggedInAt
  })

  return { ok: true }
})
