# Prompt 10 — 24h Forecast Message (general)

| | |
|---|---|
| **Trigger** | External automation (n8n) every few days, or admin "Generate forecast message" button |
| **Audience** | All consumers (general broadcast — not personalised) |
| **Output** | Plain-text message body (Sähköjälki-style) |
| **Purpose** | A friendly electricity-forecast update + simple actions, from live grid data |

## Subject (fixed)

```
electricity forecast and simple actions for the next few days
```

## Data

Built deterministically by [`buildForecastSummary()`](../server/utils/buildForecastSummary.ts) from the
three Sähköjälki series (`consumption_emissions`, `renew_production_share`, `domestic_production_share`)
fetched from flipapi with `history_len=1W`. Honours the ~24h forecast horizon — **no multi-day forecasts
and no wind-power megawatts** (flipapi provides neither). Facts include: next-24h emissions average / min /
max (with times) and how they compare to the past-week average; the cleanest and highest-emission
3-hour windows; renewable-share range + trend; domestic-share average; and the week's cleaner/dirtier trend.

## Prompt

Template `24h_forecast_message` in [`server/prompts/templates.ts`](../server/prompts/templates.ts).
The LLM writes the body only (subject is fixed) from a `{facts}` block, in this structure:

```
For the next 24 hours, … [emissions level vs weekly average, renewable share, cleanest/highest times]
Looking at the trend, … [renewable rising/falling next day; grid cleaner/dirtier this week]

Recommended actions
- [shift non-urgent use to the cleanest hours]
- [avoid the highest-emission hours, when relevant]
- Keep essential use as normal and only shift what is easy and practical for you.
```

Rules: warm, plain, non-technical; numbers only from the facts; plain text (no markdown); < ~150 words.
Deterministic fallback in [`generateForecastMessage.ts`](../server/utils/generateForecastMessage.ts)
covers the no-LLM-key case.

## Delivery

- **Preview**: `POST /api/admin/notifications/forecast-message` (admin) → `{ subject, body }`. Powers the
  **"Generate forecast message"** button on the admin Notifications page (preview + "Use in Send").
- **Broadcast**: `POST /api/automation/forecast-broadcast` — bearer-secret (`NUXT_AUTOMATION_SECRET`),
  generates + broadcasts to all consumers as an in-app notification (`messages.type = 'forecast'`).
  Idempotent within 48h. Intended for n8n. **Email delivery is a later addition.**

## Status

🟢 **Built (in-app).** Email channel pending.
