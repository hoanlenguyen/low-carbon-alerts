import { fmtGrams } from '../utils/impact'
import { weeklyDigestHtml } from './weeklyDigest.template'

export interface WeeklyDigestCtx {
  name: string | null
  lastWeek: { grams: number, count: number }
  streakWeeks: number
  communityTotalG: number
  communityUsers: number
  outlook: {
    cleanestStart: string | null
    cleanestEnd: string | null
    cleanestAvg: number | null
    avg24h: number | null
    unit: string
  } | null
  appUrl: string // e.g. https://hiilivahti.fi/app
  manageUrl: string // e.g. https://hiilivahti.fi/app/settings
}

// {token} substitution (mirrors renderPrompt) — split/join avoids regex escaping.
function fill(tpl: string, vars: Record<string, string | number>): string {
  let out = tpl
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
  return out
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Builds the weekly digest email from the markup template (weeklyDigest.template.ts).
// All conditionals are resolved here; the template only has {tokens}. Deterministic — no LLM.
export function buildWeeklyDigestEmail(ctx: WeeklyDigestCtx): { subject: string, html: string, text: string } {
  const first = ctx.name?.split(' ')[0] ?? 'there'
  const savedLastWeek = fmtGrams(ctx.lastWeek.grams)
  const runs = ctx.lastWeek.count
  const community = fmtGrams(ctx.communityTotalG)

  const subject = ctx.lastWeek.grams > 0
    ? `Last week with Hiilivahti — ≈ ${savedLastWeek} CO₂ saved`
    : 'Last week with Hiilivahti'

  const streak = ctx.streakWeeks > 0 ? `🔥 ${ctx.streakWeeks}-week streak — keep it going!` : ''
  const runsLine = `${runs} load${runs === 1 ? '' : 's'} shifted` + (streak ? ` &nbsp;·&nbsp; ${streak}` : '')
  const communityUsersLine = `saved by ${ctx.communityUsers} member${ctx.communityUsers === 1 ? '' : 's'}`

  const o = ctx.outlook
  const outlookHtml = o && o.cleanestStart
    ? `The cleanest window ahead looks like <strong>${o.cleanestStart}–${o.cleanestEnd}</strong>`
    + (o.cleanestAvg != null ? ` (≈ ${o.cleanestAvg} ${o.unit})` : '')
    + '. Plan a flexible load then.'
    : 'Open the app to see the cleanest hours for the week ahead.'

  const html = fill(weeklyDigestHtml, {
    first: escapeHtml(first),
    savedLastWeek,
    runsLine,
    community,
    communityUsersLine,
    outlookHtml,
    appUrl: ctx.appUrl,
    manageUrl: ctx.manageUrl
  })

  const text = [
    `Hi ${first},`,
    '',
    `Last week: ~${savedLastWeek} CO2 saved, ${runs} load${runs === 1 ? '' : 's'} shifted.`,
    streak ? streak.replace('🔥 ', '') : '',
    `Community total: ~${community} CO2 saved by ${ctx.communityUsers} members.`,
    o && o.cleanestStart
      ? `Week ahead: cleanest window ${o.cleanestStart}-${o.cleanestEnd}${o.cleanestAvg != null ? ` (~${o.cleanestAvg} ${o.unit})` : ''}.`
      : 'Week ahead: open the app to see the cleanest hours.',
    '',
    `Open Hiilivahti: ${ctx.appUrl}`,
    `Manage email preferences: ${ctx.manageUrl}`
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}
