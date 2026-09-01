// Milestone badges derived from the user's shift impact (/api/impact) — no dedicated
// storage; earned/locked is computed from running totals + streak. Shared by the
// Achievements card, the header badges, and anywhere else that needs them.
type Bucket = { count: number, grams: number }
export interface Impact {
  week: Bucket
  month: Bucket
  allTime: Bucket
  streakWeeks: number
  lastActionAt: string | null
}

type Metric = 'count' | 'grams' | 'streak'
type BadgeColor = 'emerald' | 'sky' | 'violet' | 'amber' | 'teal' | 'yellow' | 'orange' | 'rose' | 'lime' | 'cyan'
export interface Milestone {
  id: string
  label: string
  desc: string
  icon: string
  color: BadgeColor
  metric: Metric
  target: number
}
export interface Badge extends Milestone {
  earned: boolean
  progress: number
}

// Static (Tailwind-scannable) class sets per badge color.
export const BADGE_COLORS: Record<BadgeColor, { chip: string, icon: string, tile: string }> = {
  emerald: { chip: 'bg-emerald-500/15 ring-emerald-500/40', icon: 'text-emerald-500', tile: 'border-emerald-500/40 bg-emerald-500/5' },
  sky: { chip: 'bg-sky-500/15 ring-sky-500/40', icon: 'text-sky-500', tile: 'border-sky-500/40 bg-sky-500/5' },
  violet: { chip: 'bg-violet-500/15 ring-violet-500/40', icon: 'text-violet-500', tile: 'border-violet-500/40 bg-violet-500/5' },
  amber: { chip: 'bg-amber-500/15 ring-amber-500/40', icon: 'text-amber-500', tile: 'border-amber-500/40 bg-amber-500/5' },
  teal: { chip: 'bg-teal-500/15 ring-teal-500/40', icon: 'text-teal-500', tile: 'border-teal-500/40 bg-teal-500/5' },
  yellow: { chip: 'bg-yellow-500/15 ring-yellow-500/40', icon: 'text-yellow-500', tile: 'border-yellow-500/40 bg-yellow-500/5' },
  orange: { chip: 'bg-orange-500/15 ring-orange-500/40', icon: 'text-orange-500', tile: 'border-orange-500/40 bg-orange-500/5' },
  rose: { chip: 'bg-rose-500/15 ring-rose-500/40', icon: 'text-rose-500', tile: 'border-rose-500/40 bg-rose-500/5' },
  lime: { chip: 'bg-lime-500/15 ring-lime-500/40', icon: 'text-lime-500', tile: 'border-lime-500/40 bg-lime-500/5' },
  cyan: { chip: 'bg-cyan-500/15 ring-cyan-500/40', icon: 'text-cyan-500', tile: 'border-cyan-500/40 bg-cyan-500/5' }
}

const MILESTONES: Milestone[] = [
  { id: 'first', label: 'First shift', desc: 'Confirm your first shifted load', icon: 'i-lucide-flag', color: 'emerald', metric: 'count', target: 1 },
  { id: 'five', label: '5 loads', desc: 'Shift 5 flexible loads', icon: 'i-lucide-layers', color: 'sky', metric: 'count', target: 5 },
  { id: 'ten', label: '10 loads', desc: 'Shift 10 flexible loads', icon: 'i-lucide-medal', color: 'violet', metric: 'count', target: 10 },
  { id: 'twentyfive', label: '25 loads', desc: 'Shift 25 flexible loads', icon: 'i-lucide-trophy', color: 'amber', metric: 'count', target: 25 },
  { id: 'g10', label: '10 g saved', desc: 'Avoid 10 g of CO₂', icon: 'i-lucide-sprout', color: 'lime', metric: 'grams', target: 10 },
  { id: 'g100', label: '100 g saved', desc: 'Avoid 100 g of CO₂', icon: 'i-lucide-leaf', color: 'teal', metric: 'grams', target: 100 },
  { id: 'kg1', label: '1 kg saved', desc: 'Avoid 1 kg of CO₂', icon: 'i-lucide-trees', color: 'yellow', metric: 'grams', target: 1000 },
  { id: 'streak1', label: '1-week streak', desc: 'Act for one week', icon: 'i-lucide-flame', color: 'orange', metric: 'streak', target: 1 },
  { id: 'streak2', label: '2-week streak', desc: 'Act two weeks running', icon: 'i-lucide-flame', color: 'cyan', metric: 'streak', target: 2 },
  { id: 'streak4', label: '4-week streak', desc: 'Act four weeks running', icon: 'i-lucide-flame', color: 'rose', metric: 'streak', target: 4 }
]

const EMPTY: Impact = { week: { count: 0, grams: 0 }, month: { count: 0, grams: 0 }, allTime: { count: 0, grams: 0 }, streakWeeks: 0, lastActionAt: null }

export function useAchievements() {
  // Shared key so ImpactCard / AchievementsCard / header all reuse one request.
  // Client-only: the session cookie isn't forwarded to this authed route during SSR,
  // which caused a 401 on the server render before the client refetch succeeded.
  const { data, refresh } = useFetch<Impact>('/api/impact', {
    key: 'impact',
    server: false,
    lazy: true,
    // Multiple consumers (layout + cards) share this key; 'defer' makes the later
    // ones reuse the in-flight request instead of cancelling it (the default 'cancel'
    // caused the first request to error while the second succeeded).
    dedupe: 'defer',
    default: () => ({ ...EMPTY })
  })

  function metricValue(m: Metric): number {
    if (m === 'grams') return data.value?.allTime.grams ?? 0
    if (m === 'streak') return data.value?.streakWeeks ?? 0
    return data.value?.allTime.count ?? 0
  }

  const badges = computed<Badge[]>(() => MILESTONES.map((m) => {
    const value = metricValue(m.metric)
    return { ...m, earned: value >= m.target, progress: Math.min(1, m.target ? value / m.target : 0) }
  }))
  const earned = computed(() => badges.value.filter(b => b.earned))
  const earnedCount = computed(() => earned.value.length)

  return { impact: data, refresh, badges, earned, earnedCount, total: MILESTONES.length }
}
