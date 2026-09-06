import { eq, asc } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDrizzle, schema } from '../database'

// The active-appliance list changes rarely (admin edits only), so we cache it in
// memory to avoid a D1 read on every onboarding load. NOTE: Workers run across
// many isolates, so this cache is isolate-local and best-effort — the TTL bounds
// staleness, and admin writes invalidate only the serving isolate (others expire
// via the TTL). That's fine for a small, rarely-changing catalog.
export type ActiveAppliance = {
  slug: string
  name: string
  icon: string
  category: 'wet' | 'heating' | 'ev' | 'cooking' | 'leisure' | 'other'
  description: string | null
}

export type ApplianceMeta = {
  slug: string
  name: string
  icon: string
  typicalPowerKw: number | null
  typicalDurationMin: number | null
}

const TTL_MS = 5 * 60_000
let cache: { data: ActiveAppliance[], expires: number } | null = null
let priorityCache: { data: string[], expires: number } | null = null
let catalogCache: { data: ApplianceMeta[], expires: number } | null = null

const FLEX_RANK: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 }

export async function getActiveAppliances(event: H3Event): Promise<ActiveAppliance[]> {
  if (cache && cache.expires > Date.now()) return cache.data

  const db = useDrizzle(event)
  const data = await db.query.appliances.findMany({
    where: eq(schema.appliances.isActive, true),
    orderBy: [asc(schema.appliances.sortOrder), asc(schema.appliances.name)],
    columns: { slug: true, name: true, icon: true, category: true, description: true }
  })

  cache = { data, expires: Date.now() + TTL_MS }
  return data
}

// Catalog-driven shiftability shortlist for the smart alert: flexible (non-low)
// appliance names ordered high→medium, then by sortOrder. This makes the admin
// `appliances` table the single source of truth for appliance ranking (replacing
// the hardcoded FLEXIBLE_PRIORITY, which now only backstops an empty catalog).
// Includes inactive rows so a consumer who still owns a since-deactivated appliance
// is ranked correctly. Cached (isolate-local, TTL) like getActiveAppliances.
export async function getFlexibleAppliancePriority(event: H3Event): Promise<string[]> {
  if (priorityCache && priorityCache.expires > Date.now()) return priorityCache.data

  const db = useDrizzle(event)
  const rows = await db.query.appliances.findMany({
    columns: { name: true, flexibility: true, sortOrder: true }
  })
  const data = rows
    .filter(r => r.flexibility !== 'low')
    .sort((a, b) => (FLEX_RANK[a.flexibility] - FLEX_RANK[b.flexibility]) || (a.sortOrder - b.sortOrder))
    .map(r => r.name)

  priorityCache = { data, expires: Date.now() + TTL_MS }
  return data
}

// Full catalog (all rows) with power/duration, for estimating shift impact and for
// mapping profile appliance names ↔ slugs. Cached (isolate-local, TTL).
export async function getApplianceCatalog(event: H3Event): Promise<ApplianceMeta[]> {
  if (catalogCache && catalogCache.expires > Date.now()) return catalogCache.data

  const db = useDrizzle(event)
  const data = await db.query.appliances.findMany({
    columns: { slug: true, name: true, icon: true, typicalPowerKw: true, typicalDurationMin: true }
  })

  catalogCache = { data, expires: Date.now() + TTL_MS }
  return data
}

// Called after any admin create/update/delete so this isolate serves fresh data.
export function invalidateAppliancesCache() {
  cache = null
  priorityCache = null
  catalogCache = null
}
