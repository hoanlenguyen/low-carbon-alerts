const SERIES_KEYS = ['consumption_emissions', 'renew_production_share', 'domestic_production_share'] as const
export type GridSeriesKey = typeof SERIES_KEYS[number]

const SERIES_META: Record<GridSeriesKey, { label: string, unit: string, higherIsBetter: boolean }> = {
  consumption_emissions: { label: 'Carbon Intensity', unit: 'gCO₂/kWh', higherIsBetter: false },
  renew_production_share: { label: 'Renewable Share', unit: '%', higherIsBetter: true },
  domestic_production_share: { label: 'Domestic Production', unit: '%', higherIsBetter: true }
}

export type GridPoint = { time: number, value: number, isForecast: boolean }

export type GridSeriesData = {
  seriesKey: GridSeriesKey
  seriesLabel: string
  unit: string
  higherIsBetter: boolean
  current: number
  points: GridPoint[]
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

export default defineCachedEventHandler(async (event): Promise<GridSeriesData> => {
  const series = getRouterParam(event, 'series') as GridSeriesKey
  if (!SERIES_KEYS.includes(series)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid series key: ${series}` })
  }

  const raw = await $fetch<FlipResponse>('https://flipapi.net/forecast/latest', {
    params: { series_key: series, history_len: '1d', tz: 'Europe/Helsinki' }
  })

  const historyEntries = Object.entries(raw.data.history).sort(([a], [b]) => a.localeCompare(b))
  const forecastEntries = Object.entries(raw.data.forecast).sort(([a], [b]) => a.localeCompare(b))
  // forecast_start is the current time slot; first forecast entry is the live value
  const currentValue = forecastEntries[0]?.[1] ?? historyEntries[historyEntries.length - 1]?.[1] ?? 0

  const points: GridPoint[] = [
    ...historyEntries.map(([t, v]) => ({ time: new Date(t).getTime(), value: Math.round(v * 100) / 100, isForecast: false })),
    ...forecastEntries.map(([t, v]) => ({ time: new Date(t).getTime(), value: Math.round(v * 100) / 100, isForecast: true }))
  ]

  return {
    seriesKey: series,
    seriesLabel: SERIES_META[series].label,
    unit: SERIES_META[series].unit,
    higherIsBetter: SERIES_META[series].higherIsBetter,
    current: Math.round(currentValue * 100) / 100,
    forecastStartMs: new Date(raw.metadata.forecast_start).getTime(),
    points,
    generatedAt: raw.metadata.generated_at
  }
}, {
  maxAge: 60 * 30,
  name: 'grid-series',
  getKey: event => getRouterParam(event, 'series') ?? 'unknown',
  swr: true
})
