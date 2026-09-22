import { z } from 'zod'
import { like } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

const bodySchema = z.object({
  prefix: z.string().trim().min(1, 'Prefix is required').max(40).regex(/^[a-z0-9_-]+$/i, 'Use letters, numbers, - or _'),
  count: z.number().int().min(1, 'At least 1').max(100, 'Max 100 at a time')
})

// Avoids look-alike characters (O/0, I/l) and CSV-unsafe ones (comma, quote).
const PW_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*'
function randomPassword(len = 14): string {
  const bytes = crypto.getRandomValues(new Uint32Array(len))
  let out = ''
  for (let i = 0; i < len; i++) out += PW_CHARS[bytes[i]! % PW_CHARS.length]
  return out
}
const pad = (n: number) => String(n).padStart(3, '0')

// Admin: bulk-generate consumer accounts (username = prefix + sequence, random password,
// no email). Passwords are hashed for storage and returned in PLAINTEXT once so the admin
// can download a CSV — they can't be retrieved later. Accounts are flagged isGenerated.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { prefix, count } = await readValidatedBody(event, bodySchema.parse)
  const normPrefix = prefix.toLowerCase()

  const db = useDrizzle(event)

  // Continue numbering past any existing usernames sharing this prefix (avoids clashes).
  const existing = await db.query.users.findMany({
    where: like(schema.users.userName, `${normPrefix}%`),
    columns: { userName: true }
  })
  const taken = new Set(existing.map(u => u.userName))
  const escaped = normPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const seqRe = new RegExp(`^${escaped}(\\d+)$`)
  let maxSeq = 0
  for (const u of existing) {
    const m = u.userName.match(seqRe)
    if (m) maxSeq = Math.max(maxSeq, Number.parseInt(m[1]!, 10))
  }

  const now = new Date()
  const created: { userName: string, password: string }[] = []
  const rows: (typeof schema.users.$inferInsert)[] = []
  let seq = maxSeq
  for (let i = 0; i < count; i++) {
    let userName = ''
    do {
      seq++
      userName = `${normPrefix}${pad(seq)}`
    } while (taken.has(userName))
    taken.add(userName)

    const password = randomPassword()
    rows.push({
      id: crypto.randomUUID(),
      userName,
      email: '',
      name: null,
      passwordHash: await hashPassword(password),
      role: 'user',
      googleId: null,
      avatarUrl: null,
      isGenerated: true,
      createdAt: now
    })
    created.push({ userName, password })
  }

  await db.insert(schema.users).values(rows)

  return { count: created.length, users: created }
})
