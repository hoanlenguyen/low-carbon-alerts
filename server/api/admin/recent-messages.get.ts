import { eq, ne, gt, count, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

type RecentEntry = {
  id: string
  subject: string
  type: 'broadcast' | 'targeted' | 'smart-alert' | 'forecast'
  sentAt: Date | null
  createdAt: Date | null
  recipients: number
}

// Recent sent messages for the admin dashboard. Non-smart-alert messages map 1:1
// to a send (one row, N recipients). Smart alerts are fanned out per consumer, so
// each runSmartAlert tick produces many message rows — we collapse those into a
// single entry per smart_alert_runs row (recipients = run.recipientCount, sent = ranAt).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403 })
  }

  const db = useDrizzle(event)

  const others = await db.query.messages.findMany({
    where: ne(schema.messages.type, 'smart-alert'),
    columns: { id: true, subject: true, type: true, sentAt: true, createdAt: true },
    orderBy: [desc(schema.messages.createdAt)],
    limit: 5
  })
  const otherEntries: RecentEntry[] = await Promise.all(
    others.map(async (msg) => {
      const [rec] = await db
        .select({ count: count() })
        .from(schema.userMessages)
        .where(eq(schema.userMessages.messageId, msg.id))
      return { ...msg, recipients: rec?.count ?? 0 }
    })
  )

  // One grouped entry per smart-alert run that actually reached someone.
  const runs = await db.query.smartAlertRuns.findMany({
    where: gt(schema.smartAlertRuns.recipientCount, 0),
    orderBy: [desc(schema.smartAlertRuns.ranAt)],
    limit: 5
  })
  const runEntries: RecentEntry[] = runs.map(run => ({
    id: run.id,
    subject: 'Smart low-carbon alert',
    type: 'smart-alert',
    sentAt: run.ranAt,
    createdAt: run.ranAt,
    recipients: run.recipientCount
  }))

  const at = (e: RecentEntry) => (e.createdAt ?? e.sentAt)?.getTime() ?? 0
  return [...otherEntries, ...runEntries]
    .sort((a, b) => at(b) - at(a))
    .slice(0, 5)
})
