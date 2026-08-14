// ── ONE-TIME DEV HELPER — delete after you have the refresh token ──────────────
// Bootstraps the Gmail sender's OAuth refresh token. Visit /gmail-setup in dev,
// sign in as the sender account, approve the gmail.send scope, and copy the
// refresh token it prints into .env / .dev.vars as NUXT_GMAIL_REFRESH_TOKEN.
// Disabled outside dev. The redirect URI it uses is <origin>/gmail-setup — add
// that to the OAuth client's Authorized redirect URIs.
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const config = useRuntimeConfig()
  const { clientId, clientSecret } = (config.oauth?.google ?? {}) as { clientId?: string, clientSecret?: string }
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')

  if (!clientId || !clientSecret) {
    return '<pre>Missing NUXT_OAUTH_GOOGLE_CLIENT_ID / NUXT_OAUTH_GOOGLE_CLIENT_SECRET in .env</pre>'
  }

  const redirectUri = `${getRequestURL(event).origin}/gmail-setup`
  const { code } = getQuery(event)

  // Step 1 — no code yet: send the admin to Google's consent screen.
  if (!code) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.send')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('login_hint', config.emailFrom)
    return sendRedirect(event, authUrl.toString())
  }

  // Step 2 — exchange the code for tokens and show the refresh token.
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })

  const data = await res.json() as { refresh_token?: string, error?: string, error_description?: string }

  if (!data.refresh_token) {
    return `<pre>No refresh_token returned:\n\n${JSON.stringify(data, null, 2)}\n\n`
      + 'Fix: revoke prior access at https://myaccount.google.com/permissions, then retry '
      + '(consent must show access_type=offline + prompt=consent).</pre>'
  }

  return `<pre>✅ Success — add this to your .env and .dev.vars, then restart dev:\n\n`
    + `NUXT_GMAIL_REFRESH_TOKEN=${data.refresh_token}\n\n`
    + 'You can now delete server/routes/gmail-setup.get.ts.</pre>'
})
