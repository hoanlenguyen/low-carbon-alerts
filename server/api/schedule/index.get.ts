import { and, eq, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// The user's Appliance Schedule for a day (default: today, Helsinki) plus everything the
// picker and the per-message gateway need:
//  - entries: the day's shifted runs (an appliance may appear several times)
//  - totalSavingG: sum of the day's estimated savings
//  - applianceChoices: what the picker offers (profile appliances → catalog)
//  - messages: today's smart-alert messages delivered to this user (for the message
//    gateway) with their suggested appliance
const RECENT_MS = 72 * 3_600_000

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const userId = session.user.id
  const q = getQuery(event)
  const day = typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : helsinkiDay()
  const today = helsinkiDay()

  const rows = await db.query.applianceShifts.findMany({
    where: and(eq(schema.applianceShifts.userId, userId), eq(schema.applianceShifts.day, day)),
    orderBy: [schema.applianceShifts.startAtMs]
  })

  const entries = rows.map(r => ({
    id: r.id,
    applianceSlug: r.applianceSlug,
    startAtMs: r.startAtMs,
    runTimeMin: r.runTimeMin,
    carbonAtStart: r.carbonAtStart,
    estimatedSavingG: r.estimatedSavingG
  }))
  const totalSavingG = rows.reduce((s, r) => s + r.estimatedSavingG, 0)

  const applianceChoices = await getUserApplianceChoices(event, userId)

  // Today's smart-alert messages for this user (for the "I shifted it" / tag gateway).
  const now = Date.now()
  const ctx = await db
    .select({
      messageId: schema.smartAlertContext.messageId,
      suggestedApplianceSlug: schema.smartAlertContext.suggestedApplianceSlug,
      createdAt: schema.smartAlertContext.createdAt
    })
    .from(schema.smartAlertContext)
    .innerJoin(schema.userMessages, eq(schema.userMessages.messageId, schema.smartAlertContext.messageId))
    .where(and(
      eq(schema.userMessages.userId, userId),
      gte(schema.smartAlertContext.createdAt, new Date(now - RECENT_MS))
    ))
    .orderBy(desc(schema.smartAlertContext.createdAt))
    .limit(50)

  const messages = ctx
    .filter(c => helsinkiDay(c.createdAt.getTime()) === today) // gateway shows only on today's alerts
    .map(c => ({ messageId: c.messageId, suggestedApplianceSlug: c.suggestedApplianceSlug }))

  return { day, isToday: day === today, entries, totalSavingG, applianceChoices, messages }
})
