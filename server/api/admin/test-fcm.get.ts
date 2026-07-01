import { getFcmAccessToken } from '../../utils/getFcmAccessToken'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403 })
  }

  const config = useRuntimeConfig()

  if (!config.fcmServiceAccount || !config.fcmProjectId) {
    return { error: 'Missing fcmServiceAccount or fcmProjectId env vars' }
  }

  let accessToken: string
  try {
    accessToken = await getFcmAccessToken(config.fcmServiceAccount)
  } catch (e) {
    return { error: 'Failed to get access token', detail: String(e) }
  }

  if (!accessToken) {
    return { error: 'Access token is empty — JWT auth failed (check service account JSON)' }
  }

  // Send a test message to the first token in D1
  const { useDrizzle } = await import('../../database')
  const db = useDrizzle(event)
  const tokenRow = await db.query.fcmTokens.findFirst()

  if (!tokenRow) {
    return { accessTokenOk: true, error: 'No FCM tokens in DB to test with' }
  }

  const url = `https://fcm.googleapis.com/v1/projects/${config.fcmProjectId}/messages:send`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      message: {
        token: tokenRow.token,
        notification: { title: 'Test notification', body: 'FCM test from debug endpoint' },
        data: { messageId: 'test' }
      }
    })
  })

  const body = await res.json()
  return {
    accessTokenOk: true,
    fcmStatus: res.status,
    fcmResponse: body
  }
})
