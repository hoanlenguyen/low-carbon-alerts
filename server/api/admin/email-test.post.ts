import { z } from 'zod'
import { sendEmail } from '../../utils/sendEmail'

const bodySchema = z.object({ to: z.string().email() })

// Quick verification that Gmail sending works end-to-end. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { to } = await readValidatedBody(event, bodySchema.parse)

  const result = await sendEmail({
    to,
    subject: 'Low Carbon Alerts — test email ✅',
    html: '<div style="font-family:system-ui,sans-serif;font-size:15px;color:#111">'
      + '<h2>It works! 🎉</h2>'
      + '<p>This is a test email from <strong>Low Carbon Alerts</strong>, sent via the Gmail API.</p>'
      + '</div>',
    text: 'It works! This is a test email from Low Carbon Alerts, sent via the Gmail API.'
  })

  return { ok: true, id: result.id }
})
