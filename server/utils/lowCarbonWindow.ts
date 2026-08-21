import type { ForecastData } from '../api/forecast/[series].get'

const TZ = 'Europe/Helsinki'

export function hhmm(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
  }).format(new Date(ms))
}

function time12(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ
  }).format(new Date(ms))
}

function dateKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ
  }).format(new Date(ms))
}

function relativeDay(ms: number, nowMs: number): string {
  const d = dateKey(ms)
  if (d === dateKey(nowMs)) return 'today'
  if (d === dateKey(nowMs + 86_400_000)) return 'tomorrow'
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: TZ }).format(new Date(ms))
}

// Human display for a window: 12-hour times with AM/PM, plus a "today"/"tomorrow"
// day marker when the window crosses days (or falls entirely on another day).
// e.g. { start: "11:00 PM today", end: "06:00 AM tomorrow" }.
export function formatWindowRange(startMs: number, endMs: number, nowMs = Date.now()): { start: string, end: string } {
  const sTime = time12(startMs)
  const eTime = time12(endMs)
  if (dateKey(startMs) === dateKey(endMs)) {
    const day = relativeDay(startMs, nowMs)
    const suffix = day === 'today' ? '' : ` ${day}` // label both ends when not today
    return { start: `${sTime}${suffix}`, end: `${eTime}${suffix}` }
  }
  return { start: `${sTime} ${relativeDay(startMs, nowMs)}`, end: `${eTime} ${relativeDay(endMs, nowMs)}` }
}

export interface LowCarbonWindow {
  startMs: number
  endMs: number
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
        if (start >= 0 && i - start >= 2) return capWindow(fc, start, i - 1)
        start = -1
      }
    }
    if (start >= 0 && fc.length - start >= 2) return capWindow(fc, start, fc.length - 1)
  }
  return null
}

function build(fc: ForecastData['points'], s: number, e: number): LowCarbonWindow {
  let min = fc[s]!.value
  for (let i = s; i <= e; i++) min = Math.min(min, fc[i]!.value)
  return { startMs: fc[s]!.time, endMs: fc[e]!.time, start: hhmm(fc[s]!.time), end: hhmm(fc[e]!.time), intensity: Math.round(min * 10) / 10 }
}

// A clean run can span most of a day. For an actionable "when to run" alert we
// narrow it to its cleanest slice: the contiguous window of up to MAX_WINDOW_HOURS
// with the lowest average intensity (indices s..e must be contiguous hours).
const MAX_WINDOW_HOURS = 4

function capWindow(fc: ForecastData['points'], s: number, e: number): LowCarbonWindow {
  const len = Math.min(e - s + 1, MAX_WINDOW_HOURS)
  let bestStart = s
  let bestAvg = Infinity
  for (let i = s; i + len - 1 <= e; i++) {
    let sum = 0
    for (let j = i; j < i + len; j++) sum += fc[j]!.value
    const avg = sum / len
    if (avg < bestAvg) {
      bestAvg = avg
      bestStart = i
    }
  }
  return build(fc, bestStart, bestStart + len - 1)
}

export function windowUrgency(startMs: number): 'low' | 'medium' | 'high' {
  const hoursAway = (startMs - Date.now()) / 3_600_000
  return hoursAway <= 3 ? 'high' : hoursAway <= 8 ? 'medium' : 'low'
}

// Mean forecast carbon intensity over the next ~24h (gCO₂/kWh), for the data-rich
// "Next 24h avg: N" notification line. Includes the current (in-progress) hour and
// looks 24h ahead. Returns null if the forecast horizon is too short to fairly call
// it a 24h average — so the message never claims "24h" over only a few hours.
const MIN_FORECAST_HOURS = 18

export function next24hAverage(points: ForecastData['points']): number | null {
  const now = Date.now()
  const from = now - 3_600_000 // include the hour we're currently in
  const vals = points
    .filter(p => p.isForecast && p.time >= from && p.time <= now + 24 * 3_600_000)
    .map(p => p.value)
  if (vals.length < MIN_FORECAST_HOURS) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

function todMin(ms: number): number {
  const [h, m] = hhmm(ms).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function inActiveHours(tod: number, start: number, end: number): boolean {
  return start <= end ? (tod >= start && tod < end) : (tod >= start || tod < end)
}

// Per-consumer variant: the earliest run of >= minRunHours consecutive forecast
// hours below the threshold, within `horizonMs`, whose hours all fall inside the
// consumer's active-hours window (times-of-day in minutes; wraps past midnight).
// A time gap (e.g. active hours ending overnight) breaks contiguity.
export function findWindowBelowInActiveHours(
  points: ForecastData['points'],
  threshold: number,
  horizonMs: number,
  minRunHours: number,
  activeStartMin: number,
  activeEndMin: number
): LowCarbonWindow | null {
  const now = Date.now()
  const fc = points
    .filter(p => p.isForecast && p.time >= now && p.time <= now + horizonMs
      && inActiveHours(todMin(p.time), activeStartMin, activeEndMin))
    .sort((a, b) => a.time - b.time)
  if (fc.length < minRunHours) return null

  const GAP = 3_900_000 // ~1h + slack; a larger gap between points breaks the run
  let start = -1
  for (let i = 0; i < fc.length; i++) {
    const below = fc[i]!.value < threshold
    const contiguous = start >= 0 && (fc[i]!.time - fc[i - 1]!.time) <= GAP
    if (below && (start < 0 || contiguous)) {
      if (start < 0) start = i
      if (i - start + 1 >= minRunHours) {
        let end = i
        while (end + 1 < fc.length
          && fc[end + 1]!.value < threshold
          && (fc[end + 1]!.time - fc[end]!.time) <= GAP) end++
        return capWindow(fc, start, end)
      }
    } else if (below) {
      start = i // below threshold but a gap broke the previous run — start fresh
    } else {
      start = -1
    }
  }
  return null
}
