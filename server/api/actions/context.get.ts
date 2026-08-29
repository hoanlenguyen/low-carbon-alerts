import { and, eq, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Per-message "I shifted it" state for the current user's recent smart alerts, plus
// the appliance choices for the confirm picker. Powers the buttons on /app/alerts.
const CONFIRM_WINDOW_MS = 72 * 3_600_000
const LOOKBACK_MS = 30 * 24 * 3_600_000

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDrizzle(event)
  const userId = session.user.id
  const now = Date.now()

  // Smart-alert messages (with context) delivered to this user in the lookback window.
  const rows = await db
    .select({
      messageId: schema.smartAlertContext.messageId,
      windowStart: schema.smartAlertContext.windowStart,
      windowEnd: schema.smartAlertContext.windowEnd,
      suggestedApplianceSlug: schema.smartAlertContext.suggestedApplianceSlug,
      windowMinutes: schema.smartAlertContext.windowMinutes,
      carbonIntensity: schema.smartAlertContext.carbonIntensity,
      avg24h: schema.smartAlertContext.avg24h,
      createdAt: schema.smartAlertContext.createdAt
    })
    .from(schema.smartAlertContext)
    .innerJoin(schema.userMessages, eq(schema.userMessages.messageId, schema.smartAlertContext.messageId))
    .where(and(
      eq(schema.userMessages.userId, userId),
      gte(schema.smartAlertContext.createdAt, new Date(now - LOOKBACK_MS))
    ))
    .orderBy(desc(schema.smartAlertContext.createdAt))
    .limit(50)

  const acts = await db.query.messageActions.findMany({
    where: eq(schema.messageActions.userId, userId)
  })
  const actByMsg = new Map(acts.map(a => [a.messageId, a]))

  const actions = rows.map((r) => {
    const a = actByMsg.get(r.messageId)
    return {
      messageId: r.messageId,
      windowStart: r.windowStart,
      windowEnd: r.windowEnd,
      suggestedApplianceSlug: r.suggestedApplianceSlug,
      windowMinutes: r.windowMinutes,
      carbonIntensity: r.carbonIntensity,
      avg24h: r.avg24h,
      actionable: now - r.createdAt.getTime() <= CONFIRM_WINDOW_MS,
      actioned: !!a,
      applianceSlug: a?.applianceSlug ?? null,
      estimatedSavingG: a?.estimatedSavingG ?? null
    }
  })

  // Picker choices (with power/duration so the client can preview the estimate): the
  // user's profile appliances mapped to the catalog; fall back to the active catalog.
  const catalog = await getApplianceCatalog(event)
  const byName = new Map(catalog.map(a => [a.name.toLowerCase(), a]))
  const bySlug = new Map(catalog.map(a => [a.slug, a]))
  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, userId),
    columns: { appliances: true }
  })
  let names: string[] = []
  try { names = profile ? (JSON.parse(profile.appliances) as string[]) : [] } catch { names = [] }

  let choiceSlugs = names
    .map(n => byName.get(n.toLowerCase())?.slug)
    .filter((s): s is string => !!s)

  if (!choiceSlugs.length) {
    const active = await getActiveAppliances(event)
    choiceSlugs = active.map(a => a.slug)
  }

  const applianceChoices = choiceSlugs.map((slug) => {
    const a = bySlug.get(slug)
    return { slug, name: a?.name ?? slug, powerKw: a?.typicalPowerKw ?? null, durationMin: a?.typicalDurationMin ?? null }
  })

  return { applianceChoices, actions }
})
