// Admin-invite token helpers. Only the SHA-256 hash of the token is stored in the DB
// (admin_invites.tokenHash); the raw token travels once, in the emailed accept link.
// Web Crypto is available on Cloudflare Workers and in local dev alike.

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

// A 256-bit URL-safe (hex) random token.
export function generateInviteToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function hashInviteToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return toHex(digest)
}
