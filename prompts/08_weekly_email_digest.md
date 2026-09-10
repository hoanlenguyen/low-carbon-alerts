# Prompt 8 — Weekly Email Digest

| | |
|---|---|
| **Sprint** | 5 — Notification Delivery Layer |
| **Trigger** | Every Monday morning via cron job |
| **Output** | JSON email content |
| **Purpose** | Summarize the user's week and maintain long-term engagement |

## Input variables

| Placeholder | Description |
|---|---|
| `{name}` | The user's name |
| `{notifications_sent}` | Count of notifications sent in the last 7 days |
| `{actions_taken}` | Count of recommendations the user acted on |
| `{co2_saved}` | Total CO₂ avoided this week, grams |
| `{best_action}` | Description of the single best action |
| `{appliance}` | Appliance shifted in the best action |
| `{high_carbon_time}` / `{low_carbon_time}` | The shift (from → to) |
| `{saved}` | CO₂ saved by the best action, grams |
| `{next_week_forecast_summary}` | Forecast trend summary for next week |

## Prompt

```
You are an energy coach writing a weekly summary
email for a residential energy app user.

## User Name
{name}

## This Week's Activity (last 7 days)
- Notifications sent: {notifications_sent}
- Actions taken: {actions_taken}
- Total CO2 avoided: {co2_saved}g
- Best action: {best_action}
  (shifted {appliance} from {high_carbon_time}
  to {low_carbon_time}, saved {saved}g CO2)

## Forecast Trend for Next Week
{next_week_forecast_summary}

## Rules
1. Keep a warm, encouraging tone
2. Make the CO2 saving feel meaningful and concrete
   (e.g. equivalent to X minutes of car driving)
3. Give one specific tip for next week based on
   forecast trend
4. Keep total length under 150 words
5. Do not use technical jargon

Return JSON only, no preamble:
{
  "subject": "string",
  "heading": "string",
  "summary_text": "string",
  "highlight_action": "string",
  "tip_for_next_week": "string",
  "co2_context": "string"
}
```

## Output schema

```json
{
  "subject": "Your green week: 340g CO₂ saved 🌱",
  "heading": "Nice work this week, Aino!",
  "summary_text": "You acted on 3 of 5 alerts and avoided 340g of CO₂ — great momentum.",
  "highlight_action": "Shifting your dishwasher from 18:00 to 02:00 saved 120g CO₂ on its own.",
  "tip_for_next_week": "Midweek looks windy — aim laundry for Wednesday night.",
  "co2_context": "That's about 3 minutes of average car driving avoided."
}
```

## Status in codebase

🟡 **Partial — the email channel now exists, the weekly digest does not.** Transactional email is
built on the Gmail API ([`sendEmail.ts`](../server/utils/sendEmail.ts) +
[`getGmailAccessToken.ts`](../server/utils/getGmailAccessToken.ts)) and is already used for the daily
forecast ([Prompt 10](10_24h_forecast_message.md)). No **weekly** digest job or content generator is
built yet. It also depends on action tracking (`actions_taken`, `co2_saved`) — now partly available
via the self-reported Appliance Schedule (`appliance_shifts`), though not a metered/feedback loop.
Real-time carbon alerts stay on push (FCM) by design.
