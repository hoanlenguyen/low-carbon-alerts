import { desc, inArray, count, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

// CSV export of every sent message (view-only log), newest first. One row per message
// with its recipient count and — when a single recipient — their name + email. Admin-only.
//
// NOTE (future change): this is message-level — broadcasts leave name/email blank and
// rely on the Recipients count. If a recipient-level export is wanted later, switch to
// one row per recipient (join messages × user_messages × users, no single-recipient
// filter) so every recipient's name + email is listed. Larger output for broadcasts.
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

  const ids = rows.map(r => r.id)
  const countById = new Map<string, number>()
  const recipientById = new Map<string, { name: string | null, email: string }>()

  if (ids.length) {
    const counts = await db
      .select({ messageId: schema.userMessages.messageId, c: count() })
      .from(schema.userMessages)
      .where(inArray(schema.userMessages.messageId, ids))
      .groupBy(schema.userMessages.messageId)
    for (const row of counts) countById.set(row.messageId, row.c)

    const singleIds = ids.filter(id => (countById.get(id) ?? 0) === 1)
    if (singleIds.length) {
      const recs = await db
        .select({ messageId: schema.userMessages.messageId, name: schema.users.name, email: schema.users.email })
        .from(schema.userMessages)
        .innerJoin(schema.users, eq(schema.users.id, schema.userMessages.userId))
        .where(inArray(schema.userMessages.messageId, singleIds))
      for (const r of recs) recipientById.set(r.messageId, { name: r.name, email: r.email })
    }
  }

  const header = ['Sent', 'Type', 'Subject', 'Content', 'Recipients', 'Recipient name', 'Recipient email']
  const lines = [header.map(csv).join(',')]
  for (const r of rows) {
    const rec = recipientById.get(r.id)
    lines.push([
      r.sentAt ? sentFmt.format(new Date(r.sentAt)) : '',
      r.type,
      r.subject,
      r.body,
      countById.get(r.id) ?? 0,
      rec?.name ?? '',
      rec?.email ?? ''
    ].map(csv).join(','))
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  // Prepend a BOM so Excel reads the UTF-8 content (°, emoji) correctly.
  const body = '﻿' + lines.join('\r\n')

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="sent-messages-${today}.csv"`)
  return body
})
