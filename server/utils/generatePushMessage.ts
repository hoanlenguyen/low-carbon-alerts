// Prompt 7 — Push Notification Message (prompts/07_push_notification_message.md).
// Turns a chosen low-carbon window + appliance into a short push line, adapted to
// the user's notification style: "detailed" (Data-rich, leads with the number) or
// "simple" (friendly, no numbers). LLM-written with a deterministic fallback.
import { renderPrompt } from './renderPrompt'

export interface PushMessageContext {
  name: string | null
  appliance: string
  windowStart: string // "HH:MM"
  windowEnd: string // "HH:MM"
  carbonIntensity: number | null // shown in the "detailed" style; omitted in "simple"
  urgency: 'low' | 'medium' | 'high'
  notifStyle: 'detailed' | 'simple'
}

const MAX_LEN = 200

function clamp(text: string): string {
  const t = text.trim().replace(/^["']|["']$/g, '')
  return t.length <= MAX_LEN ? t : `${t.slice(0, MAX_LEN - 1).trimEnd()}…`
}

function fallback(ctx: PushMessageContext): string {
  if (ctx.notifStyle === 'detailed') {
    const num = ctx.carbonIntensity != null ? `${Math.round(ctx.carbonIntensity)} gCO₂/kWh` : 'low-carbon'
    return clamp(`Cleanest window ${ctx.windowStart}–${ctx.windowEnd} at ${num}. Run your ${ctx.appliance.toLowerCase()} before ${ctx.windowEnd}.`)
  }
  const spark = ctx.urgency === 'high' ? 'Clean window now! ' : ''
  return clamp(`${spark}Run your ${ctx.appliance.toLowerCase()} between ${ctx.windowStart} and ${ctx.windowEnd} for a greener load.`)
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
    appliance: ctx.appliance,
    window_start: ctx.windowStart,
    window_end: ctx.windowEnd,
    carbon_intensity: ctx.carbonIntensity != null ? Math.round(ctx.carbonIntensity) : 'unknown',
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
