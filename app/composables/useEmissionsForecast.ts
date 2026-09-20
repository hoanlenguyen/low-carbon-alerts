// Hourly carbon-intensity forecast (consumption_emissions) for the "I shifted it"
// start-hour picker. Reuses the cached public /api/forecast endpoint and exposes the
// selectable future hours plus a colour band per hour so the user can pick a clean one.
export interface HourOption {
  startMs: number
  label: string // "16:00"
  intensity: number // gCO₂/kWh
  isForecast: boolean
  band: 'clean' | 'mid' | 'dirty'
  isTomorrow: boolean // hour falls on the next Helsinki day (horizon crosses midnight)
}

interface ForecastPoint { time: number, value: number, isForecast: boolean }
interface ForecastData { unit: string, points: ForecastPoint[], generatedAt: string }

const hhmm = (ms: number) => new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Helsinki'
}).format(new Date(ms))

const ymd = (ms: number) => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Helsinki'
}).format(new Date(ms))

export function useEmissionsForecast() {
  const { data, refresh, status } = useFetch<ForecastData>('/api/forecast/consumption_emissions', {
    key: 'emissions-forecast-picker',
    lazy: true,
    dedupe: 'defer',
    default: () => ({ unit: 'gCO₂/kWh', points: [], generatedAt: '' })
  })

  // All hourly points, ascending. Used to price a run (shared runHourSlices).
  const points = computed(() => data.value?.points ?? [])

  // Colour band thresholds derived from the visible range (terciles), so "clean/dirty"
  // is relative to the day rather than a fixed cut-off.
  const bands = computed(() => {
    const vals = points.value.map(p => p.value).sort((a, b) => a - b)
    if (!vals.length) return { lo: 0, hi: 0 }
    const q = (f: number) => vals[Math.min(vals.length - 1, Math.floor(f * vals.length))]!
    return { lo: q(1 / 3), hi: q(2 / 3) }
  })

  // Selectable start hours: from the current hour onward (forecast horizon only).
  const hourOptions = computed<HourOption[]>(() => {
    const HOUR = 3_600_000
    const currentHour = Math.floor(Date.now() / HOUR) * HOUR
    const today = ymd(Date.now())
    const { lo, hi } = bands.value
    return points.value
      .filter(p => p.time >= currentHour)
      .map((p) => {
        // Snap to the top of the clock-hour so the chosen/displayed start is always
        // "HH:00" (forecast timestamps aren't always exactly on the hour).
        const startMs = Math.floor(p.time / HOUR) * HOUR
        return {
          startMs,
          label: hhmm(startMs),
          intensity: p.value,
          isForecast: p.isForecast,
          band: (p.value <= lo ? 'clean' : p.value >= hi ? 'dirty' : 'mid') as HourOption['band'],
          isTomorrow: ymd(startMs) !== today
        }
      })
  })

  // Hours to render in the read-only strip: upcoming hours when available; otherwise the
  // (stale) forecast window, so the data stays visible with a staleness warning. NOT used
  // for scheduling — the start-hour picker uses hourOptions (upcoming only).
  const displayHours = computed<HourOption[]>(() => {
    if (hourOptions.value.length) return hourOptions.value
    const HOUR = 3_600_000
    const { lo, hi } = bands.value
    const forecast = points.value.filter(p => p.isForecast)
    const src = forecast.length ? forecast : points.value
    if (!src.length) return []
    const baseDay = ymd(src[0]!.time) // day boundary relative to the shown window
    return src.map((p) => {
      const startMs = Math.floor(p.time / HOUR) * HOUR
      return {
        startMs,
        label: hhmm(startMs),
        intensity: p.value,
        isForecast: p.isForecast,
        band: (p.value <= lo ? 'clean' : p.value >= hi ? 'dirty' : 'mid') as HourOption['band'],
        isTomorrow: ymd(startMs) !== baseDay
      }
    })
  })

  // 24h grid average across the selectable forecast hours — the baseline a shift's
  // saving is measured against (mirrors the server's forecastAvg24h). 2-decimal, unrounded.
  const avg24h = computed<number | null>(() => {
    const vals = hourOptions.value.map(h => h.intensity)
    if (!vals.length) return null
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
  })

  // When the underlying forecast was generated (from the API). Used to surface a
  // staleness warning when the upstream data hasn't refreshed.
  const generatedAt = computed<Date | null>(() => {
    const g = data.value?.generatedAt
    if (!g) return null
    const d = new Date(g)
    return Number.isNaN(d.getTime()) ? null : d
  })

  return { points, hourOptions, displayHours, avg24h, generatedAt, refresh, status }
}
