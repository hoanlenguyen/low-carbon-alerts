export interface FeedbackCtx {
  category: string // 'bug' | 'idea' | 'question' | 'other'
  message: string
  senderName: string | null
  userName: string
  role: string
  accountEmail: string | null
  replyEmail: string | null // what the user typed (may differ from account email)
  pageUrl: string | null
  at: Date
}

const CATEGORY_LABEL: Record<string, string> = {
  bug: 'Bug', idea: 'Idea', question: 'Question', other: 'Other'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Builds the feedback email sent to support. Deterministic. Sender identity + context are
// attached so support can triage and reply (reply_to is set by the endpoint).
export function buildFeedbackEmail(ctx: FeedbackCtx): { subject: string, html: string, text: string } {
  const catLabel = CATEGORY_LABEL[ctx.category] ?? 'Other'
  const who = ctx.senderName || ctx.userName
  const subject = `[Feedback: ${catLabel}] from ${who}`

  const at = ctx.at.toLocaleString('en-GB', { timeZone: 'Europe/Helsinki', dateStyle: 'medium', timeStyle: 'short' })
  const rows: Array<[string, string]> = [
    ['Category', catLabel],
    ['From', who],
    ['Username', ctx.userName],
    ['Role', ctx.role],
    ['Account email', ctx.accountEmail || '—'],
    ['Reply to', ctx.replyEmail || ctx.accountEmail || '—'],
    ['Page', ctx.pageUrl || '—'],
    ['Sent', at]
  ]

  const metaRows = rows.map(([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:4px 0;color:#1f2937;font-size:13px;">${escapeHtml(v)}</td></tr>`
  ).join('')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px 4px;">
                <div style="font-size:18px;font-weight:700;color:#059669;">Hiilivahti</div>
                <h1 style="margin:8px 0 0;font-size:18px;font-weight:700;">New feedback: ${escapeHtml(catLabel)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 4px;">
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeHtml(ctx.message)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">${metaRows}</table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    `New feedback: ${catLabel}`,
    '',
    ctx.message,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`)
  ].join('\n')

  return { subject, html, text }
}
