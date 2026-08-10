// Prompt 7 — Push Notification Message (prompts/07_push_notification_message.md).
// Turns a chosen low-carbon window + appliance into a short, human push line.
// LLM-written with a deterministic fallback; enforces the ≤100-char rule.
import { renderPrompt } from './renderPrompt'

export interface PushMessageContext {
  name: string | null
  appliance: string
  windowStart: string // "HH:MM"
  windowEnd: string // "HH:MM"
  carbonIntensity: number | null // context only — must NOT appear in the message
  urgency: 'low' | 'medium' | 'high'
}

const MAX_LEN = 100

function clamp(text: string): string {
  const t = text.trim().replace(/^["']|["']$/g, '')
  return t.length <= MAX_LEN ? t : `${t.slice(0, MAX_LEN - 1).trimEnd()}…`
}

function fallback(ctx: PushMessageContext): string {
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

  const prompt = renderPrompt('push-message', {
    name: ctx.name ?? 'unknown',
    appliance: ctx.appliance,
    window_start: ctx.windowStart,
    window_end: ctx.windowEnd,
    carbon_intensity: ctx.carbonIntensity ?? 'unknown',
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
        max_tokens: 60,
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
