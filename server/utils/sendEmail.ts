import { getGmailAccessToken } from './getGmailAccessToken'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// base64 the UTF-8 body, wrapped at 76 chars per RFC 2045.
function b64Body(str: string): string {
  const raw = btoa(String.fromCharCode(...new TextEncoder().encode(str)))
  return raw.replace(/(.{76})/g, '$1\r\n')
}

// RFC 2047 encode a header value only if it has non-ASCII chars (e.g. emoji).
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value
  return `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(value)))}?=`
}

function htmlToText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildMime(from: string, to: string[], subject: string, html: string, text: string, replyTo?: string): string {
  const boundary = `bnd_${crypto.randomUUID()}`
  const headers = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean).join('\r\n')

  const body = [
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64Body(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64Body(html),
    `--${boundary}--`,
    ''
  ].join('\r\n')

  return `${headers}\r\n${body}`
}

// Send a transactional email via the Gmail API (works on Cloudflare Pages — it's
// plain HTTPS, unlike SMTP). All app email funnels through here, so switching
// provider/domain later is a one-file change.
export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string }> {
  const config = useRuntimeConfig()
  const { clientId, clientSecret } = (config.oauth?.google ?? {}) as { clientId?: string, clientSecret?: string }
  const refreshToken = config.gmailRefreshToken

  if (!clientId || !clientSecret || !refreshToken) {
    throw createError({ statusCode: 500, statusMessage: 'Email sending is not configured (missing Google client or Gmail refresh token)' })
  }

  const token = await getGmailAccessToken(clientId, clientSecret, refreshToken)

  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  const from = config.emailFromName ? `${config.emailFromName} <${config.emailFrom}>` : config.emailFrom
  const text = opts.text ?? htmlToText(opts.html)
  const mime = buildMime(from, to, opts.subject, opts.html, text, opts.replyTo)
  const raw = toBase64Url(new TextEncoder().encode(mime))

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Gmail send failed: ${await res.text()}` })
  }

  return await res.json() as { id: string }
}
