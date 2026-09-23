import { eq, desc, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../database'

// Admin: a consumer's appliance-shift runs (for the runs-detail modal), newest day first.
// Appliance name + icon are resolved from the catalog by slug.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const db = useDrizzle(event)
  const rows = await db.query.applianceShifts.findMany({
    where: eq(schema.applianceShifts.userId, id),
    orderBy: [desc(schema.applianceShifts.day), asc(schema.applianceShifts.startAtMs)],
    columns: {
      id: true,
      day: true,
      applianceSlug: true,
      startAtMs: true,
      runTimeMin: true,
      carbonAtStart: true,
      avg24h: true,
      estimatedSavingG: true
    }
  })

  // Resolve appliance display name + icon from the catalog (soft join by slug).
  const catalog = await db.query.appliances.findMany({ columns: { slug: true, name: true, icon: true } })
  const bySlug = new Map(catalog.map(a => [a.slug, a]))

  return rows.map(r => ({
    id: r.id,
    day: r.day,
    applianceSlug: r.applianceSlug,
    name: bySlug.get(r.applianceSlug)?.name ?? r.applianceSlug,
    icon: bySlug.get(r.applianceSlug)?.icon ?? 'i-lucide-plug',
    startAtMs: r.startAtMs,
    runTimeMin: r.runTimeMin,
    carbonAtStart: r.carbonAtStart,
    avg24h: r.avg24h,
    estimatedSavingG: r.estimatedSavingG
  }))
})
