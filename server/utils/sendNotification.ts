import { eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDrizzle, schema } from '../database'
import { getFcmAccessToken } from './getFcmAccessToken'

interface SendOptions {
  subject: string
  body: string
  type: 'broadcast' | 'targeted' | 'smart-alert' | 'forecast'
  sentById: string
  targetUserIds?: string[]
  // Set by runSmartAlert so all per-consumer messages from one run share a run id.
  smartAlertRunId?: string
}

// D1/SQLite caps bound variables per statement (~999) — chunk large writes and
// IN() lookups. FCM_CONCURRENCY bounds simultaneous push subrequests so a big
// broadcast doesn't fire one enormous Promise.all.
const DB_CHUNK = 100
const FCM_CONCURRENCY = 20

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Push to one FCM token. Returns 'dead' when the token is permanently invalid
// (unregistered / not found) so the caller can prune it.
async function pushToToken(
  url: string,
  accessToken: string,
  token: string,
  subject: string,
  body: string,
  messageId: string
): Promise<'ok' | 'dead' | 'error'> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: { token, notification: { title: subject, body }, data: { messageId } }
      })
    })
    if (res.ok) return 'ok'
    let errStatus = ''
    try { errStatus = ((await res.json()) as { error?: { status?: string } })?.error?.status ?? '' } catch { /* non-JSON */ }
    if (res.status === 404 || errStatus === 'UNREGISTERED' || errStatus === 'NOT_FOUND') return 'dead'
    return 'error'
  } catch {
    return 'error'
  }
}

export async function sendNotification(event: H3Event, opts: SendOptions) {
  const db = useDrizzle(event)
  const now = new Date()

  const messageId = crypto.randomUUID()
  await db.insert(schema.messages).values({
    id: messageId,
    subject: opts.subject,
    body: opts.body,
    type: opts.type,
    sentById: opts.sentById,
    smartAlertRunsId: opts.smartAlertRunId ?? null,
    sentAt: now,
    createdAt: now
  })

  let recipientIds: string[]
  if (opts.type === 'broadcast' || opts.type === 'forecast') {
    const allUsers = await db.query.users.findMany({
      where: eq(schema.users.role, 'user'),
      columns: { id: true }
    })
    recipientIds = allUsers.map(u => u.id)
  } else {
    recipientIds = opts.targetUserIds ?? []
  }

  if (recipientIds.length === 0) return { messageId, recipients: 0 }

  // Fan out the inbox rows in DB-safe chunks.
  const inboxRows = recipientIds.map(userId => ({
    id: crypto.randomUUID(),
    userId,
    messageId,
    read: false,
    createdAt: now
  }))
  for (const group of chunk(inboxRows, DB_CHUNK)) {
    await db.insert(schema.userMessages).values(group)
  }

  // FCM HTTP v1 push for background notifications.
  const config = useRuntimeConfig()
  if (config.fcmServiceAccount && config.fcmProjectId) {
    try {
      // Look up tokens in chunks so the IN() list stays within the variable limit.
      const tokenRows: Array<{ id: string, token: string }> = []
      for (const group of chunk(recipientIds, DB_CHUNK)) {
        const part = await db.query.fcmTokens.findMany({
          where: inArray(schema.fcmTokens.userId, group),
          columns: { id: true, token: true }
        })
        tokenRows.push(...part)
      }

      if (tokenRows.length > 0) {
        const accessToken = await getFcmAccessToken(config.fcmServiceAccount as string | object)
        const url = `https://fcm.googleapis.com/v1/projects/${config.fcmProjectId}/messages:send`
        const deadIds: string[] = []

        // Send with bounded concurrency instead of one giant Promise.all.
        for (const group of chunk(tokenRows, FCM_CONCURRENCY)) {
          const results = await Promise.all(
            group.map(async r => ({ id: r.id, outcome: await pushToToken(url, accessToken, r.token, opts.subject, opts.body, messageId) }))
          )
          for (const { id, outcome } of results) if (outcome === 'dead') deadIds.push(id)
        }

        // Prune tokens FCM reported as permanently invalid, so the table stays lean.
        for (const group of chunk(deadIds, DB_CHUNK)) {
          await db.delete(schema.fcmTokens).where(inArray(schema.fcmTokens.id, group))
        }
      }
    } catch { /* non-fatal — push is best-effort */ }
  }

  // Push to SSE clients so foreground tabs update instantly.
  const { sseClients } = await import('./sseClients')
  const ssePayload = JSON.stringify({ id: messageId, subject: opts.subject, body: opts.body, createdAt: now.toISOString() })
  for (const userId of recipientIds) {
    sseClients.get(userId)?.forEach((send) => {
      try { send(ssePayload) } catch { /* client disconnected */ }
    })
  }

  return { messageId, recipients: recipientIds.length }
}
