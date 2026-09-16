import type { H3Event } from 'h3'
import { buildAdminInviteEmail } from '../emails/adminInvite'
import { sendEmail } from './sendEmail'

// The public accept-invite link carrying the single-use raw token.
export function inviteAcceptUrl(event: H3Event, rawToken: string): string {
  const siteUrl = (useRuntimeConfig(event).public.siteUrl || 'https://hiilivahti.fi').replace(/\/$/, '')
  return `${siteUrl}/accept-invite?token=${rawToken}`
}

// Sends the invite email. Non-fatal: returns false if sending fails or Resend isn't
// configured, so the admin can still share the accept link (returned by the endpoint).
export async function sendInviteEmail(opts: { to: string, acceptUrl: string, inviterName: string | null, expiresAt: Date }): Promise<boolean> {
  try {
    const { subject, html, text } = buildAdminInviteEmail({
      inviteUrl: opts.acceptUrl, inviterName: opts.inviterName, expiresAt: opts.expiresAt
    })
    await sendEmail({ to: opts.to, subject, html, text })
    return true
  } catch {
    return false
  }
}
