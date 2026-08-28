import { renderPrompt } from './renderPrompt'
import type { ForecastSummary } from './buildForecastSummary'

export const FORECAST_SUBJECT = 'Electricity forecast for the next 24 hours'

// Compact, human-readable facts block fed to the prompt (and the fallback).
function factsText(s: ForecastSummary): string {
  const e = s.emissions
  const vs = e.vsWeek === 'below' ? 'below' : e.vsWeek === 'above' ? 'above' : 'about the same as'
  return [
    `Next 24h carbon intensity: average ${e.avg24h} ${e.unit}, ${vs} the past-week average of ${e.weekAvg} ${e.unit}.`,
    `Lowest around ${e.min} ${e.unit} at ${e.minTime}; highest around ${e.max} ${e.unit} at ${e.maxTime}.`,
    e.cleanestWindow ? `Cleanest stretch: ${e.cleanestWindow.start}-${e.cleanestWindow.end} (~${e.cleanestWindow.avg} ${e.unit}).` : '',
    e.highestWindow ? `Highest-emission stretch: ${e.highestWindow.start}-${e.highestWindow.end}.` : '',
    `Renewable share next 24h: ${s.renewable.min}% to ${s.renewable.max}% (avg ${s.renewable.avg24h}%), trend ${s.renewable.trend}.`,
    `Domestic production share next 24h: about ${s.domestic.avg24h}%.`,
    `This week's emissions trend: ${s.weekTrend}.`
  ].filter(Boolean).join('\n')
}

// Deterministic message when no LLM key is available.
function fallbackBody(s: ForecastSummary): string {
  const e = s.emissions
  const vs = e.vsWeek === 'below' ? 'below' : e.vsWeek === 'above' ? 'above' : 'close to'
  const clean = e.cleanestWindow ? `${e.cleanestWindow.start}-${e.cleanestWindow.end}` : 'the low-emission hours'
  const high = e.highestWindow ? `${e.highestWindow.start}-${e.highestWindow.end}` : 'the peak hours'
  return [
    `For the next 24 hours, carbon intensity averages about ${e.avg24h} ${e.unit}, ${vs} this week's average. `
    + `The cleanest hours look to be around ${clean}, while emissions are highest around ${high}. `
    + `Renewable electricity is about ${s.renewable.min}-${s.renewable.max}% of generation.`,
    '',
    `Looking at the trend, renewable generation is ${s.renewable.trend} over the next day, and the grid has been getting ${s.weekTrend} this week.`,
    '',
    'Recommended actions',
    `- Prefer the cleaner hours (around ${clean}) for flexible electricity use.`,
    `- If possible, avoid non-urgent use around ${high}.`,
    '- Keep essential use as normal and only shift what is easy and practical for you.'
  ].join('\n')
}

export async function generateForecastMessage(
  summary: ForecastSummary,
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1',
  model = 'gpt-4o-mini'
): Promise<{ subject: string, body: string }> {
  const subject = FORECAST_SUBJECT
  if (!apiKey) return { subject, body: fallbackBody(summary) }

  const prompt = renderPrompt('weekly-forecast-message', { facts: factsText(summary) })

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.6, max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    })

    if (!res.ok) return { subject, body: fallbackBody(summary) }
    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const content = (json.choices[0]?.message?.content ?? '').trim().replace(/^["']|["']$/g, '')
    return { subject, body: content || fallbackBody(summary) }
  } catch {
    return { subject, body: fallbackBody(summary) }
  }
}
