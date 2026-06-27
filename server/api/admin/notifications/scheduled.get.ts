import { useDrizzle } from '../../../database'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const db = useDrizzle(event)
  return db.query.scheduledJobs.findMany({
    orderBy: (j, { desc }) => [desc(j.createdAt)]
  })
})
