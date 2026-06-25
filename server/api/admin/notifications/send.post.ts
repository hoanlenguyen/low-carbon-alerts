import { z } from 'zod'
import { sendNotification } from '../../../utils/sendNotification'

const bodySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(['broadcast', 'targeted']),
  targetUserIds: z.array(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const data = await readValidatedBody(event, bodySchema.parse)
  return sendNotification(event, { ...data, sentById: session.user.id })
})
