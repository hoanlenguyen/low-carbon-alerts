// Shared shift-impact math: turn a user's appliance_shifts rows into weekly / monthly /
// all-time CO2 buckets + a weekly streak. Used by /api/impact and the weekly digest so
// both compute identically. All week/month boundaries are Helsinki-local.
const TZ = 'Europe/Helsinki'
const ymdFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
})

export interface ShiftRow { estimatedSavingG: number, day: string, createdAt: Date }
export interface ImpactBucket { count: number, grams: number }
export interface ImpactResult {
  week: ImpactBucket
  month: ImpactBucket
  allTime: ImpactBucket
  streakWeeks: number
  lastActionAt: Date | null
}

function helsinkiYmd(d: Date): { y: number, m: number } {
  const [y, m] = ymdFmt.format(d).split('-').map(Number)
  return { y: y!, m: m! }
}

// Monday (ISO week start) of the Helsinki week containing d, as a "YYYY-MM-DD" key.
// Anchored at UTC noon so the 1h DST shift never moves the calendar date.
function mondayKey(d: Date): string {
  const [y, m, day] = ymdFmt.format(d).split('-').map(Number)
  const noon = new Date(Date.UTC(y!, m! - 1, day!, 12))
  const dow = noon.getUTCDay() // 0 Sun … 6 Sat
  noon.setUTCDate(noon.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return noon.toISOString().slice(0, 10)
}

function prevMondayKey(key: string): string {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

// A shift `day` string ('YYYY-MM-DD') anchored at UTC noon for stable bucketing.
const dayToDate = (day: string) => new Date(`${day}T12:00:00Z`)

export function computeImpact(rows: ShiftRow[], now: Date = new Date()): ImpactResult {
  const today = helsinkiYmd(now)
  const thisMonday = mondayKey(now)

  const bucket = (): ImpactBucket => ({ count: 0, grams: 0 })
  const week = bucket()
  const month = bucket()
  const allTime = bucket()
  const activeWeeks = new Set<string>()
  let lastActionAt: Date | null = null

  for (const r of rows) {
    const g = r.estimatedSavingG
    allTime.count++; allTime.grams += g
    if (r.createdAt && (!lastActionAt || r.createdAt > lastActionAt)) lastActionAt = r.createdAt

    const d = dayToDate(r.day)
    const p = helsinkiYmd(d)
    if (p.y === today.y && p.m === today.m) { month.count++; month.grams += g }

    const wk = mondayKey(d)
    if (wk === thisMonday) { week.count++; week.grams += g }
    activeWeeks.add(wk)
  }

  // Streak: consecutive active weeks back from this week (one-week grace so it doesn't
  // reset the instant a new week starts before the user acts).
  let cursor = activeWeeks.has(thisMonday) ? thisMonday : prevMondayKey(thisMonday)
  let streakWeeks = 0
  while (activeWeeks.has(cursor)) {
    streakWeeks++
    cursor = prevMondayKey(cursor)
  }

  return { week, month, allTime, streakWeeks, lastActionAt }
}

export function fmtGrams(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`
}
