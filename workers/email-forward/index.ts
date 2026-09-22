// Email Worker: forward one incoming message (e.g. support@hiilivahti.fi) to every
// address in FORWARD_TO. Cloudflare Email Routing rules allow only one destination
// per rule, so this fans out to several. Each address must be a VERIFIED destination
// in Email Routing, or message.forward() rejects it.

interface Env {
  FORWARD_TO: string // comma-separated verified destination addresses
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const recipients = (env.FORWARD_TO ?? '')
      .split(',')
      .map(a => a.trim())
      .filter(Boolean)

    if (!recipients.length) {
      message.setReject('No forwarding address configured')
      return
    }

    // Forward to each recipient; one bad address shouldn't block the others.
    const results = await Promise.allSettled(recipients.map(to => message.forward(to)))
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? recipients[i] : null))
      .filter(Boolean)
    if (failed.length) {
      console.error(`[email-forward] failed for: ${failed.join(', ')}`)
    }
    // If every forward failed, reject so the sender gets a bounce instead of a silent drop.
    if (failed.length === recipients.length) {
      message.setReject('Could not deliver to any configured recipient')
    }
  }
}
