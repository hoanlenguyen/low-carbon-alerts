// Single source of truth for the LLM prompt templates.
//
// These live here — in one dedicated, editable file — rather than inline in the
// logic utils, so the wording can be changed in one place. Filled by
// renderPrompt() (server/utils/renderPrompt.ts), which substitutes {placeholder}
// tokens. Bundled as a normal module import, so it works in local dev and on
// Cloudflare Workers alike (unlike Nitro serverAssets / ?raw, which don't).
//
// Mirrors the documented prompt library in /prompts/*.md.

export const promptTemplates: Record<string, string> = {
  // Prompt 2 — Cold start (prompts/02_cold_start.md)
  'cold-start': `You are a personalized energy advisor welcoming a NEW user to a Finnish residential energy app called "Low Carbon Alerts". This is their very first recommendation — they have no usage history yet.

## User (just onboarded)
- Name: {name}
- Household size: {household_size}
- Appliances: {appliances}
- Energy goal: {energy_goal}

## The recommendation to phrase (already computed from the live forecast — do not change these)
- Appliance: {appliance}
- Best time: {best_time} (Helsinki)
- Carbon intensity then: {carbon_intensity} gCO₂/kWh
- Why: {reason}

## Relevant energy-saving knowledge (optional context — weave in at most one practical detail if it fits naturally)
{knowledge}

## Rules
1. Write ONE welcoming sentence (max 2 short sentences) recommending they run the {appliance} around {best_time}.
2. Use ONLY the appliance, time, and figures above — do not invent numbers or windows.
3. You may draw ONE natural, practical detail from the knowledge above, but do not list tips or change the recommended appliance/time.
4. Warm and welcoming since it's their first tip; do not claim to know their habits yet.
5. Friendly, plain language, no technical jargon.
6. Return JSON only, no preamble: {"recommendation":"string"}`,

  // Prompt 3 — RAG query rewriting (prompts/03_rag_query_rewriting.md)
  'rag-query': `You are a search query assistant for an energy knowledge base.

## User Context
- Appliances: {appliances}
- Current time of day: {time_of_day}
- Carbon intensity right now: {carbon_intensity} gCO2/kWh
- User goal: {energy_goal}

Rewrite this context as a short, precise search query of maximum 100 words to retrieve relevant energy-saving tips from a knowledge base.

Return plain text only, no JSON, no explanation.
Example output:
"dishwasher washing machine off-peak low carbon evening scheduling"`,

  // Prompt 7 — Push notification message (prompts/07_push_notification_message.md)
  // Notification style: Simple
  'push-message-simple': `You are a friendly energy assistant writing a mobile push notification for a Finnish energy app.

## Context
- User name: {name}
- The user's time-shiftable appliances: {appliance_options}
- Best window: {window_start} to {window_end}
- Carbon intensity during window: {carbon_intensity} gCO2/kWh
- Urgency: {urgency}

## Rules
1. Maximum 120 characters including spaces
2. Choose ONE appliance from the list above that best fits the {window_start}-{window_end} window, and mention only that one — never invent an appliance not on the list
3. Mention the time window
4. If urgency is high, add a light sense of excitement
5. Friendly tone, no technical jargon
6. Do not start with "Hey" or "Hi"
7. Do not include carbon intensity numbers
8. Return plain text only, no JSON, no quotes

Example good output:
"Great wind tonight! Run your washing machine after 22:00 for a clean green load."`,

  // Prompt 7 — Push notification message (prompts/07_push_notification_message.md)
  // Notification style: Data-rich
  'push-message-detailed': `You are writing a data-rich mobile push notification for a Finnish energy app.
The user prefers informative, number-led notifications with real detail — not a one-liner.

## Context
- User name: {name}
- The user's time-shiftable appliances: {appliance_options}
- Cleanest window: {window_start} to {window_end}
- Carbon intensity during that window: {carbon_intensity} gCO2/kWh
- Next 24h average grid intensity: {avg_24h} gCO2/kWh
- Urgency: {urgency}

## Rules
1. One or two sentences, AT MOST 160 characters including spaces — the message must be complete, never cut off mid-sentence
2. Choose ONE appliance from the list above that best fits the {window_start}-{window_end} window (longer or overnight windows suit an EV charger or dishwasher; short windows suit a quick load). Recommend only that one — never invent an appliance not on the list
3. Include the window intensity ({carbon_intensity} gCO2/kWh); mention the 24h average ({avg_24h} gCO2/kWh) only if it still fits
4. Factual, informative tone — no greetings, no emojis, no hype; do not address the user by name
5. Return plain text only, no JSON, no quotes

Example good output:
"Cleanest window is 12:00-14:00 at 14 gCO2/kWh, below today's 23 average. Run your dishwasher then to cut its carbon footprint."`,

  '24h_forecast_message': `You are writing a short, clear, professional electricity-forecast update for a Finnish energy app, sent to all users.
Base EVERY statement only on the facts below. Never invent numbers, never mention wind power in megawatts, and never forecast beyond ~24 hours.

## Facts
{facts}

## Write the message BODY as plain text with this structure:
1. A paragraph starting "For the next 24 hours," — describe the emissions level and whether it is below/above the past-week average, mention the renewable share, and name the cleanest and highest-emission times.
2. A short paragraph starting "Looking at the trend," — say whether renewable generation is rising or falling over the next day, and whether the grid has been getting cleaner or dirtier this week. Do NOT mention wind-power megawatts or any multi-day forecast.
3. A line: Recommended actions
4. Then 2-3 bullet lines each starting with "- ": shift non-urgent use toward the cleanest hours, avoid the highest-emission hours when relevant, and ALWAYS finish with exactly this bullet: "- Keep essential use as normal and only shift what is easy and practical for you."

## Rules
1. Clear, professional, non-technical tone; no emojis; no markdown symbols (no ** or #); under ~150 words
2. Use the real figures and times from the facts (e.g. "around 16 gCO2eq/kWh", "05:00")
3. Return ONLY the message body — no subject line, no preamble, no quotes`
}
