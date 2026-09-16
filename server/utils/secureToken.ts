// Generic single-use token helpers (password reset, etc.): only the SHA-256 hash is
// stored; the raw token travels once. Web Crypto works on Cloudflare Workers and local dev.

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

// A 256-bit URL-safe (hex) random token.
export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function hashToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return toHex(digest)
}
