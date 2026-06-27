import { eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDrizzle, schema } from '../database'
import { sseClients } from './sseClients'
import { getFcmAccessToken } from './getFcmAccessToken'

interface SendOptions {
  subject: string
  body: string
  type: 'broadcast' | 'targeted'
  sentById: string
  targetUserIds?: string[]
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
    sentAt: now,
    createdAt: now
  })

  let recipientIds: string[]
  if (opts.type === 'broadcast') {
    const allUsers = await db.query.users.findMany({
      where: eq(schema.users.role, 'user'),
      columns: { id: true }
    })
    recipientIds = allUsers.map(u => u.id)
  } else {
    recipientIds = opts.targetUserIds ?? []
  }

  if (recipientIds.length === 0) return { messageId, recipients: 0 }

  await db.insert(schema.userMessages).values(
    recipientIds.map(userId => ({
      id: crypto.randomUUID(),
      userId,
      messageId,
      read: false,
      createdAt: now
    }))
  )

  // SSE push to connected recipients
  const payload = JSON.stringify({
    id: messageId,
    subject: opts.subject,
    body: opts.body,
    createdAt: now.toISOString(),
    read: false
  })
  for (const userId of recipientIds) {
    const clients = sseClients.get(userId)
    if (clients) {
      for (const send of clients) {
        try {
          send(payload)
        } catch { /* non-fatal */ }
      }
    }
  }

  // FCM HTTP v1 push
  const config = useRuntimeConfig()
  if (config.fcmServiceAccount && config.fcmProjectId) {
    const tokens = await db.query.fcmTokens.findMany({
      where: inArray(schema.fcmTokens.userId, recipientIds),
      columns: { token: true }
    })
    if (tokens.length > 0) {
      try {
        const accessToken = await getFcmAccessToken(config.fcmServiceAccount)
        const url = `https://fcm.googleapis.com/v1/projects/${config.fcmProjectId}/messages:send`
        await Promise.all(
          tokens.map(({ token }) =>
            fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: { title: opts.subject, body: opts.body },
                  data: { messageId }
                }
              })
            })
          )
        )
      } catch { /* non-fatal */ }
    }
  }

  return { messageId, recipients: recipientIds.length }
}
