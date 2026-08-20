// Prompt 7 — Push Notification Message (prompts/07_push_notification_message.md).
// Turns a chosen low-carbon window + appliance into a short push line, adapted to
// the user's notification style: "detailed" (Data-rich, leads with the number) or
// "simple" (friendly, no numbers). LLM-written with a deterministic fallback.
import { renderPrompt } from './renderPrompt'

export interface PushMessageContext {
  name: string | null
  appliances: string[] // the user's shiftable appliances — the LLM picks the best fit for the window
  windowStart: string // "HH:MM"
  windowEnd: string // "HH:MM"
  carbonIntensity: number | null // the clean window's intensity — context for the model
  avg24h: number | null // next-24h average, shown as "Next 24h avg: N" in the "detailed" style
  urgency: 'low' | 'medium' | 'high'
  notifStyle: 'detailed' | 'simple'
}

const MAX_LEN = 200

function clamp(text: string): string {
  const t = text.trim().replace(/^["']|["']$/g, '')
  if (t.length <= MAX_LEN) return t
  const head = t.slice(0, MAX_LEN)
  // Prefer ending at the last complete sentence within the limit (no ellipsis)…
  const period = head.lastIndexOf('. ')
  if (period >= MAX_LEN * 0.6) return head.slice(0, period + 1)
  // …otherwise trim to a word boundary and mark the cut.
  const space = head.lastIndexOf(' ')
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`
}

function fallback(ctx: PushMessageContext): string {
  // Deterministic pick for the no-LLM path: the most shiftable appliance they own.
  const appliance = (ctx.appliances[0] ?? 'a high-energy appliance').toLowerCase()
  if (ctx.notifStyle === 'detailed') {
    const level = ctx.carbonIntensity != null ? `${Math.round(ctx.carbonIntensity)} gCO₂/kWh` : 'a low-carbon level'
    const vsAvg = ctx.avg24h != null ? `, below the ${Math.round(ctx.avg24h)} gCO₂/kWh daily average` : ''
    return clamp(`The cleanest window ahead is ${ctx.windowStart}–${ctx.windowEnd} at ${level}${vsAvg}. Run your ${appliance} then to cut its carbon footprint.`)
  }
  const spark = ctx.urgency === 'high' ? 'Clean window now! ' : ''
  return clamp(`${spark}Run your ${appliance} between ${ctx.windowStart} and ${ctx.windowEnd} for a greener load.`)
}

export async function generatePushMessage(
  ctx: PushMessageContext,
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1',
  model = 'gpt-4o-mini'
): Promise<string> {
  if (!apiKey) return fallback(ctx)

  const templateName = ctx.notifStyle === 'detailed' ? 'push-message-detailed' : 'push-message-simple'
  const prompt = renderPrompt(templateName, {
    name: ctx.name ?? 'unknown',
    appliance_options: ctx.appliances.length ? ctx.appliances.join(', ') : 'a high-energy appliance',
    window_start: ctx.windowStart,
    window_end: ctx.windowEnd,
    carbon_intensity: ctx.carbonIntensity != null ? Math.round(ctx.carbonIntensity) : 'unknown',
    avg_24h: ctx.avg24h != null ? Math.round(ctx.avg24h) : 'unknown',
    urgency: ctx.urgency
  })

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!res.ok) return fallback(ctx)

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const content = json.choices[0]?.message?.content ?? ''
    return content.trim() ? clamp(content) : fallback(ctx)
  } catch {
    return fallback(ctx)
  }
}
