import { and, eq, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Admin updates a catalog appliance (any subset of fields, incl. the isActive toggle).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing appliance id' })

  const input = await readValidatedBody(event, applianceInputSchema.partial().parse)
  const db = useDrizzle(event)

  const existing = await db.query.appliances.findFirst({ where: eq(schema.appliances.id, id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Appliance not found' })

  const set: Partial<typeof schema.appliances.$inferInsert> = { updatedAt: new Date() }
  if (input.icon !== undefined) set.icon = input.icon
  if (input.category !== undefined) set.category = input.category
  if (input.flexibility !== undefined) set.flexibility = input.flexibility
  if (input.typicalPowerKw !== undefined) set.typicalPowerKw = input.typicalPowerKw
  if (input.typicalDurationMin !== undefined) set.typicalDurationMin = input.typicalDurationMin
  if (input.description !== undefined) set.description = input.description
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder
  if (input.isActive !== undefined) set.isActive = input.isActive

  // Renaming re-derives the slug and must stay unique across other rows.
  if (input.name !== undefined && input.name !== existing.name) {
    const slug = slugify(input.name)
    if (!slug) throw createError({ statusCode: 400, statusMessage: 'Name must contain letters or numbers' })
    const clash = await db.query.appliances.findFirst({
      where: and(eq(schema.appliances.slug, slug), ne(schema.appliances.id, id)),
      columns: { id: true }
    })
    if (clash) throw createError({ statusCode: 409, statusMessage: 'An appliance with this name already exists' })
    set.name = input.name
    set.slug = slug
  }

  await db.update(schema.appliances).set(set).where(eq(schema.appliances.id, id))
  invalidateAppliancesCache()
  return db.query.appliances.findFirst({ where: eq(schema.appliances.id, id) })
})
