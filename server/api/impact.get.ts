import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'

// The current user's self-reported shift impact: this week / this month / all-time
// counts + estimated grams of CO2 avoided, plus a weekly streak. All boundaries are
// computed in Helsinki local time.
const TZ = 'Europe/Helsinki'
const ymdFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
})

function helsinkiYmd(d: Date): { y: number, m: number, day: number, key: string } {
  const s = ymdFmt.format(d) // "YYYY-MM-DD"
  const [y, m, day] = s.split('-').map(Number)
  return { y: y!, m: m!, day: day!, key: s }
}

// Monday (ISO week start) of the Helsinki week containing d, as a "YYYY-MM-DD" key.
// Anchored at UTC noon so the 1h DST shift never moves the calendar date.
function mondayKey(d: Date): string {
  const { y, m, day } = helsinkiYmd(d)
  const noon = new Date(Date.UTC(y, m - 1, day, 12))
  const dow = noon.getUTCDay() // 0 Sun … 6 Sat
  noon.setUTCDate(noon.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return noon.toISOString().slice(0, 10)
}

function prevMondayKey(key: string): string {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const acts = await db.query.messageActions.findMany({
    where: eq(schema.messageActions.userId, session.user.id),
    orderBy: [desc(schema.messageActions.confirmedAt)]
  })

  const now = new Date()
  const today = helsinkiYmd(now)
  const thisMonday = mondayKey(now)

  const bucket = () => ({ count: 0, grams: 0 })
  const week = bucket()
  const month = bucket()
  const allTime = bucket()
  const activeWeeks = new Set<string>()

  for (const a of acts) {
    const g = a.estimatedSavingG
    allTime.count++; allTime.grams += g

    const p = helsinkiYmd(a.confirmedAt)
    if (p.y === today.y && p.m === today.m) { month.count++; month.grams += g }

    const wk = mondayKey(a.confirmedAt)
    if (wk === thisMonday) { week.count++; week.grams += g }
    activeWeeks.add(wk)
  }

  // Streak: consecutive active weeks back from this week (with a one-week grace so it
  // doesn't reset the instant a new week starts before the user acts).
  let cursor = activeWeeks.has(thisMonday) ? thisMonday : prevMondayKey(thisMonday)
  let streakWeeks = 0
  while (activeWeeks.has(cursor)) {
    streakWeeks++
    cursor = prevMondayKey(cursor)
  }

  return {
    week,
    month,
    allTime,
    streakWeeks,
    lastActionAt: acts[0]?.confirmedAt ?? null
  }
})
