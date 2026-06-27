import { useDrizzle } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const db = useDrizzle(event)
  return db.query.messageTemplates.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)]
  })
})
