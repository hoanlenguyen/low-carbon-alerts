// Markup-only template for the weekly digest email — kept separate from the value logic
// in weeklyDigest.ts so the design can be edited in one place. Bundled as a module
// (Cloudflare Workers has no runtime filesystem / serverAssets — same reason the LLM
// prompts live in server/prompts/templates.ts). Filled by simple {token} substitution;
// all conditionals are resolved in weeklyDigest.ts before injection.
export const weeklyDigestHtml = `<div style="margin:0;padding:0;background:#f4f5f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f4;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:#16a34a;padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Hiilivahti</span>
          <span style="color:#dcfce7;font-size:13px;"> · your weekly summary</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi {first},</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">Here's how last week went shifting flexible loads into cleaner hours.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;margin:0 0 20px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#15803d;">Last week</p>
              <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#111827;">≈ {savedLastWeek} CO₂ saved</p>
              <p style="margin:4px 0 0;font-size:13px;color:#374151;">{runsLine}</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr>
              <td style="padding:14px 16px;background:#f9fafb;border:1px solid #eef0f2;border-radius:10px;" width="50%">
                <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;">Community total</p>
                <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#111827;">≈ {community} CO₂</p>
                <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">{communityUsersLine}</p>
              </td>
              <td width="12"></td>
              <td style="padding:14px 16px;background:#f9fafb;border:1px solid #eef0f2;border-radius:10px;" width="50%">
                <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;">Week ahead</p>
                <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#374151;">{outlookHtml}</p>
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
            <tr><td style="border-radius:8px;background:#16a34a;">
              <a href="{appUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Open Hiilivahti →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eef0f2;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">You're getting this because weekly summaries are on for your account. <a href="{manageUrl}" style="color:#6b7280;">Manage email preferences</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`
