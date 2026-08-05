import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { currentPassword, newPassword } = await readValidatedBody(event, bodySchema.parse)

  const db = useDrizzle(event)
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id)
  })

  if (!user?.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'This account uses Google sign-in and has no password.' })
  }

  const valid = await verifyPassword(user.passwordHash, currentPassword)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect.' })
  }

  const newHash = await hashPassword(newPassword)
  await db.update(schema.users)
    .set({ passwordHash: newHash })
    .where(eq(schema.users.id, user.id))

  return { ok: true }
})
