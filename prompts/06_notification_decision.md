# Prompt 6 — Notification Decision

| | |
|---|---|
| **Sprint** | 4 — Notification Decision Layer |
| **Trigger** | Every cron run (**every 3 hours**), per eligible user |
| **Output** | JSON decision object |
| **Purpose** | Decide whether to notify, preventing alert fatigue |

## Input variables

| Placeholder | Description |
|---|---|
| `{current_time}` | Current time, Europe/Helsinki |
| `{sahkojalki_forecast}` | 24h forecast. Format: `[{ "timestamp": "HH:MM", "value": float (gCO2/kWh) }]` |
| `{active_start}` / `{active_end}` | Active hours window (HH:MM) |
| `{appliance_list}` | The user's appliances |
| `{energy_goal}` | The user's stated goal |
| `{last_sent_at}` | Timestamp of the last notification sent to this user |
| `{min_interval_h}` | Minimum hours required between notifications |

## Prompt

```
You are an energy alert decision engine.

## Current Time
{current_time} (Europe/Helsinki)

## Carbon Intensity Forecast (next 24 hours)
{sahkojalki_forecast}
// Format: [{ "timestamp": "HH:MM", "value": float (gCO2/kWh) }]

## User Profile
- Active hours: {active_start} to {active_end}
- Appliances: {appliance_list}
- Energy goal: {energy_goal}

## Notification History
- Last notification sent: {last_sent_at}
- Minimum interval between notifications: {min_interval_h} hours

## Rules
1. Only recommend sending if a low-carbon window exists
   (below 80 gCO2/kWh) within the user's active hours
   in the next 6 hours
2. Do not send if last notification was sent less than
   {min_interval_h} hours ago
3. Prioritize the window with the lowest carbon intensity
4. Match the recommended appliance to a realistic task
   for that time of day
5. If no suitable window exists, set should_notify to false

Return JSON only, no preamble:
{
  "should_notify": true | false,
  "reason": "string",
  "best_window_start": "HH:MM or null",
  "best_window_end": "HH:MM or null",
  "carbon_intensity": float or null,
  "recommended_appliance": "string or null",
  "urgency": "low | medium | high"
}
```

## Output schema

```json
{
  "should_notify": true,
  "reason": "A 21:00–23:00 window drops to 34 gCO2/kWh, well inside active hours and below 80.",
  "best_window_start": "21:00",
  "best_window_end": "23:00",
  "carbon_intensity": 34.0,
  "recommended_appliance": "washing machine",
  "urgency": "medium"
}
```

## Status in codebase

🟡 **Partial.** The hourly smart-alert pipeline
[`runSmartAlert.ts`](../server/utils/runSmartAlert.ts) (triggered by
[`server/routes/_cron.ts`](../server/routes/_cron.ts)) already decides whether to alert, but it differs
from this spec:

- The decision is **deterministic** (clean-window detection + per-user debounce), not an LLM decision.
- It now runs **per eligible user**, finding the cleanest window inside that user's own active hours
  (no longer a single broadcast) and suggesting an appliance from the admin catalog ranking.
- Thresholds and debounce come from the `smart_alert_settings` singleton.

Its "should notify" result feeds [Prompt 7 — Push Message](07_push_notification_message.md).
