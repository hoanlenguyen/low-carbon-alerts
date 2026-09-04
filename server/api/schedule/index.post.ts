import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Replace today's Appliance Schedule with the given set of runs. An appliance may appear
// several times (each run = its own entry). Each run is priced against the per-hour
// forecast carbon over the hours it covers (estimateSavingHourly) vs the day's grid
// average, and snapshotted. Scheduling is only for the current Helsinki day.
const runSchema = z.object({
  applianceSlug: z.string().min(1),
  startAtMs: z.number().int().positive(),
  runTimeMin: z.number().int().positive().max(1440).optional()
})
const bodySchema = z.object({
  // Cap keeps the single insert under D1's ~100 bound-param limit (10 cols/row).
  appliances: z.array(runSchema).max(10)
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { appliances } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const userId = session.user.id
  const day = helsinkiDay()
  const now = new Date()

  const catalog = await getApplianceCatalog(event)
  const bySlug = new Map(catalog.map(a => [a.slug, a]))
  const { points } = await getEmissionsForecast()
  const avg24h = forecastAvg24h(points)

  const rows = appliances.map((pick) => {
    const appliance = bySlug.get(pick.applianceSlug)
    if (!appliance) throw createError({ statusCode: 400, statusMessage: `Unknown appliance: ${pick.applianceSlug}` })

    const runMin = pick.runTimeMin ?? appliance.typicalDurationMin ?? 90
    const slices = runHourSlices(pick.startAtMs, runMin, points)
    if (!slices.length) {
      throw createError({ statusCode: 400, statusMessage: 'Chosen start time is outside the forecast window' })
    }
    const { savingG, carbonAvg } = estimateSavingHourly(appliance.typicalPowerKw, avg24h, slices)

    return {
      id: crypto.randomUUID(),
      userId,
      day,
      applianceSlug: pick.applianceSlug,
      startAtMs: pick.startAtMs,
      runTimeMin: runMin,
      carbonAtStart: carbonAvg,
      avg24h,
      estimatedSavingG: savingG,
      createdAt: now,
      updatedAt: now
    }
  })

  // Replace the whole day: drop existing runs, insert the new set atomically.
  const del = db.delete(schema.applianceShifts).where(
    and(eq(schema.applianceShifts.userId, userId), eq(schema.applianceShifts.day, day))
  )
  if (rows.length) {
    await db.batch([del, db.insert(schema.applianceShifts).values(rows)])
  } else {
    await del // empty set = clear the day
  }

  const totalSavingG = rows.reduce((s, r) => s + r.estimatedSavingG, 0)
  return {
    day,
    totalSavingG,
    entries: rows.map(r => ({
      id: r.id,
      applianceSlug: r.applianceSlug,
      startAtMs: r.startAtMs,
      runTimeMin: r.runTimeMin,
      carbonAtStart: r.carbonAtStart,
      estimatedSavingG: r.estimatedSavingG
    }))
  }
})
