import type { ForecastData } from '../api/forecast/[series].get'

const TZ = 'Europe/Helsinki'

export function hhmm(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
  }).format(new Date(ms))
}

export interface LowCarbonWindow {
  startMs: number
  start: string // "HH:MM"
  end: string // "HH:MM"
  intensity: number // lowest gCO₂/kWh in the window
}

// First run of ≥2 consecutive forecast hours below a threshold (tiered from
// cleanest to merely-good), searching the next 24h. Shared by the smart-alert
// preview and per-user test endpoints.
export function findLowCarbonWindow(carbon: ForecastData): LowCarbonWindow | null {
  const now = Date.now()
  const fc = carbon.points
    .filter(p => p.isForecast && p.time >= now && p.time <= now + 24 * 3_600_000)
    .sort((a, b) => a.time - b.time)
  if (fc.length < 2) return null

  for (const threshold of [20, 30, 50]) {
    let start = -1
    for (let i = 0; i < fc.length; i++) {
      if (fc[i]!.value < threshold) {
        if (start < 0) start = i
      } else {
        if (start >= 0 && i - start >= 2) return build(fc, start, i - 1)
        start = -1
      }
    }
    if (start >= 0 && fc.length - start >= 2) return build(fc, start, fc.length - 1)
  }
  return null
}

function build(fc: ForecastData['points'], s: number, e: number): LowCarbonWindow {
  let min = fc[s]!.value
  for (let i = s; i <= e; i++) min = Math.min(min, fc[i]!.value)
  return { startMs: fc[s]!.time, start: hhmm(fc[s]!.time), end: hhmm(fc[e]!.time), intensity: Math.round(min * 10) / 10 }
}

export function windowUrgency(startMs: number): 'low' | 'medium' | 'high' {
  const hoursAway = (startMs - Date.now()) / 3_600_000
  return hoursAway <= 3 ? 'high' : hoursAway <= 8 ? 'medium' : 'low'
}

// First run of >= minRunHours consecutive forecast hours below a SPECIFIC
// threshold, starting within `horizonMs` from now. Used by the smart-alert cron
// (uses the configured threshold, not the tiered findLowCarbonWindow).
export function findWindowBelow(
  points: ForecastData['points'],
  threshold: number,
  horizonMs: number,
  minRunHours = 3
): LowCarbonWindow | null {
  const now = Date.now()
  const fc = points
    .filter(p => p.isForecast && p.time >= now && p.time <= now + horizonMs)
    .sort((a, b) => a.time - b.time)
  if (fc.length < minRunHours) return null

  let start = -1
  for (let i = 0; i < fc.length; i++) {
    if (fc[i]!.value < threshold) {
      if (start < 0) start = i
      if (i - start + 1 >= minRunHours) {
        // qualifying run reached — extend to the full contiguous low run
        let end = i
        while (end + 1 < fc.length && fc[end + 1]!.value < threshold) end++
        return build(fc, start, end)
      }
    } else {
      start = -1
    }
  }
  return null
}
