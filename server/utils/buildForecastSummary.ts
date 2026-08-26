import { hhmm } from './lowCarbonWindow'

// Deterministic weekly/24h grid summary from the three Sähköjälki series
// (consumption emissions, renewable share, domestic share). All numbers come from
// here so the LLM message can't invent figures. Honours the 24h-forecast horizon:
// no multi-day or wind-power claims.

const FLIP = 'https://flipapi.net/forecast/latest'
const TZ = 'Europe/Helsinki'

interface FlipResponse {
  metadata: { unit: { EN: string }, forecast_start: string, generated_at: string }
  data: { history: Record<string, number>, forecast: Record<string, number> }
}

interface Pt { t: number, v: number }

interface Series {
  unit: string
  generatedAt: string
  history: Pt[]
  forecast: Pt[]
}

interface Window { start: string, end: string, avg: number }

export interface ForecastSummary {
  generatedAt: string
  emissions: {
    unit: string
    avg24h: number
    min: number
    minTime: string
    max: number
    maxTime: string
    weekAvg: number
    vsWeek: 'below' | 'above' | 'similar'
    cleanestWindow: Window | null
    highestWindow: Window | null
  }
  renewable: { avg24h: number, min: number, max: number, trend: 'rising' | 'falling' | 'steady' }
  domestic: { avg24h: number }
  weekTrend: 'cleaner' | 'dirtier' | 'steady'
}

function toPts(o: Record<string, number>): Pt[] {
  return Object.entries(o)
    .map(([t, v]) => ({ t: new Date(t).getTime(), v }))
    .sort((a, b) => a.t - b.t)
}

async function fetchSeries(key: string): Promise<Series> {
  const raw = await $fetch<FlipResponse>(FLIP, { params: { series_key: key, history_len: '1W', tz: TZ } })
  return {
    unit: raw.metadata.unit.EN,
    generatedAt: raw.metadata.generated_at,
    history: toPts(raw.data.history),
    forecast: toPts(raw.data.forecast)
  }
}

const mean = (v: number[]): number => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)
const round = (n: number, d = 0): number => { const f = 10 ** d; return Math.round(n * f) / f }

// Cleanest (lowest) or worst (highest) contiguous `len`-hour window by average.
function extremeWindow(pts: Pt[], len: number, lowest: boolean): Window | null {
  if (pts.length < len) return null
  let bestIdx = 0
  let bestAvg = lowest ? Infinity : -Infinity
  for (let i = 0; i + len <= pts.length; i++) {
    const a = mean(pts.slice(i, i + len).map(p => p.v))
    if (lowest ? a < bestAvg : a > bestAvg) { bestAvg = a; bestIdx = i }
  }
  return { start: hhmm(pts[bestIdx]!.t), end: hhmm(pts[bestIdx + len - 1]!.t), avg: round(bestAvg) }
}

export async function buildForecastSummary(): Promise<ForecastSummary> {
  const [em, re, dom] = await Promise.all([
    fetchSeries('consumption_emissions'),
    fetchSeries('renew_production_share'),
    fetchSeries('domestic_production_share')
  ])

  const now = Date.now()
  const next24 = (s: Series): Pt[] => s.forecast.filter(p => p.t >= now - 3_600_000) // include the current hour

  // ── Emissions ──
  const emFc = next24(em)
  const emAvg = round(mean(emFc.map(p => p.v)))
  const emMin = emFc.reduce((m, p) => (p.v < m.v ? p : m), emFc[0]!)
  const emMax = emFc.reduce((m, p) => (p.v > m.v ? p : m), emFc[0]!)
  const emWeekAvg = round(mean(em.history.map(p => p.v)))
  const vsWeek = emAvg < emWeekAvg * 0.9 ? 'below' : emAvg > emWeekAvg * 1.1 ? 'above' : 'similar'

  // Week trend: first half vs second half of the past 7 days.
  const midT = now - 3.5 * 24 * 3_600_000
  const firstHalf = mean(em.history.filter(p => p.t < midT).map(p => p.v))
  const secondHalf = mean(em.history.filter(p => p.t >= midT).map(p => p.v))
  const weekTrend = secondHalf < firstHalf * 0.95 ? 'cleaner' : secondHalf > firstHalf * 1.05 ? 'dirtier' : 'steady'

  // ── Renewable share ──
  const reFc = next24(re)
  const reVals = reFc.map(p => p.v)
  const third = Math.max(1, Math.floor(reFc.length / 3))
  const reFirst = mean(reFc.slice(0, third).map(p => p.v))
  const reLast = mean(reFc.slice(-third).map(p => p.v))
  const reTrend = reLast > reFirst + 5 ? 'rising' : reLast < reFirst - 5 ? 'falling' : 'steady'

  // ── Domestic share ──
  const domFc = next24(dom)

  return {
    generatedAt: em.generatedAt,
    emissions: {
      unit: em.unit,
      avg24h: emAvg,
      min: round(emMin.v), minTime: hhmm(emMin.t),
      max: round(emMax.v), maxTime: hhmm(emMax.t),
      weekAvg: emWeekAvg,
      vsWeek,
      cleanestWindow: extremeWindow(emFc, 3, true),
      highestWindow: extremeWindow(emFc, 3, false)
    },
    renewable: {
      avg24h: round(mean(reVals)),
      min: round(Math.min(...reVals)),
      max: round(Math.max(...reVals)),
      trend: reTrend
    },
    domestic: { avg24h: round(mean(domFc.map(p => p.v))) },
    weekTrend
  }
}
