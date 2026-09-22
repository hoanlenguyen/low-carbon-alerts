import type { H3Event } from 'h3'
import { and, eq, ne, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import { computeImpact, type ShiftRow } from './impact'
import { buildForecastSummary } from './buildForecastSummary'
import { buildWeeklyDigestEmail } from '../emails/weeklyDigest'
import { sendEmail } from './sendEmail'

export interface WeeklyDigestOptions {
  userIds?: string[] // restrict to these users (admin test); default = all opted-in
  ignoreOptIn?: boolean // admin test: send even if the user hasn't opted in
}

// Build + send the weekly digest. Used by the scheduled cron job (all opted-in users
// with an email) and by the admin "send now" test (selected users, opt-in bypassed).
export async function runWeeklyDigest(event: H3Event, opts: WeeklyDigestOptions = {}): Promise<{ recipients: number, sent: number, failed: number }> {
  const db = useDrizzle(event)
  const now = new Date()
  const siteUrl = (useRuntimeConfig(event).public.siteUrl || 'https://hiilivahti.fi').replace(/\/$/, '')
  const appUrl = `${siteUrl}/app`
  const manageUrl = `${siteUrl}/app/settings`

  // Candidate users: active + has an email.
  const users = await db.query.users.findMany({
    where: and(eq(schema.users.status, 'active'), ne(schema.users.email, '')),
    columns: { id: true, name: true, email: true }
  })
  const profiles = await db.query.userProfiles.findMany({ columns: { userId: true, weeklyEmailOptIn: true } })
  const optInByUser = new Map(profiles.map(p => [p.userId, p.weeklyEmailOptIn]))

  let recipients = users
  if (opts.userIds?.length) recipients = recipients.filter(u => opts.userIds!.includes(u.id))
  if (!opts.ignoreOptIn) recipients = recipients.filter(u => optInByUser.get(u.id) === true)

  if (!recipients.length) return { recipients: 0, sent: 0, failed: 0 }

  // Community total (once).
  const [community] = await db
    .select({
      totalG: sql<number>`coalesce(sum(${schema.applianceShifts.estimatedSavingG}), 0)`,
      users: sql<number>`count(distinct ${schema.applianceShifts.userId})`
    })
    .from(schema.applianceShifts)
  const communityTotalG = community?.totalG ?? 0
  const communityUsers = community?.users ?? 0

  // Week-ahead outlook (once; non-fatal if the forecast is unavailable).
  const outlook: { cleanestStart: string | null, cleanestEnd: string | null, cleanestAvg: number | null, avg24h: number | null, unit: string } | null = await (async () => {
    try {
      const s = await buildForecastSummary()
      const cw = s.emissions.cleanestWindow
      return {
        cleanestStart: cw?.start ?? null,
        cleanestEnd: cw?.end ?? null,
        cleanestAvg: cw?.avg ?? null,
        avg24h: s.emissions.avg24h,
        unit: s.emissions.unit
      }
    } catch {
      return null
    }
  })()

  // Per-user shift rows (small table — fetch once, group in memory).
  const allShifts = await db.query.applianceShifts.findMany({
    columns: { userId: true, estimatedSavingG: true, day: true, createdAt: true }
  })
  const shiftsByUser = new Map<string, ShiftRow[]>()
  for (const s of allShifts) {
    const list = shiftsByUser.get(s.userId) ?? []
    list.push({ estimatedSavingG: s.estimatedSavingG, day: s.day, createdAt: s.createdAt })
    shiftsByUser.set(s.userId, list)
  }

  let sent = 0
  let failed = 0
  for (const u of recipients) {
    try {
      const impact = computeImpact(shiftsByUser.get(u.id) ?? [], now)
      const { subject, html, text } = buildWeeklyDigestEmail({
        name: u.name,
        lastWeek: impact.lastWeek,
        streakWeeks: impact.streakWeeks,
        communityTotalG,
        communityUsers,
        outlook,
        appUrl,
        manageUrl
      })
      await sendEmail({
        to: u.email,
        subject,
        html,
        text,
        headers: { 'List-Unsubscribe': `<${manageUrl}>` }
      })
      sent++
    } catch {
      failed++ // one bad recipient shouldn't abort the whole run
    }
  }

  return { recipients: recipients.length, sent, failed }
}
