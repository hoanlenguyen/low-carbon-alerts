interface FlipResponse {
  metadata: {
    unit: { EN: string }
    forecast_start: string
    generated_at: string
    region: string
  }
  data: {
    history: Record<string, number>
    forecast: Record<string, number>
  }
}

export type CarbonStatus = 'excellent' | 'good' | 'moderate' | 'high'

export type CarbonPoint = {
  time: number // unix ms
  value: number
  isForecast: boolean
}

export type CarbonData = {
  current: { value: number; status: CarbonStatus; label: string }
  nextLowWindow: { time: string; hoursFromNow: number } | null
  forecastStartMs: number
  points: CarbonPoint[]
  generatedAt: string
  unit: string
}

const THRESHOLDS = { excellent: 20, good: 30, moderate: 50 }

function getStatus(v: number): CarbonStatus {
  if (v < THRESHOLDS.excellent) return 'excellent'
  if (v < THRESHOLDS.good) return 'good'
  if (v < THRESHOLDS.moderate) return 'moderate'
  return 'high'
}

const STATUS_LABELS: Record<CarbonStatus, string> = {
  excellent: 'Excellent — great time to use electricity',
  good: 'Good — lower than average carbon',
  moderate: 'Moderate — typical grid mix',
  high: 'High — consider delaying heavy usage'
}

function findNextLowWindow(forecast: Record<string, number>) {
  const entries = Object.entries(forecast).sort(([a], [b]) => a.localeCompare(b))
  // Find first run of ≥2 consecutive hours below threshold
  let runStart: string | null = null
  let runLen = 0
  for (const [time, value] of entries) {
    if (value < THRESHOLDS.excellent) {
      if (!runStart) runStart = time
      runLen++
      if (runLen >= 2) {
        const windowMs = new Date(runStart).getTime()
        const hoursFromNow = Math.round((windowMs - Date.now()) / 3_600_000)
        return { time: runStart, hoursFromNow }
      }
    } else {
      runStart = null
      runLen = 0
    }
  }
  return null
}

export default defineCachedEventHandler(async (): Promise<CarbonData> => {
  const raw = await $fetch<FlipResponse>('https://flipapi.net/forecast/latest', {
    params: {
      series_key: 'consumption_emissions',
      history_len: '24H',
      tz: 'Europe/Helsinki'
    }
  })

  const historyEntries = Object.entries(raw.data.history).sort(([a], [b]) => a.localeCompare(b))
  const forecastEntries = Object.entries(raw.data.forecast).sort(([a], [b]) => a.localeCompare(b))

  const currentValue = historyEntries[historyEntries.length - 1]?.[1] ?? 0
  const currentStatus = getStatus(currentValue)

  const points: CarbonPoint[] = [
    ...historyEntries.map(([t, v]) => ({ time: new Date(t).getTime(), value: v, isForecast: false })),
    ...forecastEntries.map(([t, v]) => ({ time: new Date(t).getTime(), value: v, isForecast: true }))
  ]

  const nextLowWindow = currentStatus === 'excellent'
    ? null
    : findNextLowWindow(raw.data.forecast)

  return {
    current: {
      value: Math.round(currentValue * 10) / 10,
      status: currentStatus,
      label: STATUS_LABELS[currentStatus]
    },
    nextLowWindow,
    forecastStartMs: new Date(raw.metadata.forecast_start).getTime(),
    points,
    generatedAt: raw.metadata.generated_at,
    unit: 'gCO₂/kWh'
  }
}, {
  maxAge: 60 * 30, // 30 minutes
  name: 'carbon-forecast',
  swr: true
})
