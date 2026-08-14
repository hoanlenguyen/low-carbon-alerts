import { desc, gte, count } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

const PAGE_SIZE = 10

// Smart-alert trigger history: the last run that reached users, plus a paginated
// run log (when it ran, whether a window was found, how many users). Admin-only.
// (Recipient emails come from the messages/user_messages join — see history.get.ts.)
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || PAGE_SIZE))
  const offset = (page - 1) * limit

  const db = useDrizzle(event)

  const [lastSent, runs, [totals]] = await Promise.all([
    db.query.smartAlertRuns.findFirst({
      where: gte(schema.smartAlertRuns.recipientCount, 1),
      orderBy: desc(schema.smartAlertRuns.ranAt)
    }),
    db.query.smartAlertRuns.findMany({
      orderBy: desc(schema.smartAlertRuns.ranAt),
      limit,
      offset
    }),
    db.select({ total: count() }).from(schema.smartAlertRuns)
  ])

  const total = totals?.total ?? 0

  return {
    lastSent: lastSent ?? null,
    runs,
    total,
    page,
    pageSize: limit,
    pageCount: Math.ceil(total / limit)
  }
})
