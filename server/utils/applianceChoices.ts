import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'

export interface ApplianceChoice {
  slug: string
  name: string
  icon: string
  powerKw: number | null
  durationMin: number | null
}

// The appliances offered in the schedule picker for a user: their profile appliances
// mapped to the catalog, falling back to the whole active catalog when the profile has
// none. Includes power/duration so the client can preview the estimate.
export async function getUserApplianceChoices(event: H3Event, userId: string): Promise<ApplianceChoice[]> {
  const db = useDrizzle(event)
  const catalog = await getApplianceCatalog(event)
  const byName = new Map(catalog.map(a => [a.name.toLowerCase(), a]))
  const bySlug = new Map(catalog.map(a => [a.slug, a]))

  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, userId),
    columns: { appliances: true, applianceRuntimes: true }
  })
  let names: string[] = []
  try { names = profile ? (JSON.parse(profile.appliances) as string[]) : [] } catch { names = [] }
  // The user's typical run time per appliance (name → minutes); overrides the catalog default.
  let runtimes: Record<string, number> = {}
  try { runtimes = profile ? (JSON.parse(profile.applianceRuntimes) as Record<string, number>) : {} } catch { runtimes = {} }

  let choiceSlugs = names
    .map(n => byName.get(n.toLowerCase())?.slug)
    .filter((s): s is string => !!s)

  if (!choiceSlugs.length) {
    const active = await getActiveAppliances(event)
    choiceSlugs = active.map(a => a.slug)
  }

  return choiceSlugs.map((slug) => {
    const a = bySlug.get(slug)
    const name = a?.name ?? slug
    return {
      slug,
      name,
      icon: a?.icon ?? 'i-lucide-plug',
      powerKw: a?.typicalPowerKw ?? null,
      // Prefer the user's own typical run time, falling back to the catalog default.
      durationMin: runtimes[name] ?? a?.typicalDurationMin ?? null
    }
  })
}

// Current Helsinki calendar day as 'YYYY-MM-DD' (the schedule bucket key).
export function helsinkiDay(ms: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Helsinki'
  }).format(new Date(ms))
}

// Grid 24h-average baseline: mean of the next-24h forecast points (the same series the
// picker prices hours against). Used as the "typical" carbon a shift is compared to.
export function forecastAvg24h(points: { time: number, value: number, isForecast: boolean }[]): number | null {
  const now = Date.now()
  const fc = points.filter(p => p.isForecast && p.time >= now - 3_600_000)
  if (!fc.length) return null
  return Math.round((fc.reduce((s, p) => s + p.value, 0) / fc.length) * 100) / 100
}
