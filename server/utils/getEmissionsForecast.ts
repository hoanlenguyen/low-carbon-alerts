// Cached hourly carbon-intensity forecast (consumption_emissions) from flip api, the
// same source the /api/forecast/[series] chart uses. Consumed by the "I shifted it"
// confirm flow to price each chosen run hour accurately. Cached 30 min (SWR) so the
// per-appliance saving snapshot lines up with what the user saw on the chart.

export interface EmissionsPoint { time: number, value: number, isForecast: boolean }
export interface EmissionsForecast {
  unit: string
  points: EmissionsPoint[] // ascending by time; history + forecast
  forecastStartMs: number
  generatedAt: string
}

interface FlipResponse {
  metadata: { unit: { EN: string }, forecast_start: string, generated_at: string }
  data: { history: Record<string, number>, forecast: Record<string, number> }
}

export const getEmissionsForecast = defineCachedFunction(async (): Promise<EmissionsForecast> => {
  const raw = await $fetch<FlipResponse>('https://flipapi.net/forecast/latest', {
    params: { series_key: 'consumption_emissions', history_len: '12h', tz: 'Europe/Helsinki' }
  })
  const hist = Object.entries(raw.data.history).map(([t, v]) => ({ time: new Date(t).getTime(), value: Math.round(v * 100) / 100, isForecast: false }))
  const fc = Object.entries(raw.data.forecast).map(([t, v]) => ({ time: new Date(t).getTime(), value: Math.round(v * 100) / 100, isForecast: true }))
  const points = [...hist, ...fc].sort((a, b) => a.time - b.time)
  return {
    unit: raw.metadata.unit.EN,
    points,
    forecastStartMs: new Date(raw.metadata.forecast_start).getTime(),
    generatedAt: raw.metadata.generated_at
  }
}, {
  maxAge: 60 * 30,
  name: 'emissions-forecast',
  getKey: () => 'consumption_emissions',
  swr: true
})
