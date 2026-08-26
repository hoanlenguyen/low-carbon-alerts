import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import { buildForecastSummary } from './buildForecastSummary'
import { generateForecastMessage } from './generateForecastMessage'

const TZ = 'Europe/Helsinki'

function helsinkiDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ
  }).format(new Date())
}

// The card shows only the forecast, not the "What can you do?" actions (the
// recommendation card already gives the user their action). Also drops the
// generic intro line since the card has its own title.
function forecastOnly(body: string): string {
  const i = body.search(/what can you do\??/i)
  return (i >= 0 ? body.slice(0, i) : body)
    .replace(/^\s*here is a quick electricity forecast update\.?\s*/i, '')
    .trim()
}

export interface DailyForecastResult {
  subject: string
  body: string // forecast-only
  generatedAt: Date
}

// General daily forecast message, cached once per Helsinki day and shared by all
// end-users. Lazily regenerates when the cached row is missing or from a previous
// day — so the LLM runs at most once per day.
export async function getDailyForecast(event: H3Event): Promise<DailyForecastResult> {
  const db = useDrizzle(event)
  const config = useRuntimeConfig()
  const today = helsinkiDate()

  const existing = await db.query.dailyForecast.findFirst({ where: eq(schema.dailyForecast.id, 1) })
  if (existing && existing.forDate === today) {
    return { subject: existing.subject, body: forecastOnly(existing.body), generatedAt: existing.generatedAt! }
  }

  try {
    const summary = await buildForecastSummary()
    const { subject, body } = await generateForecastMessage(
      summary,
      config.openaiApiKey,
      config.openaiBaseUrl || undefined,
      config.openaiLlmModel || undefined
    )
    const now = new Date()
    await db.insert(schema.dailyForecast)
      .values({ id: 1, subject, body, forDate: today, generatedAt: now })
      .onConflictDoUpdate({
        target: schema.dailyForecast.id,
        set: { subject, body, forDate: today, generatedAt: now }
      })
    return { subject, body: forecastOnly(body), generatedAt: now }
  } catch {
    // Regeneration failed (flipapi/LLM down) — serve the last cached row if any.
    if (existing) return { subject: existing.subject, body: forecastOnly(existing.body), generatedAt: existing.generatedAt! }
    throw createError({ statusCode: 503, statusMessage: 'Forecast temporarily unavailable' })
  }
}
