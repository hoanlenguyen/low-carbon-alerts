import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { hashToken } from '../../utils/secureToken'

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// Public: redeem a reset token and set a new password. Single-use — this and any other
// outstanding tokens for the user are invalidated. No auto-login; returns the role so the
// page can send the user to the right login screen.
export default defineEventHandler(async (event) => {
  const { token, password } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const now = new Date()

  const row = await db.query.passwordResetTokens.findFirst({
    where: eq(schema.passwordResetTokens.tokenHash, await hashToken(token))
  })
  if (!row || row.usedAt) throw createError({ statusCode: 400, statusMessage: 'This reset link is no longer valid' })
  if (row.expiresAt.getTime() < now.getTime()) throw createError({ statusCode: 410, statusMessage: 'This reset link has expired' })

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, row.userId),
    columns: { id: true, role: true }
  })
  if (!user) throw createError({ statusCode: 400, statusMessage: 'This reset link is no longer valid' })

  await db.update(schema.users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(schema.users.id, user.id))

  // Invalidate this token and every other unused token for the user.
  await db.update(schema.passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(schema.passwordResetTokens.userId, user.id), isNull(schema.passwordResetTokens.usedAt)))

  return { role: user.role }
})
