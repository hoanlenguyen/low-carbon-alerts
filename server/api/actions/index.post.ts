import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// Self-reported "I shifted it" for a smart-alert the user received. Requires the
// message to have been delivered to them, to carry structured context, and to be
// recent (≤72h). Estimated saving is computed from the chosen appliance + context
// and snapshotted. One action per (user, message); re-confirm updates it.
const CONFIRM_WINDOW_MS = 72 * 3_600_000
const bodySchema = z.object({
  messageId: z.string().min(1),
  applianceSlug: z.string().min(1),
  runTimeMin: z.number().int().positive().max(1440).optional() // user override; defaults to catalog
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { messageId, applianceSlug, runTimeMin } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)
  const userId = session.user.id

  // The message must have been delivered to this user.
  const delivered = await db.query.userMessages.findFirst({
    where: and(eq(schema.userMessages.userId, userId), eq(schema.userMessages.messageId, messageId)),
    columns: { id: true }
  })
  if (!delivered) throw createError({ statusCode: 404, statusMessage: 'Message not found' })

  // Needs structured context (only smart-alert sends have it) and must be recent.
  const context = await db.query.smartAlertContext.findFirst({
    where: eq(schema.smartAlertContext.messageId, messageId)
  })
  if (!context) throw createError({ statusCode: 400, statusMessage: 'This alert cannot be confirmed' })
  if (Date.now() - context.createdAt.getTime() > CONFIRM_WINDOW_MS) {
    throw createError({ statusCode: 400, statusMessage: 'This alert is too old to confirm' })
  }

  // The chosen appliance must exist in the catalog (drives the estimate).
  const catalog = await getApplianceCatalog(event)
  const appliance = catalog.find(a => a.slug === applianceSlug)
  if (!appliance) throw createError({ statusCode: 400, statusMessage: 'Unknown appliance' })

  // Run time: the user's override if given, else the appliance's catalog default;
  // the estimate then caps it at the clean-window length.
  const durationMin = runTimeMin ?? appliance.typicalDurationMin
  const estimatedSavingG = estimateSavingG(
    appliance.typicalPowerKw,
    durationMin,
    context.avg24h,
    context.carbonIntensity,
    context.windowMinutes
  )
  const now = new Date()

  await db.insert(schema.messageActions)
    .values({ id: crypto.randomUUID(), userId, messageId, applianceSlug, estimatedSavingG, confirmedAt: now })
    .onConflictDoUpdate({
      target: [schema.messageActions.userId, schema.messageActions.messageId],
      set: { applianceSlug, estimatedSavingG, confirmedAt: now }
    })

  return { messageId, applianceSlug, estimatedSavingG }
})
