export interface PasswordResetCtx {
  resetUrl: string
  name: string | null
  expiresAt: Date
}

// Branded password-reset email. Deterministic (no LLM). The reset link carries the
// single-use token; it expires shortly (see forgot-password handler).
export function buildPasswordResetEmail(ctx: PasswordResetCtx): { subject: string, html: string, text: string } {
  const first = ctx.name?.split(' ')[0]
  const greeting = first ? `Hi ${first},` : 'Hi,'
  const expires = ctx.expiresAt.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki'
  })

  const subject = 'Reset your Hiilivahti password'

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px 8px;">
                <div style="font-size:18px;font-weight:700;color:#059669;">Hiilivahti</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px;">
                <h1 style="margin:0;font-size:20px;font-weight:700;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px;font-size:14px;line-height:1.6;color:#374151;">
                ${greeting} we received a request to reset your Hiilivahti password. Click below to choose a new one.
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <a href="${ctx.resetUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;font-size:12px;line-height:1.6;color:#6b7280;">
                This link expires at <strong>${expires}</strong> (about an hour). If you didn't request this, you can safely ignore this email &mdash; your password won't change.
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px;font-size:12px;line-height:1.6;color:#9ca3af;word-break:break-all;">
                If the button doesn't work, paste this link into your browser:<br>${ctx.resetUrl}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    greeting,
    '',
    'We received a request to reset your Hiilivahti password. Open this link to choose a new one:',
    ctx.resetUrl,
    '',
    `This link expires at ${expires} (about an hour). If you didn't request this, you can ignore this email — your password won't change.`
  ].join('\n')

  return { subject, html, text }
}
