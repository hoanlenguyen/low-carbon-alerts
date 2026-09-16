import { z } from 'zod'
import { and, eq, ne, gte, lt, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { generateToken, hashToken } from '../../utils/secureToken'
import { buildPasswordResetEmail } from '../../emails/passwordReset'
import { sendEmail } from '../../utils/sendEmail'

const bodySchema = z.object({ email: z.string().email('Invalid email') })

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const EMAIL_WINDOW_MS = 15 * 60 * 1000
const EMAIL_LIMIT = 3 // max requests per email per 15 min
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_LIMIT = 10 // max requests per IP per hour
const PRUNE_MS = 24 * 60 * 60 * 1000

// Public: request a password reset. Always returns a generic { ok: true } so it never
// reveals whether an email is registered. Rate-limited per email and per IP. For each
// matching user (email is non-unique) a single-use token is minted and emailed. Google-only
// accounts are included — setting a password just adds password login alongside Google.
export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, bodySchema.parse)
  const normalizedEmail = email.trim().toLowerCase()
  const ip = getHeader(event, 'cf-connecting-ip') || getRequestIP(event, { xForwardedFor: true }) || 'unknown'

  const db = useDrizzle(event)
  const now = new Date()

  // Opportunistic prune of old throttle rows (keeps the table small).
  await db.delete(schema.passwordResetRequests)
    .where(lt(schema.passwordResetRequests.createdAt, new Date(now.getTime() - PRUNE_MS)))

  // Count prior attempts in the windows BEFORE logging this one.
  const [emailAgg] = await db.select({ c: sql<number>`count(*)` })
    .from(schema.passwordResetRequests)
    .where(and(
      eq(schema.passwordResetRequests.email, normalizedEmail),
      gte(schema.passwordResetRequests.createdAt, new Date(now.getTime() - EMAIL_WINDOW_MS))
    ))
  const [ipAgg] = await db.select({ c: sql<number>`count(*)` })
    .from(schema.passwordResetRequests)
    .where(and(
      eq(schema.passwordResetRequests.ip, ip),
      gte(schema.passwordResetRequests.createdAt, new Date(now.getTime() - IP_WINDOW_MS))
    ))

  // Log this attempt regardless of outcome.
  await db.insert(schema.passwordResetRequests).values({
    id: crypto.randomUUID(), email: normalizedEmail, ip, createdAt: now
  })

  const throttled = (emailAgg?.c ?? 0) >= EMAIL_LIMIT || (ipAgg?.c ?? 0) >= IP_LIMIT

  if (!throttled) {
    const users = await db.query.users.findMany({
      where: and(eq(schema.users.email, normalizedEmail), ne(schema.users.email, '')),
      columns: { id: true, name: true, email: true }
    })
    const siteUrl = (useRuntimeConfig(event).public.siteUrl || 'https://hiilivahti.fi').replace(/\/$/, '')
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS)

    for (const u of users) {
      const rawToken = generateToken()
      const tokenHash = await hashToken(rawToken)
      await db.insert(schema.passwordResetTokens).values({
        id: crypto.randomUUID(), userId: u.id, tokenHash, expiresAt, usedAt: null, createdAt: now
      })
      const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`
      try {
        const { subject, html, text } = buildPasswordResetEmail({ resetUrl, name: u.name, expiresAt })
        await sendEmail({ to: u.email, subject, html, text })
      } catch {
        // Non-fatal: keep the response generic even if email delivery fails.
      }
    }
  }

  return { ok: true }
})
