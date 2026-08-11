import type { ForecastData } from '../api/forecast/[series].get'

const TZ = 'Europe/Helsinki'

// Flexible loads a household can realistically time-shift, most-shiftable first.
// Matched case-insensitively against the user's onboarding appliance labels.
const FLEXIBLE_PRIORITY = [
  'EV charger',
  'Dishwasher',
  'Washing machine',
  'Tumble dryer',
  'Sauna',
  'Hot tub',
  'Heat pump'
]

export interface ColdStartProfile {
  appliances: string[]
  activeHoursStart: string // "HH:MM"
  activeHoursEnd: string // "HH:MM"
}

export interface ColdStartFacts {
  appliance: string
  bestTime: string | null // "HH:MM" Helsinki
  carbonIntensity: number | null // gCO₂/kWh at the chosen window
  carbonSaving: 'low' | 'medium' | 'high'
  reason: string
  recommendation: string // deterministic default headline (LLM may replace it)
  inActiveHours: boolean
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function helsinkiHhmm(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ
  }).format(new Date(ms))
}

// Handles active-hours windows that wrap past midnight (e.g. 22:00–06:00).
function isWithinActiveHours(pointMin: number, startMin: number, endMin: number): boolean {
  if (startMin <= endMin) return pointMin >= startMin && pointMin <= endMin
  return pointMin >= startMin || pointMin <= endMin
}

export function pickFlexibleAppliance(appliances: string[]): string {
  const lower = appliances.map(a => a.toLowerCase())
  for (const flex of FLEXIBLE_PRIORITY) {
    if (lower.includes(flex.toLowerCase())) return flex
  }
  // No obviously flexible appliance — fall back to the first they listed, else a generic phrase.
  return appliances[0] ?? 'a high-energy appliance'
}

function savingBand(windowValue: number, avg24h: number): 'low' | 'medium' | 'high' {
  if (avg24h <= 0) return 'low'
  const reduction = (avg24h - windowValue) / avg24h
  if (reduction >= 0.4) return 'high'
  if (reduction >= 0.2) return 'medium'
  return 'low'
}

/**
 * Deterministic core of the cold-start recommendation (prompts/02_cold_start.md).
 * Picks the real low-carbon window and a flexible appliance from live forecast data —
 * never invents numbers. The friendly prose is layered on separately by the LLM.
 */
export function buildColdStartRecommendation(
  carbon: ForecastData,
  profile: ColdStartProfile
): ColdStartFacts {
  const appliance = pickFlexibleAppliance(profile.appliances)

  const now = Date.now()
  const horizon = now + 24 * 3_600_000
  const forecast = carbon.points
    .filter(p => p.isForecast && p.time >= now && p.time <= horizon)
    .sort((a, b) => a.time - b.time)

  const history = carbon.points.filter(p => !p.isForecast)
  const avg24h = history.length
    ? history.reduce((s, p) => s + p.value, 0) / history.length
    : (carbon.current || (forecast.length ? forecast[0]!.value : 0))

  // No usable forecast → honest, welcoming placeholder.
  if (forecast.length === 0) {
    return {
      appliance,
      bestTime: null,
      carbonIntensity: null,
      carbonSaving: 'low',
      inActiveHours: false,
      reason: 'Live grid forecast is momentarily unavailable — your first tailored window will appear shortly.',
      recommendation: 'Welcome aboard! We’ll alert you the moment a clean, low-carbon window opens up.'
    }
  }

  const startMin = toMinutes(profile.activeHoursStart)
  const endMin = toMinutes(profile.activeHoursEnd)

  let globalMin = forecast[0]!
  let activeMin: typeof forecast[number] | null = null
  for (const p of forecast) {
    if (p.value < globalMin.value) globalMin = p
    const pMin = toMinutes(helsinkiHhmm(p.time))
    if (isWithinActiveHours(pMin, startMin, endMin)) {
      if (!activeMin || p.value < activeMin.value) activeMin = p
    }
  }

  // Prefer a window inside active hours; only jump outside if it is meaningfully cleaner (>20%).
  const preferActive = activeMin !== null && activeMin.value <= globalMin.value * 1.2
  const chosen = preferActive ? activeMin! : globalMin
  const inActiveHours = preferActive

  const bestTime = helsinkiHhmm(chosen.time)
  const carbonIntensity = Math.round(chosen.value * 10) / 10
  const carbonSaving = savingBand(chosen.value, avg24h)
  const pctBelow = avg24h > 0 ? Math.round(((avg24h - chosen.value) / avg24h) * 100) : 0

  const belowAvgPhrase = pctBelow > 0
    ? `about ${pctBelow}% below the 24-hour average`
    : 'among the cleanest of the day'
  const activePhrase = inActiveHours
    ? ' and it falls within your active hours'
    : ' — it’s outside your usual active hours, but the cleanest window available'

  const reason = `At ${bestTime}, carbon intensity dips to ${carbonIntensity} gCO₂/kWh, ${belowAvgPhrase}${activePhrase}.`
  const recommendation = `Run your ${appliance.toLowerCase()} around ${bestTime} — that’s when Finland’s grid is at its cleanest today.`

  return {
    appliance,
    bestTime,
    carbonIntensity,
    carbonSaving,
    inActiveHours,
    reason,
    recommendation
  }
}
