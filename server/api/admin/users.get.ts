import { and, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { computeImpact, type ShiftRow } from '../../utils/impact'

// List end-users. Pass ?active=1 to get only active consumers (used by the send /
// target-selection dropdowns); the consumer-management view fetches all and also gets
// per-user impact (total CO2 saved, shift count, weekly streak) for its extra columns.
export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)
  const query = getQuery(event)
  const activeOnly = query.active === '1' || query.active === 'true'

  const where = activeOnly
    ? and(eq(schema.users.role, 'user'), eq(schema.users.status, 'active'))
    : eq(schema.users.role, 'user')

  const users = await db.query.users.findMany({
    where,
    columns: {
      id: true,
      userName: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      isGenerated: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: (users, { desc }) => [desc(users.createdAt)]
  })

  // Per-user impact from the shift log (small table — one read, grouped in memory).
  const shifts = await db.query.applianceShifts.findMany({
    columns: { userId: true, estimatedSavingG: true, day: true, createdAt: true }
  })
  const byUser = new Map<string, ShiftRow[]>()
  for (const s of shifts) {
    const list = byUser.get(s.userId) ?? []
    list.push({ estimatedSavingG: s.estimatedSavingG, day: s.day, createdAt: s.createdAt })
    byUser.set(s.userId, list)
  }
  const now = new Date()

  return users.map((u) => {
    const impact = computeImpact(byUser.get(u.id) ?? [], now)
    return {
      ...u,
      savingG: impact.allTime.grams,
      shiftCount: impact.allTime.count,
      streakWeeks: impact.streakWeeks
    }
  })
})
