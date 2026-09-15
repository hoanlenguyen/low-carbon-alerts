import { z } from 'zod'
import { runWeeklyDigest } from '../../utils/runWeeklyDigest'

// Admin: send the weekly digest now to the selected users (bypasses opt-in) for testing.
const bodySchema = z.object({ userIds: z.array(z.string().min(1)).min(1).max(50) })

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const { userIds } = await readValidatedBody(event, bodySchema.parse)
  const result = await runWeeklyDigest(event, { userIds, ignoreOptIn: true })
  return { ok: true, ...result }
})
