const SERIES_KEYS = ['consumption_emissions', 'renew_production_share', 'domestic_production_share'] as const
export type ForecastKey = typeof SERIES_KEYS[number]

const SERIES_META: Record<ForecastKey, { label: string, unit: string, higherIsBetter: boolean }> = {
  consumption_emissions: { label: 'Carbon Intensity', unit: 'gCO₂/kWh', higherIsBetter: false },
  renew_production_share: { label: 'Renewable Share', unit: '%', higherIsBetter: true },
  domestic_production_share: { label: 'Domestic Production', unit: '%', higherIsBetter: true }
}

export type ForecastPoint = { time: number, value: number, isForecast: boolean }

export type ForecastData = {
  seriesKey: ForecastKey
  seriesLabel: string
  unit: string
  higherIsBetter: boolean
  current: number
  points: ForecastPoint[]
  forecastStartMs: number
  generatedAt: string
}

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

// Unified grid-forecast endpoint (merges the former /api/carbon + /api/grid).
// One series per request: consumption_emissions | renew_production_share | domestic_production_share.
export default defineCachedEventHandler(async (event): Promise<ForecastData> => {
  const series = getRouterParam(event, 'series') as ForecastKey
  if (!SERIES_KEYS.includes(series)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid series key: ${series}` })
  }

  const raw = await $fetch<FlipResponse>('https://flipapi.net/forecast/latest', {
    params: { series_key: series, history_len: '12h', tz: 'Europe/Helsinki' }
  })

  const historyEntries = Object.entries(raw.data.history).sort(([a], [b]) => a.localeCompare(b))
  const forecastEntries = Object.entries(raw.data.forecast).sort(([a], [b]) => a.localeCompare(b))
  const points: ForecastPoint[] = [
    ...historyEntries.map(([t, v]) => ({ time: new Date(t).getTime(), value: Math.round(v * 100) / 100, isForecast: false })),
    ...forecastEntries.map(([t, v]) => ({ time: new Date(t).getTime(), value: Math.round(v * 100) / 100, isForecast: true }))
  ].sort((a, b) => a.time - b.time)

  // "Current" = the value for the hour we're in now (last point at or before now).
  // NOT forecastEntries[0] — that tracks the API's forecast_start, which lags the
  // real wall-clock hour when the forecast was generated an hour or more earlier.
  const now = Date.now()
  const currentValue = points.filter(p => p.time <= now).at(-1)?.value ?? points[0]?.value ?? 0

  return {
    seriesKey: series,
    seriesLabel: SERIES_META[series].label,
    unit: SERIES_META[series].unit,
    higherIsBetter: SERIES_META[series].higherIsBetter,
    current: currentValue,
    forecastStartMs: new Date(raw.metadata.forecast_start).getTime(),
    points,
    generatedAt: raw.metadata.generated_at
  }
}, {
  maxAge: 60 * 30,
  name: 'forecast-series',
  getKey: event => getRouterParam(event, 'series') ?? 'unknown',
  swr: true
})
