interface GridContext {
  current: number
  avg24h: number
  consecutiveLowHours: number
  forecastStartHelsinkiTime: string
}

interface AlertMessage {
  subject: string
  body: string
}

export async function generateAlertMessage(ctx: GridContext, apiKey: string): Promise<AlertMessage> {
  const prompt = `You are writing a short push notification for a Finnish electricity grid carbon alert app called "Low Carbon Alerts".

Grid context right now (Helsinki time):
- Current carbon intensity: ${ctx.current} gCO₂/kWh
- 24-hour average: ${ctx.avg24h.toFixed(1)} gCO₂/kWh
- Consecutive low-carbon hours ahead (below 20 gCO₂/kWh): ${ctx.consecutiveLowHours}
- Current time in Helsinki: ${ctx.forecastStartHelsinkiTime}

Write a push notification with:
- "subject": a punchy title, max 8 words, no emoji
- "body": 1–2 sentences encouraging the user to run high-energy appliances now (e.g. EV charging, dishwasher, laundry, water heater). Mention the window duration if it's 2+ hours. Keep it friendly and practical.

Respond with a JSON object only, no markdown, no explanation. Example format:
{"subject":"Clean energy window open now","body":"Carbon intensity is at ${ctx.current} gCO₂/kWh — well below average. A great time to run your dishwasher or charge your EV."}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status}`)
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = json.choices[0]?.message?.content?.trim() ?? ''

  try {
    return JSON.parse(content) as AlertMessage
  } catch {
    // Fallback if JSON parsing fails
    return {
      subject: 'Low carbon window now',
      body: `Carbon intensity is at ${ctx.current} gCO₂/kWh — a great time to run high-energy appliances.`
    }
  }
}
