import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// Admin updates a consumer's status (active / inactive). Inactive consumers are
// excluded from broadcasts, targeted sends, and smart alerts. Admin-only; only
// end-user (role 'user') accounts can be toggled.
const bodySchema = z.object({ status: z.enum(['active', 'inactive']) })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const { status } = await readValidatedBody(event, bodySchema.parse)
  const db = useDrizzle(event)

  const existing = await db.query.users.findFirst({
    where: and(eq(schema.users.id, id), eq(schema.users.role, 'user')),
    columns: { id: true }
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Consumer not found' })

  await db.update(schema.users).set({ status }).where(eq(schema.users.id, id))
  return { id, status }
})
