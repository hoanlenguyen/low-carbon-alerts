# Prompt 5 — Core Recommendation

| | |
|---|---|
| **Sprint** | 3 — RAG Knowledge Base & LLM Pipeline |
| **Trigger** | User opens the app, has **7+ days of history** |
| **Output** | JSON recommendation array |
| **Purpose** | Generate the main personalized recommendation combining all data sources |

## Input variables

| Placeholder | Description |
|---|---|
| `{household_size}` | Number of people in the household |
| `{appliance_list}` | The user's appliances |
| `{active_start}` / `{active_end}` | Active hours window (HH:MM) |
| `{energy_goal}` | The user's stated goal |
| `{consumption_summary}` | Output of [Prompt 4](04_consumption_summarization.md) |
| `{sahkojalki_forecast}` | 24h forecast. Format: `[{ "timestamp": "HH:MM", "value": float (gCO2/kWh) }]` |
| `{rag_retrieved_chunks}` | Knowledge-base chunks from the RAG retrieval ([Prompt 3](03_rag_query_rewriting.md)) |

## Prompt

```
You are a personalized energy advisor for a residential
electricity management app in Finland.

## User Profile
- Household size: {household_size}
- Appliances: {appliance_list}
- Active hours: {active_start} to {active_end}
- Energy goal: {energy_goal}

## Consumption Pattern Summary
{consumption_summary}

## Carbon Intensity Forecast (next 24 hours)
{sahkojalki_forecast}
// Format: [{ "timestamp": "HH:MM", "value": float (gCO2/kWh) }]

## Relevant Energy-Saving Knowledge
{rag_retrieved_chunks}

## Rules
1. Base recommendations strictly on the data above
2. Reference a specific time window from the forecast
3. Mention a specific appliance from the user's profile
4. Do not invent carbon intensity values
5. Be concise, specific, and actionable
6. If forecast data is missing, return a generic
   but honest recommendation and set target_hour to null

Return JSON only, no preamble:
[
  {
    "recommendation": "string",
    "appliance": "string",
    "best_time": "HH:MM",
    "carbon_intensity": float,
    "renewable_pct": float,
    "reason": "string",
    "carbon_saving": "low | medium | high"
  }
]
```

## Output schema

An **array** of recommendation objects:

```json
[
  {
    "recommendation": "Charge your EV between 01:00 and 04:00 for the cleanest overnight window.",
    "appliance": "EV charger",
    "best_time": "01:00",
    "carbon_intensity": 12.8,
    "renewable_pct": 78.4,
    "reason": "Strong overnight wind; carbon intensity is ~60% below today's average.",
    "carbon_saving": "high"
  }
]
```

## Status in codebase

🟢 **Built.** [`generateRecommendation.ts`](../server/utils/generateRecommendation.ts) produces
the recommendation: it rewrites the query ([Prompt 3](03_rag_query_rewriting.md)), retrieves
knowledge-base chunks, and calls the LLM with the profile + live-forecast facts, storing the result in
the `recommendations` table and serving it via
[`/api/recommendation`](../server/api/recommendation.get.ts) (+
[`refresh`](../server/api/recommendation/refresh.post.ts)). Caveat: `{consumption_summary}` is not yet
wired — there is no metered consumption history (see [Prompt 4](04_consumption_summarization.md)) — so
the recommendation is currently grounded in the profile, the live forecast, and retrieved tips rather
than the user's own usage history.
