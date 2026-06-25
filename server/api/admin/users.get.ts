import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)
  const users = await db.query.users.findMany({
    where: eq(schema.users.role, 'user'),
    columns: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: (users, { desc }) => [desc(users.createdAt)]
  })
  return users
})
