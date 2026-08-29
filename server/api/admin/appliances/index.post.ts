import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Admin creates a catalog appliance. Slug is derived from the name and must be unique.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const input = await readValidatedBody(event, applianceInputSchema.parse)
  const slug = slugify(input.name)
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Name must contain letters or numbers' })
  }

  const db = useDrizzle(event)
  const clash = await db.query.appliances.findFirst({
    where: eq(schema.appliances.slug, slug),
    columns: { id: true }
  })
  if (clash) {
    throw createError({ statusCode: 409, statusMessage: 'An appliance with this name already exists' })
  }

  const row = {
    id: crypto.randomUUID(),
    slug,
    name: input.name,
    icon: input.icon,
    category: input.category,
    flexibility: input.flexibility,
    typicalPowerKw: input.typicalPowerKw ?? null,
    typicalDurationMin: input.typicalDurationMin ?? null,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    createdAt: new Date()
  }
  await db.insert(schema.appliances).values(row)
  invalidateAppliancesCache()

  return row
})
