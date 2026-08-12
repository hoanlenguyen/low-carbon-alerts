import { desc, gte } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Smart-alert trigger history: the last run that reached users, plus the recent
// run log (when it ran, whether a window was found, how many users). Admin-only.
// (Recipient emails come from the messages/user_messages join — see history.get.ts.)
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)

  const lastSent = await db.query.smartAlertRuns.findFirst({
    where: gte(schema.smartAlertRuns.recipientCount, 1),
    orderBy: desc(schema.smartAlertRuns.ranAt)
  })

  const runs = await db.query.smartAlertRuns.findMany({
    orderBy: desc(schema.smartAlertRuns.ranAt),
    limit: 20
  })

  return { lastSent: lastSent ?? null, runs }
})
