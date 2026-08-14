// Mints a short-lived Gmail API access token from a stored OAuth2 refresh token
// (refresh_token grant). Cached in-memory per isolate until near expiry, like
// getFcmAccessToken. Reuses the Google OAuth client id/secret used for login.

let cachedToken: string | null = null
let tokenExpiresAt = 0

export async function getGmailAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now < tokenExpiresAt - 60) return cachedToken

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Gmail token error: ${await res.text()}` })
  }

  const data = await res.json() as { access_token: string, expires_in: number }
  cachedToken = data.access_token
  tokenExpiresAt = now + (data.expires_in ?? 3600)
  return cachedToken
}
