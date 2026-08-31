import { desc, count } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// CSV export of every sent message (view-only log), newest first. Plain dump of the
// message rows plus a recipient count — no filtering, no per-recipient lookup. Admin-only.
const TZ = 'Europe/Helsinki'
const sentFmt = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short', timeStyle: 'short', timeZone: TZ
})

// Quote every field and double internal quotes — safe for commas, quotes, and newlines.
function csv(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDrizzle(event)

  const rows = await db.query.messages.findMany({
    columns: { id: true, subject: true, body: true, type: true, sentAt: true, createdAt: true },
    orderBy: [desc(schema.messages.sentAt), desc(schema.messages.createdAt)]
  })

  // Recipient count per message in one grouped scan (no IN() list → no D1 limit).
  const countById = new Map<string, number>()
  const counts = await db
    .select({ messageId: schema.userMessages.messageId, c: count() })
    .from(schema.userMessages)
    .groupBy(schema.userMessages.messageId)
  for (const row of counts) countById.set(row.messageId, row.c)

  const header = ['Sent', 'Type', 'Subject', 'Content', 'Recipients']
  const lines = [header.map(csv).join(',')]
  for (const r of rows) {
    lines.push([
      r.sentAt ? sentFmt.format(new Date(r.sentAt)) : '',
      r.type,
      r.subject,
      r.body,
      countById.get(r.id) ?? 0
    ].map(csv).join(','))
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  // Prepend a BOM so Excel reads the UTF-8 content (°, emoji) correctly.
  const body = '﻿' + lines.join('\r\n')

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="sent-messages-${today}.csv"`)
  return body
})
