import { z } from 'zod'
import { and, eq, gte, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import { buildFeedbackEmail } from '../emails/feedback'
import { sendEmail } from '../utils/sendEmail'

const bodySchema = z.object({
  category: z.enum(['bug', 'idea', 'question', 'other']),
  message: z.string().min(5, 'Message is too short').max(2000, 'Message is too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  pageUrl: z.string().max(500).optional().or(z.literal(''))
})

const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT = 5 // max feedback submissions per user per hour

// Authenticated: send user feedback to support. Emails support@hiilivahti.fi (config
// reply-to address) via Resend, with reply_to set to the user's email. Each submission is
// recorded in audit_logs, which also drives the per-user hourly rate limit.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { category, message, email, pageUrl } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const now = new Date()

  // Rate limit: count this user's recent feedback submissions in audit_logs.
  const [agg] = await db.select({ c: sql<number>`count(*)` })
    .from(schema.auditLogs)
    .where(and(
      eq(schema.auditLogs.userId, session.user.id),
      eq(schema.auditLogs.action, 'feedback.submit'),
      gte(schema.auditLogs.createdAt, new Date(now.getTime() - RATE_WINDOW_MS))
    ))
  if ((agg?.c ?? 0) >= RATE_LIMIT) {
    throw createError({ statusCode: 429, statusMessage: 'Too many feedback messages — please try again later.' })
  }

  const config = useRuntimeConfig(event)
  const supportAddress = config.emailReplyTo || 'support@hiilivahti.fi'
  const accountEmail = session.user.email || null
  const replyEmail = (email || accountEmail || '').trim() || null

  const { subject, html, text } = buildFeedbackEmail({
    category,
    message,
    senderName: session.user.name ?? null,
    userName: session.user.userName,
    role: session.user.role,
    accountEmail,
    replyEmail,
    pageUrl: pageUrl || null,
    at: now
  })

  await sendEmail({
    to: supportAddress,
    subject,
    html,
    text,
    ...(replyEmail ? { replyTo: replyEmail } : {})
  })

  // Record the submission (also drives the rate limit above).
  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    userEmail: session.user.email || session.user.userName,
    action: 'feedback.submit',
    before: null,
    after: JSON.stringify({ category, pageUrl: pageUrl || null }),
    createdAt: now
  })

  return { ok: true }
})
