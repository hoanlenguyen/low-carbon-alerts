import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

// List end-users. Pass ?active=1 to get only active consumers (used by the send /
// target-selection dropdowns); the consumer-management view fetches all.
export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)
  const query = getQuery(event)
  const activeOnly = query.active === '1' || query.active === 'true'

  const where = activeOnly
    ? and(eq(schema.users.role, 'user'), eq(schema.users.status, 'active'))
    : eq(schema.users.role, 'user')

  const users = await db.query.users.findMany({
    where,
    columns: {
      id: true,
      userName: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      isGenerated: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: (users, { desc }) => [desc(users.createdAt)]
  })
  return users
})
