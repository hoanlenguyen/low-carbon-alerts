import { and, gte, lte } from 'drizzle-orm'
import {
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfDay, startOfWeek, startOfMonth, format
} from 'date-fns'
import { useDrizzle, schema } from '../../../database'

type Period = 'daily' | 'weekly' | 'monthly'

const TZ = 'Europe/Helsinki'

const bucketsOf: Record<Period, (interval: { start: Date, end: Date }) => Date[]> = {
  daily: eachDayOfInterval,
  weekly: eachWeekOfInterval,
  monthly: eachMonthOfInterval
}
const bucketStart: Record<Period, (d: Date) => Date> = {
  daily: startOfDay,
  weekly: startOfWeek,
  monthly: startOfMonth
}
const labelFmt: Record<Period, string> = {
  daily: 'd MMM',
  weekly: 'd MMM',
  monthly: 'MMM yyyy'
}

const hkiParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
})

function toHelsinkiWall(instant: Date): Date {
  const p = Object.fromEntries(hkiParts.formatToParts(instant).map(x => [x.type, x.value]))
  const hour = p.hour === '24' ? 0 : Number(p.hour)
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second))
}

// CO2-saved time series for the dashboard chart: sum of estimated grams avoided from
// appliance shifts, bucketed by the selected period over the range, in Helsinki time.
// Mirrors messages-sent so HomeCarbonChart renders the same shape. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const start = new Date(String(query.start))
  const end = new Date(String(query.end))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid range' })
  }
  const period: Period = (['daily', 'weekly', 'monthly'] as const).includes(query.period as Period)
    ? (query.period as Period)
    : 'daily'

  const db = useDrizzle(event)
  const rows = await db.query.applianceShifts.findMany({
    where: and(
      gte(schema.applianceShifts.createdAt, start),
      lte(schema.applianceShifts.createdAt, end)
    ),
    columns: { createdAt: true, estimatedSavingG: true }
  })

  const sums = new Map<number, number>()
  let total = 0
  for (const r of rows) {
    if (!r.createdAt) continue
    const g = r.estimatedSavingG ?? 0
    total += g
    const key = bucketStart[period](toHelsinkiWall(r.createdAt)).getTime()
    sums.set(key, (sums.get(key) ?? 0) + g)
  }

  const data = bucketsOf[period]({ start: toHelsinkiWall(start), end: toHelsinkiWall(end) }).map((wall) => {
    const b = bucketStart[period](wall)
    return { label: format(b, labelFmt[period]), count: sums.get(b.getTime()) ?? 0 }
  })

  return { total, data }
})
