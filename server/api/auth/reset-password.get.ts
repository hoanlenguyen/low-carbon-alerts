import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { hashToken } from '../../utils/secureToken'

// Public: validate a reset token for the reset page (before showing the form).
export default defineEventHandler(async (event) => {
  const token = getQuery(event).token
  if (typeof token !== 'string' || !token) throw createError({ statusCode: 400, statusMessage: 'Missing token' })

  const db = useDrizzle(event)
  const row = await db.query.passwordResetTokens.findFirst({
    where: eq(schema.passwordResetTokens.tokenHash, await hashToken(token))
  })
  if (!row || row.usedAt) throw createError({ statusCode: 400, statusMessage: 'This reset link is no longer valid' })
  if (row.expiresAt.getTime() < Date.now()) throw createError({ statusCode: 410, statusMessage: 'This reset link has expired' })

  return { ok: true }
})
