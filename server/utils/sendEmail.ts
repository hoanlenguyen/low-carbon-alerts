export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  headers?: Record<string, string>
}

function htmlToText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Send a transactional email via the Resend HTTP API (works on Cloudflare Pages — it's
// plain HTTPS, unlike SMTP). All app email funnels through here, so switching provider
// is a one-file change. From/reply-to come from runtimeConfig (branded hiilivahti.fi).
export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string }> {
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Email sending is not configured (missing NUXT_RESEND_API_KEY)' })
  }

  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  const from = config.emailFromName ? `${config.emailFromName} <${config.emailFrom}>` : config.emailFrom
  const text = opts.text ?? htmlToText(opts.html)
  const replyTo = opts.replyTo ?? config.emailReplyTo

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: opts.subject,
      html: opts.html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(opts.headers ? { headers: opts.headers } : {})
    })
  })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Resend send failed: ${await res.text()}` })
  }

  return await res.json() as { id: string }
}
