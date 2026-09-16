export interface AdminInviteCtx {
  inviteUrl: string
  inviterName: string | null
  expiresAt: Date
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Branded transactional email inviting someone to create a Hiilivahti admin account.
// Deterministic (no LLM). The accept link carries the single-use token.
export function buildAdminInviteEmail(ctx: AdminInviteCtx): { subject: string, html: string, text: string } {
  const inviter = ctx.inviterName?.trim()
  const invitedBy = inviter ? `${escapeHtml(inviter)} has invited you` : 'You have been invited'
  const expires = ctx.expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Helsinki'
  })

  const subject = 'You are invited to Hiilivahti (admin)'

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
                <h1 style="margin:0;font-size:20px;font-weight:700;">${invitedBy} to Hiilivahti</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px;font-size:14px;line-height:1.6;color:#374151;">
                You have been invited to join the Hiilivahti admin dashboard. Click below to set up your account &mdash; you'll choose a username and password.
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <a href="${ctx.inviteUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">Accept invitation</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;font-size:12px;line-height:1.6;color:#6b7280;">
                This invitation expires on <strong>${expires}</strong>. If you weren't expecting it, you can ignore this email.
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px;font-size:12px;line-height:1.6;color:#9ca3af;word-break:break-all;">
                If the button doesn't work, paste this link into your browser:<br>${ctx.inviteUrl}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    `${inviter ? `${inviter} has invited you` : 'You have been invited'} to the Hiilivahti admin dashboard.`,
    '',
    'Set up your account (choose a username and password):',
    ctx.inviteUrl,
    '',
    `This invitation expires on ${expires}. If you weren't expecting it, you can ignore this email.`
  ].join('\n')

  return { subject, html, text }
}
